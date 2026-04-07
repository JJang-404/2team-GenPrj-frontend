import type { BackgroundMode } from '../../types/editor';
import SidebarBlock from './SidebarBlock';
import SidebarMiniButton from './SidebarMiniButton';
import { extractHexColor, parseBackgroundToken, withBackgroundToken } from './backgroundTokens';

const modes: { id: BackgroundMode; label: string }[] = [
  { id: 'solid', label: '단색' },
  { id: 'gradient', label: '그라데이션' },
  { id: 'pastel', label: '다중색' },
  { id: 'ai-image', label: 'AI 이미지 생성' },
];

interface BackgroundOptionsSectionProps {
  expanded: boolean;
  promptHint: string;
  backgroundMode: BackgroundMode;
  onPromptHintChange: (value: string) => void;
  onBackgroundModeChange: (mode: BackgroundMode) => void;
  onGenerateBackgrounds: () => void;
  onBackToBackgrounds: () => void;
}

export default function BackgroundOptionsSection({
  expanded,
  promptHint,
  backgroundMode,
  onPromptHintChange,
  onBackgroundModeChange,
  onGenerateBackgrounds,
  onBackToBackgrounds,
}: BackgroundOptionsSectionProps) {
  const startColor = extractHexColor(promptHint.split('시작색:')[1]?.split(/\s|,|\./)[0] ?? '', '#93c5fd');
  const endColor = extractHexColor(promptHint.split('종료색:')[1]?.split(/\s|,|\./)[0] ?? '', '#1d4ed8');
  const solidColor = extractHexColor(parseBackgroundToken(promptHint, 'SOLID')?.[0] ?? '', '#60a5fa');
  const gradientColors = parseBackgroundToken(promptHint, 'GRADIENT') ?? [startColor, endColor];
  const multiColors = (parseBackgroundToken(promptHint, 'MULTI') ?? ['#c4b5fd', '#93c5fd']).map((color) =>
    extractHexColor(color, '#93c5fd')
  );

  const setSolidToken = (color: string) => {
    onPromptHintChange(withBackgroundToken(promptHint, `BG_SOLID(${color})`));
  };

  const setGradientToken = (nextStart: string, nextEnd: string) => {
    onPromptHintChange(withBackgroundToken(promptHint, `BG_GRADIENT(${nextStart},${nextEnd})`));
  };

  const setMultiToken = (colors: string[]) => {
    onPromptHintChange(withBackgroundToken(promptHint, `BG_MULTI(${colors.join(',')})`));
  };

  const generationButtonLabel = {
    solid: '단색 이미지 생성',
    gradient: '그라데이션 이미지 생성',
    pastel: '다중색 이미지 생성',
    'ai-image': 'AI 이미지 생성',
  }[backgroundMode];

  return (
    <SidebarBlock title="배경 생성 옵션">
      <div className="sidebar-mode-grid">
        {modes.map((mode) => (
          <SidebarMiniButton key={mode.id} active={backgroundMode === mode.id} onClick={() => onBackgroundModeChange(mode.id)}>
            {mode.label}
          </SidebarMiniButton>
        ))}
      </div>
      {backgroundMode === 'solid' ? (
        <label className="sidebar-form-row">
          <span>단색</span>
          <input type="color" value={solidColor} onChange={(event) => setSolidToken(event.target.value)} />
        </label>
      ) : null}
      {backgroundMode === 'gradient' ? (
        <div className={`sidebar-color-grid ${expanded ? 'sidebar-color-grid--expanded' : ''}`}>
          <label className="sidebar-form-row">
            <span>시작 색</span>
            <input
              type="color"
              value={extractHexColor(gradientColors[0] ?? startColor, '#93c5fd')}
              onChange={(event) =>
                setGradientToken(event.target.value, extractHexColor(gradientColors[1] ?? endColor, '#1d4ed8'))
              }
            />
          </label>
          <label className="sidebar-form-row">
            <span>종료 색</span>
            <input
              type="color"
              value={extractHexColor(gradientColors[1] ?? endColor, '#1d4ed8')}
              onChange={(event) =>
                setGradientToken(extractHexColor(gradientColors[0] ?? startColor, '#93c5fd'), event.target.value)
              }
            />
          </label>
        </div>
      ) : null}
      {backgroundMode === 'pastel' ? (
        <div className="sidebar-multi-color-list">
          {multiColors.map((color, index) => (
            <div key={`${color}-${index}`} className="sidebar-multi-color-row">
              <input
                type="color"
                value={color}
                onChange={(event) => {
                  const next = [...multiColors];
                  next[index] = event.target.value;
                  setMultiToken(next);
                }}
              />
              <SidebarMiniButton
                onClick={() => {
                  if (multiColors.length <= 2) return;
                  setMultiToken(multiColors.filter((_, colorIndex) => colorIndex !== index));
                }}
              >
                색 제거
              </SidebarMiniButton>
            </div>
          ))}
          <SidebarMiniButton className="sidebar-mini-btn--wide" onClick={() => setMultiToken([...multiColors, '#f9a8d4'])}>
            색 추가
          </SidebarMiniButton>
        </div>
      ) : null}
      <textarea
        className="sidebar__textarea"
        value={promptHint}
        onChange={(event) => onPromptHintChange(event.target.value)}
        placeholder="AI 이미지 생성 프롬프트"
      />
      <SidebarMiniButton className="sidebar-mini-btn--wide" onClick={onGenerateBackgrounds}>
        {generationButtonLabel}
      </SidebarMiniButton>
      <div className="sidebar-inline-actions">
        <SidebarMiniButton onClick={onBackToBackgrounds}>배경 후보 보기</SidebarMiniButton>
        <SidebarMiniButton>템플릿 저장</SidebarMiniButton>
        <SidebarMiniButton>프로젝트 저장</SidebarMiniButton>
      </div>
    </SidebarBlock>
  );
}
