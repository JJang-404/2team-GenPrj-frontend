import { BG_TYPES } from '../../../constants/design';
import type { InitOptions } from '../../../types';

interface Props {
  options: InitOptions;
  updateOption: <K extends keyof InitOptions>(key: K, value: InitOptions[K]) => void;
}

const BgSection = ({ options, updateOption }: Props) => {
  const { bgType, colors, gradientAngle, splitPosition, splitDirection } = options;
  const isGradient = bgType === '그라데이션';
  const isMulti    = bgType === '다중색';
  const isSolid    = bgType === '단색';

  const updateColor = (index: number, value: string) => {
    const next = [...colors];
    next[index] = value;
    updateOption('colors', next);
  };

  const addColor = () => {
    if (colors.length >= 4) return;
    updateOption('colors', [...colors, '#f9a8d4']);
  };

  const removeColor = (index: number) => {
    if (colors.length <= 2) return;
    updateOption('colors', colors.filter((_, i) => i !== index));
  };

  return (
    <section className="space-y-4">
      <label className="text-xs font-bold text-slate-400 uppercase">배경 종류</label>

      <div className="grid grid-cols-2 gap-2">
        {BG_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => updateOption('bgType', type)}
            className={`py-3 text-[10px] font-bold rounded-xl border-2 transition-all ${
              bgType === type
                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md'
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {isSolid && (
        <div className="flex gap-4 p-3 bg-slate-50 rounded-xl">
          <ColorSwatch label="배경 색" value={colors[0]} onChange={(e) => updateColor(0, e.target.value)} />
        </div>
      )}

      {(isGradient || isMulti) && (
        <div className="p-3 bg-slate-50 rounded-xl space-y-2">
          <span className="text-[10px] font-bold text-slate-500 block">색상 목록</span>
          {colors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(idx, e.target.value)}
                className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-400 flex-1">{color}</span>
              <button
                type="button"
                disabled={colors.length <= 2}
                onClick={() => removeColor(idx)}
                className="text-[10px] px-2 py-1 rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                색 제거
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={colors.length >= 4}
            onClick={addColor}
            className="w-full py-1.5 text-[10px] font-bold rounded-lg border-2 border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            + 색 추가 ({colors.length}/4)
          </button>
        </div>
      )}

      {isGradient && (
        <div className="p-3 bg-slate-50 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500">그라데이션 각도</span>
            <span className="text-[10px] font-mono text-slate-400">{gradientAngle}°</span>
          </div>
          <input
            type="range" min={0} max={360} step={5} value={gradientAngle}
            onChange={(e) => updateOption('gradientAngle', Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex gap-1 flex-wrap">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => updateOption('gradientAngle', a)}
                className={`px-2 py-0.5 text-[9px] rounded font-bold transition-all ${
                  gradientAngle === a ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:border-blue-300'
                }`}
              >
                {a}°
              </button>
            ))}
          </div>
        </div>
      )}

      {isMulti && (
        <div className="p-3 bg-slate-50 rounded-xl space-y-3">
          <div className="flex gap-2">
            {(['horizontal', 'vertical'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => updateOption('splitDirection', dir)}
                className={`flex-1 py-2 text-[10px] font-bold rounded-lg border-2 transition-all ${
                  splitDirection === dir ? 'border-blue-600 bg-blue-50 text-blue-700' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                }`}
              >
                {dir === 'horizontal' ? '← 좌우 분할 →' : '↕ 상하 분할'}
              </button>
            ))}
          </div>
          {colors.length === 2 && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500">분할 위치</span>
                <span className="text-[10px] font-mono text-slate-400">{splitPosition}%</span>
              </div>
              <input
                type="range" min={10} max={90} step={1} value={splitPosition}
                onChange={(e) => updateOption('splitPosition', Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const ColorSwatch = ({ label, value, onChange }: { label: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement> }) => (
  <div className="flex items-center gap-2">
    <input type="color" value={value} onChange={onChange} className="w-8 h-8 rounded border-none bg-transparent cursor-pointer" />
    <span className="text-xs font-mono font-bold text-slate-400">{label}</span>
  </div>
);

export default BgSection;
