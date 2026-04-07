import { useRef, useCallback } from 'react';
import { CONCEPT_STYLES, ASPECT_CLASSES } from '../../constants/design';
import { getRatioStyles } from '../../utils/ratioStyles';
import { getBgStyle } from '../../utils/bgStyles';
import { ClassicLayout, DynamicLayout, FocusedLayout, ImmersiveLayout } from './DraftLayouts';
import { ExtraInfoStrip } from './DraftShared';
import type { InitOptions, InitProduct, InitExtraInfo, InputData } from '../../types';

const LAYOUTS = [ClassicLayout, DynamicLayout, FocusedLayout, ImmersiveLayout];

interface Props {
  idx: number;
  isSelected: boolean;
  onSelect: (idx: number) => void;
  onEditDesign?: (idx: number) => void;
  products: InitProduct[];
  options: InitOptions;
  inputData: InputData;
  extraInfo: InitExtraInfo;
  onUpdateOption: <K extends keyof InitOptions>(key: K, value: InitOptions[K]) => void;
}

const DraftCard = ({ idx, isSelected, onSelect, onEditDesign, products, options, inputData, extraInfo, onUpdateOption }: Props) => {
  const activeProducts = products.filter((p) => p.image);
  const ratioStyles = getRatioStyles(options.ratio);
  const Layout = LAYOUTS[idx % LAYOUTS.length];
  const isSquare = options.ratio === '1:1';

  const bgInlineStyle = getBgStyle(options.bgType, options.colors, {
    gradientAngle: options.gradientAngle,
    splitPosition: options.splitPosition,
    splitDirection: options.splitDirection,
  });
  const bgClass = bgInlineStyle
    ? 'text-white'
    : CONCEPT_STYLES[options.concept] ?? '';

  /** 선택된 카드를 더블클릭하면 에디터로 전환 */
  const handleDoubleClick = () => {
    if (isSelected && onEditDesign) onEditDesign(idx);
  };

  return (
    <div className="group relative transition-all duration-500">
      <div
        className={`
          rounded-[3.5rem] overflow-hidden shadow-2xl border-4 relative
          transition-[border-color,box-shadow,transform] duration-700 cursor-pointer
          ${isSelected ? 'border-blue-500 scale-105 shadow-blue-500/20' : 'border-transparent group-hover:border-blue-500/30'}
          ${ASPECT_CLASSES[options.ratio]}
          ${bgClass}
        `}
        style={bgInlineStyle ?? undefined}
        data-divider-root
        onDoubleClick={handleDoubleClick}
      >
        <div className="w-full h-full relative z-10">
          <Layout
            activeProducts={activeProducts}
            options={options}
            inputData={inputData}
            ratioStyles={ratioStyles}
          />
        </div>
        <ExtraInfoStrip extraInfo={extraInfo} isSquare={isSquare} />

        {options.bgType === '다중색' && (
          <DividerHandle
            splitPosition={options.splitPosition}
            splitDirection={options.splitDirection}
            onDrag={(pos) => onUpdateOption('splitPosition', pos)}
          />
        )}
      </div>

      {/* 선택 / 편집 버튼 */}
      {isSelected && onEditDesign ? (
        <button
          onClick={() => onEditDesign(idx)}
          className="mt-4 w-full py-3 rounded-2xl text-xs font-black transition-all bg-blue-600 text-white shadow-lg hover:bg-blue-700"
        >
          디자인 편집 →
        </button>
      ) : (
        <button
          onClick={() => onSelect(idx)}
          className={`mt-4 w-full py-3 rounded-2xl text-xs font-black transition-all ${
            isSelected
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-400'
          }`}
        >
          {isSelected ? '선택됨' : '이 디자인 선택'}
        </button>
      )}
    </div>
  );
};

// ─── 다중색 분할선 드래그 핸들 ─────────────────────────────────────────────────
const DividerHandle = ({ splitPosition, splitDirection, onDrag }: {
  splitPosition: number;
  splitDirection: string;
  onDrag: (pos: number) => void;
}) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const isH = splitDirection === 'horizontal';

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = handleRef.current?.closest('[data-divider-root]');
    if (!container) return;

    const onMove = (moveE: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const pos = isH
        ? ((moveE.clientX - rect.left) / rect.width) * 100
        : ((moveE.clientY - rect.top) / rect.height) * 100;
      onDrag(Math.max(10, Math.min(90, Math.round(pos))));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [isH, onDrag]);

  return (
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
      <div
        className="absolute bg-white/50 group-hover/dh:bg-white/90 transition-colors"
        style={isH ? { left: '50%', top: 0, bottom: 0, width: 2, transform: 'translateX(-50%)' } : { top: '50%', left: 0, right: 0, height: 2, transform: 'translateY(-50%)' }}
      />
      <div className="absolute w-5 h-5 rounded-full bg-white/80 shadow-lg flex items-center justify-center" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <div className={`rounded-full bg-slate-400 ${isH ? 'w-0.5 h-3' : 'h-0.5 w-3'}`} />
      </div>
    </div>
  );
};

export default DraftCard;
