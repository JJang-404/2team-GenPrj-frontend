import { StoreTitle, SloganText } from '../draft/DraftShared';
import { useDecorOverlays } from './utils';
import { useImageAR } from './useImageAR';
import { computeSlotStyle, getFallbackStyle, getWireframeSlots } from './computeSlotStyle';

/**
 * HalfCropSlot — 개별 반쪽 크롭 또는 단독 제품 슬롯
 * 각 인스턴스는 독립적인 absolute positioned DOM 요소
 * 라벨은 overflow:hidden 외부에 렌더링 (잘리지 않음)
 */
const HalfCropSlot = ({ product, slotMeta, side, isSquare }) => {
  const dims = useImageAR(product?.image);
  const { containerStyle, imgStyle } = dims
    ? computeSlotStyle(slotMeta, dims, side)
    : getFallbackStyle(slotMeta, side);

  return (
    <div style={{ position: 'absolute', ...containerStyle }}>
      {/* 이미지 컨테이너: overflow 클리핑 */}
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        {product?.image ? (
          <img src={product.image} alt={product.name || ''} style={imgStyle} className="drop-shadow-lg" />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className={`${isSquare ? 'w-6 h-6' : 'w-10 h-10'} border-2 border-dashed border-white/30 rounded-lg`} />
          </div>
        )}
      </div>
      {/* 라벨: overflow:hidden 바깥 — 잘리지 않음 */}
      {product?.name && product?.showName && (
        <p className={`${isSquare ? 'text-[6px]' : 'text-[9px]'} text-white/80 font-bold truncate text-center mt-0.5`}>
          {product.name}
        </p>
      )}
      {product?.price && product?.showPrice && (
        <p className={`${isSquare ? 'text-[5px]' : 'text-[8px]'} text-yellow-400/80 font-bold text-center`}>
          {Number(product.price).toLocaleString()}{product.currency ?? '원'}
        </p>
      )}
    </div>
  );
};

/**
 * 슬롯-제품 매핑 (인덱스 기반, 페어 중앙선 계산)
 *
 * 규칙: 제품은 순서대로 소비. 짝수 개면 모두 pair, 홀수 개면 마지막이 single.
 * pair 내에서 짝수 인덱스 = left, 홀수 인덱스 = right.
 *
 * 설계 가이드 수식의 Cx는 페어의 중앙선 (두 반쪽이 만나는 지점).
 * wireframeSlots.json의 Cx는 개별 슬롯의 중심점.
 * → 페어 중앙선 = leftSlot.Cx + leftSlot.sw / 2
 */
const mapSlotsToProducts = (slots, products) => {
  const count = products.length;
  const isOdd = count % 2 !== 0;
  const result = [];

  for (let i = 0; i < count && i < slots.length; i++) {
    const isLastAndOdd = isOdd && i === count - 1;
    if (isLastAndOdd) {
      result.push({ product: products[i], slotMeta: slots[i], side: 'single' });
    } else if (i % 2 === 0) {
      // 페어의 left: 중앙선 = 좌측 슬롯의 오른쪽 끝 = Cx + sw/2
      const pairCx = slots[i].Cx + slots[i].sw / 2;
      const pairMeta = { ...slots[i], Cx: pairCx };
      result.push({ product: products[i], slotMeta: pairMeta, side: 'left' });
    } else {
      // 페어의 right: 중앙선 = 우측 슬롯의 왼쪽 끝 = Cx - sw/2
      const pairCx = slots[i].Cx - slots[i].sw / 2;
      const pairMeta = { ...slots[i], Cx: pairCx };
      result.push({ product: products[i], slotMeta: pairMeta, side: 'right' });
    }
  }
  return result;
};

/**
 * Type 4 — 이머시브 (반쪽 크롭, 수평/역삼각형)
 *
 * wireframeSlots.json의 Cx/Cy 좌표는 전체 캔버스 대비 %.
 * 좌표가 직접 매핑되도록 제품 캔버스는 absolute inset-0.
 * 헤더/슬로건은 z-index 오버레이.
 */
export const HalfCropGroupLayout = ({ products, options, inputData, ratioStyles }) => {
  const { isSquare, containerPadding } = ratioStyles;
  const showOverlays = useDecorOverlays(options.bgType);
  const p = products.filter(prod => prod.image).slice(0, 6);
  const count = p.length;

  const hasSlogan = Boolean(inputData.mainSlogan);
  const wireframe = count > 0 ? getWireframeSlots(4, count, hasSlogan) : null;
  if (!wireframe && count > 0 && import.meta.env.DEV) {
    console.warn('[Type4] Missing wireframe key:', count, hasSlogan);
  }
  const slots = wireframe?.slots || [];
  const mapped = mapSlotsToProducts(slots, p);

  return (
    <div className={`w-full h-full relative ${showOverlays ? 'bg-white/5' : ''}`}>
      {/* 제품 캔버스: 전체 영역, wireframe 좌표 직접 매핑 */}
      <div className="absolute inset-0">
        {mapped.map(({ product, slotMeta, side }, idx) => (
          <HalfCropSlot
            key={product.id || idx}
            product={product}
            slotMeta={slotMeta}
            side={side}
            isSquare={isSquare}
          />
        ))}
      </div>

      {/* 헤더 오버레이 */}
      <div className={`relative z-30 ${containerPadding}`}>
        <StoreTitle
          storeName={inputData.storeName}
          brandColor={options.brandColor}
          className={isSquare ? 'text-xl' : 'text-3xl'}
        />
      </div>

      {/* 하단 슬로건 오버레이 */}
      <div className={`absolute bottom-0 w-full text-center z-30 ${containerPadding} py-2`}>
        <SloganText slogan={inputData.mainSlogan} className={`${isSquare ? 'text-[8px]' : 'text-xs'} opacity-60`} />
      </div>
    </div>
  );
};
