import { StoreTitle, SloganText } from '../draft/DraftShared';
import { useDecorOverlays } from './utils';
import { useImageAR } from './useImageAR';
import { computeType3Style, getWireframeSlots } from './computeSlotStyle';
import { MAIN_ZONE_4x5, computeMainZone916 } from './outerFrameZones';

const imgStyle = {
  width: '100%', height: '100%',
  objectFit: 'contain', objectPosition: 'center center',
  display: 'block',
};

/**
 * IndividualSlot — 개별 제품 슬롯 (높이 고정, 너비 동적)
 */
const IndividualSlot = ({ product, slotMeta, isSquare }) => {
  const dims = useImageAR(product?.image);
  const { wScaled, hScaled } = dims
    ? computeType3Style(slotMeta, dims)
    : { wScaled: slotMeta.sw, hScaled: slotMeta.sh };

  return (
    <div style={{
      position: 'absolute',
      left: (slotMeta.Cx - wScaled / 2) + '%',
      top: (slotMeta.Cy - hScaled / 2) + '%',
      width: wScaled + '%',
      height: hScaled + '%',
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
};

/**
 * Type 1 — 클래식 (대형, 개별 배치)
 *
 * wireframeSlots.json의 Cx/Cy 좌표 기반 absolute 배치.
 * 높이 고정, 너비만 이미지 AR에 따라 동적 조정.
 */
export const SingleLargeLayout = ({ products, options, inputData, ratioStyles, zonePositions, textStyles }) => {
  const { isSquare, isTall, containerPadding } = ratioStyles;
  const mainZone = isTall ? computeMainZone916() : MAIN_ZONE_4x5;
  const showOverlays = useDecorOverlays(options.bgType);
  const p = products.filter(prod => prod.image).slice(0, 3);
  const count = p.length;

  const hasSlogan = Boolean(inputData.mainSlogan);
  const wireframe = count > 0 ? getWireframeSlots(1, count, hasSlogan) : null;
  if (!wireframe && count > 0 && import.meta.env.DEV) {
    console.warn('[Type1] Missing wireframe key:', count, hasSlogan);
  }
  const slots = wireframe?.slots || [];

  return (
    <div className={`w-full h-full relative ${showOverlays ? 'bg-white/5' : ''}`}>
      {/* 제품 캔버스: main zone 영역 */}
      <div style={{
        position: 'absolute',
        left: mainZone.x + '%', top: mainZone.y + '%',
        width: mainZone.w + '%', height: mainZone.h + '%',
      }}>
        {slots.map((slotMeta, idx) =>
          idx < p.length ? (
            <IndividualSlot
              key={p[idx].id || idx}
              product={p[idx]}
              slotMeta={slotMeta}
              isSquare={isSquare}
            />
          ) : null
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
