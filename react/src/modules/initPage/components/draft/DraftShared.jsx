// ─── StoreTitle ────────────────────────────────────────────────────────────
export const StoreTitle = ({ storeName, brandColor, className = '' }) => (
  <h3
    className={`font-black tracking-tighter italic font-zen z-30 ${className}`}
    style={{ color: brandColor || '#000000' }}
  >
    {storeName || '가게 이름을 입력하세요'}
  </h3>
);

// ─── SloganText ────────────────────────────────────────────────────────────
export const SloganText = ({ slogan, className = '' }) =>
  slogan ? (
    <p className={`text-black/80 font-bold tracking-[0.2em] font-zen uppercase z-30 ${className}`}>
      {slogan}
    </p>
  ) : null;

// ─── ProductInfo ───────────────────────────────────────────────────────────
export const ProductInfo = ({ p, isSquare }) => {
  const hasContent =
    (p.showName && p.name) || (p.showPrice && p.price) || (p.showDesc && p.description);
  if (!hasContent) return null;

  return (
    <div
      className={`bg-white/80 backdrop-blur-md ${isSquare ? 'p-2 rounded-lg' : 'p-4 rounded-2xl'
        } text-black z-20 shadow-xl border border-slate-200/70`}
    >
      {p.showName && p.name && (
        <p className={`${isSquare ? 'text-[10px]' : 'text-[14px]'} font-black font-zen`}>{p.name}</p>
      )}
      {p.showPrice && p.price && (
        <p className={`${isSquare ? 'text-[9px]' : 'text-[13px]'} text-black font-bold mt-0.5`}>
          {Number(p.price).toLocaleString()}{p.currency ?? '원'}
        </p>
      )}
      {p.showDesc && p.description && (
        <p
          className={`${isSquare ? 'text-[10px]' : 'text-[14px]'
            } font-zen opacity-90 mt-1 leading-tight border-t border-slate-300 pt-1`}
        >
          {p.description}
        </p>
      )}
    </div>
  );
};

// ─── ImageFrame ────────────────────────────────────────────────────────────
export const ImageFrame = ({
  activeProducts,
  draftIndex,
  isSquare,
  isFiveFour,
  isFull = false,
  className = '',
}) => {
  const count = activeProducts.length;
  if (count === 0) return null;
  const slots = getDraftProductSlots(draftIndex, count);

  return (
    <div
      className={`relative z-0 ${className} ${isFull ? 'w-full h-full' : 'w-full h-full'}`}
    >
      {activeProducts.map((p, pIdx) => {
        const slot = slots[pIdx] ?? slots[slots.length - 1];
        if (!slot) return null;

        return (
          <div
            key={p.id}
            className="absolute flex items-center justify-center"
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.width}%`,
              height: `${slot.height}%`,
              transform: `rotate(${slot.rotation}deg)`,
            }}
          >
            <img
              src={p.image}
              className="w-full h-full object-contain drop-shadow-2xl transition-all"
              style={{ animationDelay: `${pIdx * 0.1}s` }}
              alt=""
            />
          </div>
        );
      })}
    </div>
  );
};

// ─── ExtraInfoStrip ────────────────────────────────────────────────────────
/**
 * 추가 정보를 드래프트 카드 하단에 표시하는 오버레이 스트립.
 * 표시(showXxx) 플래그가 true이고 실제 값이 있을 때만 배지로 나타남.
 */
export const ExtraInfoStrip = ({ extraInfo, isSquare }) => {
  if (!extraInfo) return null;

  const badges = [
    extraInfo.showParkingCount && extraInfo.parkingCount > 0 && `주차장 ${extraInfo.parkingCount}대`,
    extraInfo.showPhone && extraInfo.phone && extraInfo.phone,
    extraInfo.showAddress && extraInfo.address && extraInfo.address,
    extraInfo.petFriendly && extraInfo.showPetFriendly && '애견 동반',
    extraInfo.isNoKids && extraInfo.showIsNoKids && '노키즈존',
    extraInfo.hasSmokingArea && extraInfo.showSmokingArea && '흡연 구역',
    extraInfo.hasElevator && extraInfo.showHasElevator && '엘레베이터',
  ].filter(Boolean);

  if (badges.length === 0) return null;

  return (
    // 1줄 고정 + 가로 스크롤. 좌우 px-8로 둥근 모서리 안쪽에 여백 확보.
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-sm px-8 py-2 flex gap-1.5 overflow-x-auto overflow-y-hidden scrollbar-none flex-nowrap">
      {badges.map((text) => (
        <span
          key={text}
          className={`shrink-0 bg-white/25 text-white font-bold rounded-md whitespace-nowrap ${isSquare ? 'text-[8px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'
            }`}
        >
          {text}
        </span>
      ))}
    </div>
  );
};
import { getDraftProductSlots } from '../../../../shared/draftLayout';

// ─── FooterInfo ────────────────────────────────────────────────────────────
/**
 * 주소와 전화번호를 캔버스의 고정된 수직 위치(92.5%, 96%)에 출력합니다.
 * 모든 레이아웃 구도에서 하드코딩 없이 동일한 하단 정보를 보장합니다.
 */
export const FooterInfo = ({ additionalInfo, isSquare }) => {
  if (!additionalInfo) return null;
  const { address, phoneNumber } = additionalInfo;
  const DEFAULT_TEXT_COLOR = '#000000';

  return (
    <>
      {address && (
        <div style={{
          position: 'absolute',
          left: '5%',
          top: '92.5%',
          width: '90%',
          textAlign: 'center',
          zIndex: 35,
          fontSize: isSquare ? '6px' : '9px',
          fontWeight: 600,
          color: DEFAULT_TEXT_COLOR,
          opacity: 0.8
        }}>
          {address}
        </div>
      )}
      {phoneNumber && (
        <div style={{
          position: 'absolute',
          left: '5%',
          top: '96%',
          width: '90%',
          textAlign: 'center',
          zIndex: 35,
          fontSize: isSquare ? '6px' : '9px',
          fontWeight: 600,
          color: DEFAULT_TEXT_COLOR,
          opacity: 0.8
        }}>
          {phoneNumber}
        </div>
      )}
    </>
  );
};
