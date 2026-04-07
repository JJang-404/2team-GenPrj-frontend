import type { BackgroundMode } from '../../types/editor';
import SidebarBlock from './SidebarBlock';
import SidebarMiniButton from './SidebarMiniButton';
import { extractHexColor, parseBackgroundToken, stripBackgroundTokens, withBackgroundToken } from './backgroundTokens';

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
  const freePrompt = stripBackgroundTokens(promptHint);
  const solidColor = extractHexColor(parseBackgroundToken(promptHint, 'SOLID')?.[0] ?? '', '#60a5fa');
  const gradientColors = (parseBackgroundToken(promptHint, 'GRADIENT') ?? ['#93c5fd', '#1d4ed8']).map((color) =>
    extractHexColor(color, '#93c5fd')
  );
  const multiColors = (parseBackgroundToken(promptHint, 'MULTI') ?? ['#c4b5fd', '#93c5fd']).map((color) =>
    extractHexColor(color, '#93c5fd')
  );

  const buildPromptForMode = (mode: BackgroundMode, basePrompt: string, overrides?: string[]) => {
    if (mode === 'solid') {
      return withBackgroundToken(basePrompt, `BG_SOLID(${overrides?.[0] ?? solidColor})`);
    }
    if (mode === 'gradient') {
      const colors = overrides?.length ? overrides : gradientColors;
      return withBackgroundToken(basePrompt, `BG_GRADIENT(${colors.join(',')})`);
    }
    if (mode === 'pastel') {
      const colors = overrides?.length ? overrides : multiColors;
      return withBackgroundToken(basePrompt, `BG_MULTI(${colors.join(',')})`);
    }
    return basePrompt;
  };

  const setPromptWithToken = (mode: BackgroundMode, basePrompt: string, colors?: string[]) => {
    onPromptHintChange(buildPromptForMode(mode, basePrompt, colors));
  };

  const handleModeSelect = (mode: BackgroundMode) => {
    onBackgroundModeChange(mode);
    setPromptWithToken(mode, freePrompt);
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
          <SidebarMiniButton key={mode.id} active={backgroundMode === mode.id} onClick={() => handleModeSelect(mode.id)}>
            {mode.label}
          </SidebarMiniButton>
        ))}
      </div>
      {backgroundMode === 'solid' ? (
        <label className="sidebar-form-row">
          <span>단색</span>
          <input type="color" value={solidColor} onChange={(event) => setPromptWithToken('solid', freePrompt, [event.target.value])} />
        </label>
      ) : null}
      {backgroundMode === 'gradient' ? (
        <div className="sidebar-multi-color-list">
          {gradientColors.map((color, index) => (
            <div key={`gradient-${index}`} className="sidebar-multi-color-row">
              <input
                type="color"
                value={color}
                onChange={(event) => {
                  const next = [...gradientColors];
                  next[index] = event.target.value;
                  setPromptWithToken('gradient', freePrompt, next);
                }}
              />
              <SidebarMiniButton
                onClick={() => {
                  if (gradientColors.length <= 2) return;
                  setPromptWithToken('gradient', freePrompt, gradientColors.filter((_, colorIndex) => colorIndex !== index));
                }}
              >
                색 제거
              </SidebarMiniButton>
            </div>
          ))}
          <SidebarMiniButton
            className="sidebar-mini-btn--wide"
            onClick={() => {
              if (gradientColors.length >= 4) return;
              setPromptWithToken('gradient', freePrompt, [...gradientColors, '#f9a8d4']);
            }}
          >
            색 추가
          </SidebarMiniButton>
        </div>
      ) : null}
      {backgroundMode === 'pastel' ? (
        <div className="sidebar-multi-color-list">
          {multiColors.map((color, index) => (
            <div key={`multi-${index}`} className="sidebar-multi-color-row">
              <input
                type="color"
                value={color}
                onChange={(event) => {
                  const next = [...multiColors];
                  next[index] = event.target.value;
                  setPromptWithToken('pastel', freePrompt, next);
                }}
              />
              <SidebarMiniButton
                onClick={() => {
                  if (multiColors.length <= 2) return;
                  setPromptWithToken('pastel', freePrompt, multiColors.filter((_, colorIndex) => colorIndex !== index));
                }}
              >
                색 제거
              </SidebarMiniButton>
            </div>
          ))}
          <SidebarMiniButton className="sidebar-mini-btn--wide" onClick={() => setPromptWithToken('pastel', freePrompt, [...multiColors, '#f9a8d4'])}>
            색 추가
          </SidebarMiniButton>
        </div>
      ) : null}
      <textarea
        className="sidebar__textarea"
        value={freePrompt}
        onChange={(event) => setPromptWithToken(backgroundMode, event.target.value)}
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
