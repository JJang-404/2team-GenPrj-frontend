import { useRef, useCallback } from 'react';
import { CONCEPT_STYLES, ASPECT_CLASSES } from '../../constants/design';
import { getRatioStyles } from '../../utils/ratioStyles';
import { getBgStyle } from '../../utils/bgStyles';
import { ClassicLayout, DynamicLayout, FocusedLayout, ImmersiveLayout } from './DraftLayouts';
import { ExtraInfoStrip } from './DraftShared';

const LAYOUTS = [ClassicLayout, DynamicLayout, FocusedLayout, ImmersiveLayout];

/**
 * DraftCard
 *   onUpdateOption(key, value) — 다중색 분할선 드래그 시 splitPosition 업데이트
 */
const DraftCard = ({ idx, isSelected, onSelect, products, options, inputData, extraInfo, onUpdateOption }) => {
  const activeProducts = products.filter((p) => p.image);
  const ratioStyles = getRatioStyles(options.ratio);
  const Layout = LAYOUTS[idx % LAYOUTS.length];
  const isSquare = options.ratio === '1:1';

  // bgType에 따라 인라인 스타일 또는 CONCEPT_STYLES 클래스 결정
  let bgInlineStyle;
  if (options.bgType === 'AI 생성') {
    bgInlineStyle = options.aiImageUrl
      ? { backgroundImage: `url(${options.aiImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : null;
  } else {
    bgInlineStyle = getBgStyle(options.bgType, options.startColor, options.endColor, {
      gradientAngle: options.gradientAngle,
      splitPosition: options.splitPosition,
      splitDirection: options.splitDirection,
    });
  }
  const bgClass = bgInlineStyle
    ? 'text-white'                          // 동적 배경: 항상 흰 글씨
    : CONCEPT_STYLES[options.concept] ?? ''; // AI 생성(로딩/미생성): 기존 컨셉 클래스

  return (
    <div className="group relative transition-all duration-500">
      <div
        className={`
          rounded-[3.5rem] overflow-hidden shadow-2xl border-4 relative
          transition-[border-color,box-shadow,transform] duration-700
          ${isSelected ? 'border-blue-500 scale-105 shadow-blue-500/20' : 'border-transparent group-hover:border-blue-500/30'}
          ${ASPECT_CLASSES[options.ratio]}
          ${bgClass}
        `}
        style={bgInlineStyle ?? undefined}
        data-divider-root
      >
        {/* AI 배경 생성 중 로딩 오버레이 */}
        {options.bgType === 'AI 생성' && options.isGeneratingAiBg && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/70">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
            <span className="text-white text-[10px] font-bold">AI 배경 생성 중…</span>
          </div>
        )}

        <div className="w-full h-full relative z-10">
          <Layout
            activeProducts={activeProducts}
            options={options}
            inputData={inputData}
            ratioStyles={ratioStyles}
          />
        </div>

        {/* 추가 정보 오버레이 (구역 3) */}
        <ExtraInfoStrip extraInfo={extraInfo} isSquare={isSquare} />

        {/* 다중색 분할선 드래그 핸들 */}
        {options.bgType === '다중색' && onUpdateOption && (
          <DividerHandle
            splitPosition={options.splitPosition}
            splitDirection={options.splitDirection}
            onDrag={(pos) => onUpdateOption('splitPosition', pos)}
          />
        )}
      </div>

      <button
        onClick={() => onSelect(idx)}
        className={`mt-4 w-full py-3 rounded-2xl text-xs font-black transition-all ${
          isSelected
            ? 'bg-blue-600 text-white shadow-lg'
            : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-400'
        }`}
      >
        {isSelected ? '디자인편집' : '이 디자인 선택'}
      </button>
    </div>
  );
};

// ─── 다중색 분할선 드래그 핸들 ─────────────────────────────────────────────
/**
 * 분할선을 드래그해 splitPosition(%) 을 실시간 업데이트합니다.
 * - horizontal: 세로 분할선을 좌우로 드래그
 * - vertical  : 가로 분할선을 상하로 드래그
 */
const DividerHandle = ({ splitPosition, splitDirection, onDrag }) => {
  const handleRef = useRef(null);
  const isH = splitDirection === 'horizontal';

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const container = handleRef.current?.closest('[data-divider-root]');
      if (!container) return;

      const onMove = (moveE) => {
        const rect = container.getBoundingClientRect();
        const clientX = moveE.touches ? moveE.touches[0].clientX : moveE.clientX;
        const clientY = moveE.touches ? moveE.touches[0].clientY : moveE.clientY;
        const pos = isH
          ? ((clientX - rect.left) / rect.width) * 100
          : ((clientY - rect.top) / rect.height) * 100;
        onDrag(Math.max(10, Math.min(90, Math.round(pos))));
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [isH, onDrag],
  );

  return (
    // 히트 영역: 분할선 ±6px
    <div
      ref={handleRef}
      data-divider-handle
      className="absolute z-50 group/dh"
      style={
        isH
          ? { left: `${splitPosition}%`, top: 0, bottom: 0, width: 12, transform: 'translateX(-50%)', cursor: 'col-resize' }
          : { top: `${splitPosition}%`, left: 0, right: 0, height: 12, transform: 'translateY(-50%)', cursor: 'row-resize' }
      }
      onPointerDown={handlePointerDown}
    >
      {/* 가시 선 */}
      <div
        className="absolute bg-white/50 group-hover/dh:bg-white/90 transition-colors"
        style={
          isH
            ? { left: '50%', top: 0, bottom: 0, width: 2, transform: 'translateX(-50%)' }
            : { top: '50%', left: 0, right: 0, height: 2, transform: 'translateY(-50%)' }
        }
      />
      {/* 그립 원 */}
      <div
        className="absolute w-5 h-5 rounded-full bg-white/80 shadow-lg flex items-center justify-center"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <div className={`rounded-full bg-slate-400 ${isH ? 'w-0.5 h-3' : 'h-0.5 w-3'}`} />
      </div>
    </div>
  );
};

export default DraftCard;
