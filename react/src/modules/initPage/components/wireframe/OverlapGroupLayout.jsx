import { StoreTitle, SloganText } from '../draft/DraftShared';
import { useDecorOverlays } from './utils';
import { useImageAR } from './useImageAR';
import { computeType3Style, getWireframeSlots } from './computeSlotStyle';
import { MAIN_ZONE_4x5, computeMainZone916, computeMainZoneFromZones } from './outerFrameZones';

const OVERLAP_RATIO = 0.2;

const imgStyle = {
  width: '100%', height: '100%',
  objectFit: 'contain', objectPosition: 'center center',
  display: 'block',
};

/**
 * 슬롯 내부 렌더링 (이미지 + 라벨)
 */
const SlotContent = ({ product, left, top, wScaled, hScaled, zIndex, isSquare }) => (
  <div style={{
    position: 'absolute',
    left: left + '%', top: top + '%',
    width: wScaled + '%', height: hScaled + '%',
    zIndex,
  }}>
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {product?.image ? (
        <img src={product.image} alt={product.name || ''} style={imgStyle} className="drop-shadow-lg" />
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className={`${isSquare ? 'w-6 h-6' : 'w-10 h-10'} border-2 border-dashed border-white/30 rounded-lg`} />
        </div>
      )}
    </div>
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

/**
 * OverlapSingleSlot — 단독 슬롯 (cover 스케일링, 중앙 배치)
 */
const OverlapSingleSlot = ({ product, slotMeta, isSquare }) => {
  const dims = useImageAR(product?.image);
  const { wScaled, hScaled } = dims
    ? computeType3Style(slotMeta, dims)
    : { wScaled: slotMeta.sw, hScaled: slotMeta.sh };

  return (
    <SlotContent
      product={product}
      left={slotMeta.Cx - wScaled / 2}
      top={slotMeta.Cy - hScaled / 2}
      wScaled={wScaled}
      hScaled={hScaled}
      isSquare={isSquare}
    />
  );
};

/**
 * OverlapPair — 겹침 페어 (설계 가이드 Section 3.2)
 *
 * Ow = (w1 + w2) × 0.1
 * 좌측: dx = pairCx + Ow/2 - w1
 * 우측: dx = pairCx - Ow/2 (z-index 높음, 앞으로)
 */
const OverlapPair = ({ leftProduct, rightProduct, leftSlotMeta, rightSlotMeta, isSquare }) => {
  const leftDims = useImageAR(leftProduct?.image);
  const rightDims = useImageAR(rightProduct?.image);

  const leftSize = leftDims
    ? computeType3Style(leftSlotMeta, leftDims)
    : { wScaled: leftSlotMeta.sw, hScaled: leftSlotMeta.sh };
  const rightSize = rightDims
    ? computeType3Style(rightSlotMeta, rightDims)
    : { wScaled: rightSlotMeta.sw, hScaled: rightSlotMeta.sh };

  // 페어 중앙선 = 두 슬롯 Cx의 중점
  const pairCx = (leftSlotMeta.Cx + rightSlotMeta.Cx) / 2;

  // 겹침 너비
  const Ow = (leftSize.wScaled + rightSize.wScaled) * OVERLAP_RATIO;

  return (
    <>
      <SlotContent
        product={leftProduct}
        left={pairCx + Ow / 2 - leftSize.wScaled}
        top={leftSlotMeta.Cy - leftSize.hScaled / 2}
        wScaled={leftSize.wScaled}
        hScaled={leftSize.hScaled}
        zIndex={1}
        isSquare={isSquare}
      />
      <SlotContent
        product={rightProduct}
        left={pairCx - Ow / 2}
        top={rightSlotMeta.Cy - rightSize.hScaled / 2}
        wScaled={rightSize.wScaled}
        hScaled={rightSize.hScaled}
        zIndex={2}
        isSquare={isSquare}
      />
    </>
  );
};

/**
 * 슬롯-제품 그룹화 (페어/단독)
 * 짝수 개: 모두 pair, 홀수 개: 마지막이 single
 */
const groupSlots = (slots, products) => {
  const count = products.length;
  const isOdd = count % 2 !== 0;
  const groups = [];

  for (let i = 0; i < count && i < slots.length;) {
    if (isOdd && i === count - 1) {
      groups.push({ type: 'single', product: products[i], slotMeta: slots[i] });
      i++;
    } else {
      groups.push({
        type: 'pair',
        leftProduct: products[i],
        rightProduct: products[i + 1],
        leftSlotMeta: slots[i],
        rightSlotMeta: slots[i + 1],
      });
      i += 2;
    }
  }
  return groups;
};

/**
 * Type 3 — 겹침 배치 (Overlapping, 지그재그/역삼각형)
 *
 * wireframeSlots.json의 Cx/Cy 좌표는 전체 캔버스 대비 %.
 * 설계 가이드 Section 3.2: cover 스케일링 + 10% 겹침 + 우측 앞배치.
 */
export const OverlapGroupLayout = ({ products, options, inputData, ratioStyles, zonePositions, textStyles }) => {
  const { isSquare, isTall, containerPadding } = ratioStyles;
  const defaultMainZone = isTall ? computeMainZone916() : MAIN_ZONE_4x5;
  const mainZone = (!isTall && zonePositions)
    ? computeMainZoneFromZones(zonePositions.store.y, zonePositions.slogan.y)
    : defaultMainZone;
  const showOverlays = useDecorOverlays(options.bgType);
  const p = products.filter(prod => prod.image).slice(0, 6);
  const count = p.length;

  const hasSlogan = Boolean(inputData.mainSlogan);
  const wireframe = count > 0 ? getWireframeSlots(3, count, hasSlogan) : null;
  if (!wireframe && count > 0 && import.meta.env.DEV) {
    console.warn('[Type3] Missing wireframe key:', count, hasSlogan);
  }
  const slots = wireframe?.slots || [];
  const groups = groupSlots(slots, p);

  return (
    <div className={`w-full h-full relative ${showOverlays ? 'bg-black/5' : ''}`}>
      {/* 제품 캔버스: main zone 영역 */}
      <div style={{
        position: 'absolute',
        left: mainZone.x + '%', top: mainZone.y + '%',
        width: mainZone.w + '%', height: mainZone.h + '%',
      }}>
        {groups.map((group, idx) =>
          group.type === 'pair' ? (
            <OverlapPair
              key={idx}
              leftProduct={group.leftProduct}
              rightProduct={group.rightProduct}
              leftSlotMeta={group.leftSlotMeta}
              rightSlotMeta={group.rightSlotMeta}
              isSquare={isSquare}
            />
          ) : (
            <OverlapSingleSlot
              key={group.product.id || idx}
              product={group.product}
              slotMeta={group.slotMeta}
              isSquare={isSquare}
            />
          )
        )}
      </div>

      {/* 헤더 오버레이 */}
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

      {/* 하단 슬로건 오버레이 */}
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
    </div>
  );
};
