import React from 'react';
import { StoreTitle, SloganText, ProductInfo, ImageFrame } from './DraftShared';

/**
 * 모든 레이아웃 컴포넌트가 공통으로 받는 props:
 *   activeProducts  - 이미지가 있는 제품 배열
 *   options         - { brandColor, bgType, ... }
 *   inputData       - { storeName, mainSlogan }
 *   ratioStyles     - getRatioStyles() 반환값
 *
 * bgType이 'AI 생성'이 아닐 때는 레이아웃 내부의 장식용 그라데이션/오버레이를
 * 렌더링하지 않아 배경색이 그대로 보이도록 합니다.
 */

/** 현재 bgType에서 장식 오버레이를 표시할지 여부 */
const useDecorOverlays = (bgType) => bgType === 'AI 생성';

// ─── 1. 클래식 (표준 광고 레이아웃) ────────────────────────────────────────
export const ClassicLayout = ({ activeProducts, options, inputData, ratioStyles }) => {
  const { isSquare, containerPadding, titleSize, isFiveFour } = ratioStyles;
  const showOverlays = useDecorOverlays(options.bgType);

  return (
    <div className={`w-full h-full flex flex-col ${containerPadding} items-center justify-start ${showOverlays ? 'bg-white/5' : ''}`}>
      <div className="w-full text-center border-b border-white/10 pb-6 mb-4 z-30">
        <StoreTitle
          storeName={inputData.storeName}
          brandColor={options.brandColor}
          className={`${titleSize} mb-2`}
        />
        <SloganText slogan={inputData.mainSlogan} className={isSquare ? 'text-[10px]' : 'text-sm'} />
      </div>
      <ImageFrame
        activeProducts={activeProducts}
        draftIndex={0}
        isSquare={isSquare}
        isFiveFour={isFiveFour}
        className="flex-1 w-full flex items-center justify-center py-4"
      />
      <div className={`w-full flex ${isSquare ? 'gap-2' : 'gap-4'} flex-wrap justify-center z-30 pt-4`}>
        {activeProducts.map((p) => (
          <ProductInfo key={p.id} p={p} isSquare={isSquare} />
        ))}
      </div>
    </div>
  );
};

// ─── 2. 역동적 구도 ────────────────────────────────────────────────────────
export const DynamicLayout = ({ activeProducts, options, inputData, ratioStyles }) => {
  const { isSquare, isTall, containerPadding, isFiveFour } = ratioStyles;
  const showOverlays = useDecorOverlays(options.bgType);

  return (
    <div className={`w-full h-full flex flex-col ${containerPadding} relative overflow-hidden ${showOverlays ? 'bg-white/5' : ''}`}>
      {/* 장식 오버레이: AI 생성 모드에서만 */}
      {showOverlays && (
        <>
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
          <div className="absolute -top-[20%] -right-[10%] w-[75%] h-[140%] bg-white/5 rotate-15 pointer-events-none" />
        </>
      )}
      <div className={`absolute ${isSquare ? 'top-6 left-6' : 'top-12 left-12'} z-30`}>
        <StoreTitle
          storeName={inputData.storeName}
          brandColor={options.brandColor}
          className={`${isSquare ? 'text-4xl' : isTall ? 'text-7xl' : 'text-6xl'} -rotate-3 drop-shadow-2xl`}
        />
        <SloganText
          slogan={inputData.mainSlogan}
          className={`mt-2 ml-2 ${isSquare ? 'text-xs' : 'text-xl'} opacity-60`}
        />
      </div>
      <div className="flex-1 flex items-center justify-center mt-20">
        <ImageFrame
          activeProducts={activeProducts}
          draftIndex={1}
          isSquare={isSquare}
          isFiveFour={isFiveFour}
          className="w-[98%] h-[75%] scale-110"
        />
      </div>
      <div className="absolute bottom-8 right-8 flex flex-col gap-3 items-end z-30">
        {activeProducts.slice(0, 3).map((p) => (
          <ProductInfo key={p.id} p={p} isSquare={isSquare} />
        ))}
      </div>
    </div>
  );
};

// ─── 3. 중앙 집중 구도 (텍스트 세로 회전 배치) ────────────────────────────
export const FocusedLayout = ({ activeProducts, options, inputData, ratioStyles }) => {
  const { isSquare, isFiveFour, containerPadding } = ratioStyles;
  const showOverlays = useDecorOverlays(options.bgType);
  const firstP = activeProducts[0] || {};

  // 가격 + 통화 포매팅
  const priceText =
    firstP.price
      ? `${Number(firstP.price).toLocaleString()} ${firstP.currency ?? '원'}`
      : null;

  return (
    <div
      className={`w-full h-full flex flex-col ${containerPadding} items-center justify-between relative ${showOverlays ? 'bg-black/5' : ''}`}
    >
      {/* 1. 제품명 (좌측 사이드 가로지름) */}
      {firstP.showName && firstP.name && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 origin-center z-30 whitespace-nowrap">
          <p className={`${isSquare ? 'text-xl' : 'text-4xl'} font-black font-zen text-white/70 uppercase tracking-widest drop-shadow-lg`}>
            {firstP.name}
          </p>
        </div>
      )}

      {/* 2. 가격 + 통화 (우측 사이드 가로지름) */}
      {firstP.showPrice && priceText && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 origin-center z-30 whitespace-nowrap">
          <p className={`${isSquare ? 'text-lg' : 'text-3xl'} font-bold font-zen text-yellow-400/80 tracking-tighter drop-shadow-lg`}>
            {priceText}
          </p>
        </div>
      )}

      {/* 3. 중앙 이미지 영역 */}
      <div className="flex-1 w-full flex items-center justify-center z-10 min-h-0">
        <ImageFrame
          activeProducts={activeProducts}
          draftIndex={2}
          isSquare={isSquare}
          isFiveFour={isFiveFour}
          className="scale-110"
        />
      </div>

      {/* 4. 하단 고정 영역 */}
      <div className="w-full flex flex-col items-center z-30 mt-auto pb-10">
        {firstP.showDesc && firstP.description && (
          <div className="w-full text-center px-8 mb-2">
            <p className={`${isSquare ? 'text-[9px]' : 'text-xs'} font-zen text-white/80 leading-relaxed`}>
              {firstP.description}
            </p>
          </div>
        )}
        <div className="text-center w-full px-4 break-words">
          <StoreTitle
            storeName={inputData.storeName}
            brandColor={options.brandColor}
            className={isSquare ? 'text-xl' : isFiveFour ? 'text-4xl' : 'text-6xl'}
          />
          <SloganText slogan={inputData.mainSlogan} className="text-[10px] tracking-[0.5em] opacity-40 mt-1" />
        </div>
      </div>
    </div>
  );
};

// ─── 4. 풀 이머시브 구도 (캔버스 전체 화면) ───────────────────────────────
export const ImmersiveLayout = ({ activeProducts, options, inputData, ratioStyles }) => {
  const { isSquare, isTall, isFiveFour } = ratioStyles;
  // AI 생성 모드에서만 이미지 오버레이 opacity/scale 효과 적용
  const showOverlays = useDecorOverlays(options.bgType);

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden">
      <div className={`absolute inset-0 z-0 flex items-center justify-center p-4 ${showOverlays ? 'opacity-80 scale-115' : ''}`}>
        <ImageFrame
          activeProducts={activeProducts}
          draftIndex={3}
          isSquare={isSquare}
          isFiveFour={isFiveFour}
          isFull
        />
      </div>
      <div className="z-30 text-center px-6">
        <StoreTitle
          storeName={inputData.storeName}
          brandColor={options.brandColor}
          className={`${
            isSquare ? 'text-5xl' : isTall ? 'text-8xl' : 'text-7xl'
          } drop-shadow-[0_10px_60px_rgba(0,0,0,1)] mb-4`}
        />
        <SloganText
          slogan={inputData.mainSlogan}
          className={`${
            isSquare ? 'text-sm' : 'text-lg'
          } bg-black/70 px-8 py-3 rounded-full backdrop-blur-2xl inline-block border border-white/20 shadow-2xl`}
        />
      </div>
      <div className={`absolute ${isSquare ? 'bottom-6 right-6' : 'bottom-12 right-12'} flex flex-col gap-2 items-end z-30`}>
        {activeProducts.slice(0, 2).map((p) => (
          <ProductInfo key={p.id} p={p} isSquare={isSquare} />
        ))}
      </div>
    </div>
  );
};
