// ─── StoreTitle ────────────────────────────────────────────────────────────
export const StoreTitle = ({ storeName, brandColor, className = '' }) => (
  <h3
    className={`font-black uppercase tracking-tighter italic font-zen z-30 ${className}`}
    style={{ color: brandColor }}
  >
    {storeName || '가게 이름을 입력하세요'}
  </h3>
);

// ─── SloganText ────────────────────────────────────────────────────────────
export const SloganText = ({ slogan, className = '' }) =>
  slogan ? (
    <p className={`text-white/80 font-bold tracking-[0.2em] font-zen uppercase z-30 ${className}`}>
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
      className={`bg-black/50 backdrop-blur-md ${
        isSquare ? 'p-2 rounded-lg' : 'p-4 rounded-2xl'
      } text-white z-20 shadow-xl border border-white/10`}
    >
      {p.showName && p.name && (
        <p className={`${isSquare ? 'text-[10px]' : 'text-[14px]'} font-black font-zen`}>{p.name}</p>
      )}
      {p.showPrice && p.price && (
        <p className={`${isSquare ? 'text-[9px]' : 'text-[13px]'} text-yellow-400 font-bold mt-0.5`}>
          {Number(p.price).toLocaleString()}{p.currency ?? '원'}
        </p>
      )}
      {p.showDesc && p.description && (
        <p
          className={`${
            isSquare ? 'text-[10px]' : 'text-[14px]'
          } font-zen opacity-90 mt-1 leading-tight border-t border-white/20 pt-1`}
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
  styleIdx,
  isSquare,
  isFiveFour,
  isFull = false,
  className = '',
}) => {
  const count = activeProducts.length;
  if (count === 0) return null;

  let gridClass = 'flex flex-row flex-wrap justify-center items-center gap-2';
  if (count <= 3) gridClass = 'flex flex-row justify-center items-center gap-4 w-full';
  else if (count === 4) gridClass = 'grid grid-cols-2 gap-3 w-full';
  else if (count >= 6) gridClass = 'grid grid-cols-3 gap-2 w-full';

  const containerHeight = isSquare ? 'max-h-[45%]' : isFiveFour ? 'max-h-[55%]' : 'max-h-none';
  const scaleFactor = isSquare || isFiveFour ? 'scale-[0.85]' : 'scale-100';

  return (
    <div
      className={`${gridClass} ${containerHeight} overflow-hidden z-0 ${className} ${
        isFull ? 'w-full h-full' : 'w-full'
      }`}
    >
      {activeProducts.map((p, pIdx) => {
        const itemWidth = count === 5 ? (pIdx < 2 ? 'w-[45%]' : 'w-[30%]') : 'max-w-full';
        const rotateStyle =
          styleIdx === 1
            ? `rotate(${pIdx % 2 === 0 ? '-5deg' : '5deg'}) translateY(${pIdx % 2 === 0 ? '-10px' : '10px'})`
            : isFull
            ? 'scale(1.15)'
            : 'none';

        return (
          <div key={p.id} className={`flex items-center justify-center ${scaleFactor}`}>
            <img
              src={p.image}
              className={`${itemWidth} max-h-full object-contain drop-shadow-2xl transition-all`}
              style={{ animationDelay: `${pIdx * 0.1}s`, transform: rotateStyle }}
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
    extraInfo.showSeatCount && extraInfo.seatCount > 0 && `좌석 ${extraInfo.seatCount}석`,
    extraInfo.showPhone   && extraInfo.phone    && extraInfo.phone,
    extraInfo.showAddress && extraInfo.address  && extraInfo.address,
    extraInfo.hasDelivery    && extraInfo.showDelivery    && '배달 가능',
    extraInfo.isNoKids       && extraInfo.showIsNoKids    && '노키즈존',
    extraInfo.hasSmokingArea && extraInfo.showSmokingArea && '흡연 구역',
    extraInfo.hasElevator    && extraInfo.showHasElevator   && '엘레베이터',
  ].filter(Boolean);

  if (badges.length === 0) return null;

  return (
    // 1줄 고정 + 가로 스크롤. 좌우 px-8로 둥근 모서리 안쪽에 여백 확보.
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-sm px-8 py-2 flex gap-1.5 overflow-x-auto overflow-y-hidden scrollbar-none flex-nowrap">
      {badges.map((text) => (
        <span
          key={text}
          className={`shrink-0 bg-white/25 text-white font-bold rounded-md whitespace-nowrap ${
            isSquare ? 'text-[8px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'
          }`}
        >
          {text}
        </span>
      ))}
    </div>
  );
};