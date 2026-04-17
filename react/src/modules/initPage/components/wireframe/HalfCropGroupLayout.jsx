import { StoreTitle, SloganText } from '../draft/DraftShared';
import { useDecorOverlays } from './utils';
import { useImageAR } from './useImageAR';
import { getFallbackStyle, getWireframeSlots, centerSlotsVertically } from './computeSlotStyle';
import { MAIN_ZONE_4x5, computeMainZone916, computeMainZoneFromZones, computeMainZoneDynamic } from './outerFrameZones';
import { ratioToCanvasAR } from '../../../editing/utils/ratio';

/**
 * Type 4 전용 인라인 스타일 계산 — productZone에 맞는 동적 hwRatio 사용
 *
 * WireframeChoiceCard의 productZone이 고정 MAIN_ZONE_4x5(0.85)와 다를 수 있어
 * main preview(wireframeLayout.ts)의 참조 공식과 일치시킨다.
 *   hwRatio = productZone.h * ratioToCanvasAR(ratio) / 100
 *
 * 공유 computeSlotStyle.js의 하드코딩 CANVAS_HW_RATIO(0.85)는 건드리지 않는다.
 */
const computeSlotStyleDynamic = (slotMeta, imageNaturals, side, hwRatio) => {
  const { naturalWidth: iw, naturalHeight: ih } = imageNaturals;
  if (!iw || !ih) return getFallbackStyle(slotMeta, side);

  const { Cx, Cy, sh } = slotMeta;
  const AR = sh / ih;

  if (side === 'single') {
    const wScaled = iw * AR * hwRatio;
    return {
      containerStyle: {
        left: (Cx - wScaled / 2) + '%',
        top: (Cy - sh / 2) + '%',
        width: wScaled + '%',
        height: sh + '%',
      },
      imgStyle: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center center',
        display: 'block',
      },
    };
  }

  const W_scaled = iw * AR * hwRatio;
  const w_final = W_scaled / 2;

  return {
    containerStyle: {
      left: (side === 'left' ? Cx - w_final : Cx) + '%',
      top: (Cy - sh / 2) + '%',
      width: w_final + '%',
      height: sh + '%',
    },
    imgStyle: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: side === 'left' ? 'left center' : 'right center',
      display: 'block',
    },
  };
};

/**
 * HalfCropSlot — 개별 반쪽 크롭 또는 단독 제품 슬롯
 * 각 인스턴스는 독립적인 absolute positioned DOM 요소
 * 라벨은 overflow:hidden 외부에 렌더링 (잘리지 않음)
 */
const HalfCropSlot = ({ product, slotMeta, side, isSquare, hwRatio }) => {
  const dims = useImageAR(product?.image);
  const { containerStyle, imgStyle } = dims
    ? computeSlotStyleDynamic(slotMeta, dims, side, hwRatio)
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
        <p className={`${isSquare ? 'text-[6px]' : 'text-[9px]'} text-black/80 font-bold truncate text-center mt-0.5`}>
          {product.name}
        </p>
      )}
      {product?.price && product?.showPrice && (
        <p className={`${isSquare ? 'text-[5px]' : 'text-[8px]'} text-black/80 font-bold text-center`}>
          {Number(product.price).toLocaleString()} {product.currency ?? '원'}
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
export const HalfCropGroupLayout = ({ products, options, inputData, ratioStyles, zonePositions, textStyles }) => {
  const { isSquare, isTall, containerPadding } = ratioStyles;
  const showOverlays = useDecorOverlays(options.bgType);
  const p = products.filter(prod => prod.image).slice(0, 6);
  const count = p.length;

  const hasSlogan = Boolean(inputData.mainSlogan);
  const wireframe = count > 0 ? getWireframeSlots(4, count, hasSlogan) : null;
  if (!wireframe && count > 0 && import.meta.env.DEV) {
    console.warn('[Type4] Missing wireframe key:', count, hasSlogan);
  }
  const slots = centerSlotsVertically(wireframe?.slots || []);
  const mapped = mapSlotsToProducts(slots, p);

  const productZone = zonePositions
    ? computeMainZoneDynamic(zonePositions)
    : (isTall ? computeMainZone916() : MAIN_ZONE_4x5);

  // main preview(wireframeLayout.ts)와 동일한 공식으로 Type 4 폭을 계산.
  // productZone이 고정 MAIN_ZONE_HW_RATIO(0.85)와 다를 수 있어 매 렌더 재계산.
  const hwRatio = productZone.h * ratioToCanvasAR(options.ratio) / 100;

  return (
    <div className={`w-full h-full relative ${showOverlays ? 'bg-white/5' : ''}`}>
      {/* store (로고) */}
      {zonePositions ? (
        <div style={{
          position: 'absolute',
          left: zonePositions.store.x + '%',
          top: zonePositions.store.y + '%',
          width: zonePositions.store.width + '%',
          textAlign: zonePositions.store.align || 'center',
          transform: zonePositions.store.rotation ? `rotate(${zonePositions.store.rotation}deg)` : undefined,
          zIndex: zonePositions.store.zIndex || 30,
        }}>
          {textStyles ? (
            <div style={{
              fontSize: textStyles.store.fontSize + 'px',
              fontWeight: textStyles.store.fontWeight,
              fontFamily: textStyles.store.fontFamily,
              lineHeight: textStyles.store.lineHeight,
              color: textStyles.store.color,
            }}>
              {inputData.storeName || '가게 이름을 입력하세요'}
            </div>
          ) : (
            <StoreTitle
              storeName={inputData.storeName}
              brandColor={options.brandColor}
              className={isSquare ? 'text-xl' : 'text-3xl'}
            />
          )}
        </div>
      ) : (
        <div className={`relative z-30 ${containerPadding}`}>
          <StoreTitle
            storeName={inputData.storeName}
            brandColor={options.brandColor}
            className={isSquare ? 'text-xl' : 'text-3xl'}
          />
        </div>
      )}

      {/* slogan (슬로건) */}
      {zonePositions ? (
        <div style={{
          position: 'absolute',
          left: zonePositions.slogan.x + '%',
          top: zonePositions.slogan.y + '%',
          width: zonePositions.slogan.width + '%',
          textAlign: zonePositions.slogan.align || 'center',
          transform: zonePositions.slogan.rotation ? `rotate(${zonePositions.slogan.rotation}deg)` : undefined,
          zIndex: zonePositions.slogan.zIndex || 30,
        }}>
          {textStyles && inputData.mainSlogan ? (
            <div style={{
              fontSize: textStyles.slogan.fontSize + 'px',
              fontWeight: textStyles.slogan.fontWeight,
              fontFamily: textStyles.slogan.fontFamily,
              lineHeight: textStyles.slogan.lineHeight,
              color: textStyles.slogan.color,
              opacity: 0.6,
            }}>
              {inputData.mainSlogan}
            </div>
          ) : (
            <SloganText slogan={inputData.mainSlogan} className={`${isSquare ? 'text-[8px]' : 'text-xs'} opacity-60`} />
          )}
        </div>
      ) : (
        <div className={`absolute bottom-0 w-full text-center z-30 ${containerPadding} py-2`}>
          <SloganText slogan={inputData.mainSlogan} className={`${isSquare ? 'text-[8px]' : 'text-xs'} opacity-60`} />
        </div>
      )}

      {/* 제품 캔버스: store/slogan 아래 영역 */}
      <div style={{
        position: 'absolute',
        left: productZone.x + '%', top: productZone.y + '%',
        width: productZone.w + '%', height: productZone.h + '%',
      }}>
        {mapped.map(({ product, slotMeta, side }, idx) => (
          <HalfCropSlot
            key={product.id || idx}
            product={product}
            slotMeta={slotMeta}
            side={side}
            isSquare={isSquare}
            hwRatio={hwRatio}
          />
        ))}
      </div>
    </div>
  );
};
