import { BG_TYPES } from '../../../constants/design';

/**
 * 구역 1 – 배경 종류
 *   단색       : 시작 색만 활성
 *   그라데이션 : 두 색 + 각도 슬라이더 활성
 *   다중색     : 두 색 + 방향 토글 + 분할 위치 슬라이더 활성
 *   AI 생성    : 두 색 모두 비활성
 */
const BgSection = ({ options, updateOption, onGenerateAiBg }) => {
  const { bgType, startColor, endColor, gradientAngle, splitPosition, splitDirection, isGeneratingAiBg } = options;
  const isGradient  = bgType === '그라데이션';
  const isMulti     = bgType === '다중색';
  const isAi        = bgType === 'AI 생성';
  const endEnabled  = isGradient || isMulti;

  return (
    <section className="space-y-4">
      <label className="text-xs font-bold text-slate-400 uppercase">배경 종류</label>

      {/* 토글 버튼 그리드 (2×2) */}
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

      {/* 시작 색 / 종료 색 */}
      <div className="flex gap-4 p-3 bg-slate-50 rounded-xl">
        <ColorSwatch
          label="시작 색"
          value={startColor}
          onChange={(e) => updateOption('startColor', e.target.value)}
          disabled={isAi}
        />
        <ColorSwatch
          label="종료 색"
          value={endColor}
          onChange={(e) => updateOption('endColor', e.target.value)}
          disabled={!endEnabled}
        />
      </div>

      {/* AI 생성: 다시 생성 버튼 */}
      {isAi && (
        <button
          type="button"
          onClick={onGenerateAiBg}
          disabled={isGeneratingAiBg}
          className="w-full py-2.5 text-[10px] font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isGeneratingAiBg ? 'AI 배경 생성 중…' : 'AI 배경 다시 생성'}
        </button>
      )}

      {/* 그라데이션 각도 슬라이더 */}
      {isGradient && (
        <div className="p-3 bg-slate-50 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500">그라데이션 각도</span>
            <span className="text-[10px] font-mono text-slate-400">{gradientAngle}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={5}
            value={gradientAngle}
            onChange={(e) => updateOption('gradientAngle', Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          {/* 각도 프리셋 */}
          <div className="flex gap-1 flex-wrap">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => updateOption('gradientAngle', a)}
                className={`px-2 py-0.5 text-[9px] rounded font-bold transition-all ${
                  gradientAngle === a
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-400 hover:border-blue-300'
                }`}
              >
                {a}°
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 다중색 분할 컨트롤 */}
      {isMulti && (
        <div className="p-3 bg-slate-50 rounded-xl space-y-3">
          {/* 분할 방향 토글 */}
          <div className="flex gap-2">
            {['horizontal', 'vertical'].map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => updateOption('splitDirection', dir)}
                className={`flex-1 py-2 text-[10px] font-bold rounded-lg border-2 transition-all ${
                  splitDirection === dir
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                }`}
              >
                {dir === 'horizontal' ? '← 좌우 분할 →' : '↕ 상하 분할'}
              </button>
            ))}
          </div>

          {/* 분할 위치 슬라이더 */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500">분할 위치</span>
              <span className="text-[10px] font-mono text-slate-400">{splitPosition}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={1}
              value={splitPosition}
              onChange={(e) => updateOption('splitPosition', Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        </div>
      )}
    </section>
  );
};

const ColorSwatch = ({ label, value, onChange, disabled }) => (
  <div className={`flex items-center gap-2 transition-opacity ${disabled ? 'opacity-30' : ''}`}>
    <input
      type="color"
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-8 h-8 rounded border-none bg-transparent cursor-pointer disabled:cursor-not-allowed"
    />
    <span className="text-xs font-mono font-bold text-slate-400">{label}</span>
  </div>
);

export default BgSection;
