import { useMemo, useRef } from 'react';
import type {
  BackgroundMode,
  EditorElement,
  EditorStep,
  SidebarRecommendation,
  TemplateDefinition,
} from '../types/editor';
import SidebarBlock from './sidebar/SidebarBlock';
import SidebarMiniButton from './sidebar/SidebarMiniButton';

interface SidebarProps {
  step: EditorStep;
  expanded: boolean;
  onToggleExpanded: () => void;
  template: TemplateDefinition | null;
  elements: EditorElement[];
  selectedElement: EditorElement | null;
  infoItems: Array<{ label: string; visible: boolean }>;
  storeName: string;
  mainSlogan: string;
  promptKo: string;
  promptHint: string;
  backgroundMode: BackgroundMode;
  recommendations: SidebarRecommendation[];
  onPromptChange: (value: string) => void;
  onPromptHintChange: (value: string) => void;
  onStoreNameChange: (value: string) => void;
  onMainSloganChange: (value: string) => void;
  onGenerateSlogan: () => void;
  onToggleInfoItem: (label: string) => void;
  onBackgroundModeChange: (mode: BackgroundMode) => void;
  onGenerateBackgrounds: () => void;
  onBackToInitialPage: () => void;
  onBackToBackgrounds: () => void;
  onSelectElement: (id: string) => void;
  onChangeElement: (id: string, patch: Partial<EditorElement>) => void;
  onToggleElementHidden: (id: string) => void;
  onToggleElementLocked: (id: string) => void;
  onAlignSelected: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onSaveImage: () => void;
  onReplaceSelectedImage: (file: File) => void;
  onRemoveSelectedImageBackground: () => void;
}

const modes: { id: BackgroundMode; label: string }[] = [
  { id: 'solid', label: '단색' },
  { id: 'gradient', label: '그라데이션' },
  { id: 'pastel', label: '다중색' },
  { id: 'ai-image', label: 'AI 이미지 생성' },
];

function extractHexColor(value: string, fallback: string) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) return value;
  return fallback;
}

function stripBackgroundTokens(value: string) {
  return value.replace(/\s*BG_(?:SOLID|GRADIENT|MULTI)\([^)]*\)/g, '').trim();
}

function parseBackgroundToken(promptHint: string, type: 'SOLID' | 'GRADIENT' | 'MULTI') {
  const matched = promptHint.match(new RegExp(`BG_${type}\\(([^)]*)\\)`));
  if (!matched) return null;
  return matched[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function withBackgroundToken(promptHint: string, token: string) {
  const base = stripBackgroundTokens(promptHint);
  return base ? `${base} ${token}`.trim() : token;
}

function TextInfoPanel({
  selectedElement,
  onChangeElement,
}: {
  selectedElement: EditorElement;
  onChangeElement: (id: string, patch: Partial<EditorElement>) => void;
}) {
  return (
    <SidebarBlock title="텍스트 정보">
      <div className="sidebar-edit-row">
        <span>투명도</span>
        <input
          type="range"
          min="0.2"
          max="1"
          step="0.05"
          value={selectedElement.opacity ?? 1}
          onChange={(event) => onChangeElement(selectedElement.id, { opacity: Number(event.target.value) })}
        />
        <SidebarMiniButton onClick={() => onChangeElement(selectedElement.id, { hidden: true })}>제거</SidebarMiniButton>
      </div>
      <div className="sidebar-edit-grid">
        <span>정렬</span>
        <div className="sidebar-segment">
          <SidebarMiniButton onClick={() => onChangeElement(selectedElement.id, { align: 'left' })}>왼쪽</SidebarMiniButton>
          <SidebarMiniButton onClick={() => onChangeElement(selectedElement.id, { align: 'center' })}>가운데</SidebarMiniButton>
          <SidebarMiniButton onClick={() => onChangeElement(selectedElement.id, { align: 'right' })}>오른쪽</SidebarMiniButton>
        </div>
      </div>
      <label className="sidebar-form-row">
        <span>색상</span>
        <input
          type="color"
          value={selectedElement.color ?? '#ffffff'}
          onChange={(event) => onChangeElement(selectedElement.id, { color: event.target.value })}
        />
      </label>
      <label className="sidebar-form-row">
        <span>텍스트 내용</span>
        <textarea
          className="sidebar__textarea sidebar__textarea--compact"
          value={selectedElement.text ?? ''}
          onChange={(event) => onChangeElement(selectedElement.id, { text: event.target.value })}
        />
      </label>
    </SidebarBlock>
  );
}

function ImageInfoPanel({
  selectedElement,
  onChangeElement,
  onReplaceSelectedImage,
  onRemoveSelectedImageBackground,
}: {
  selectedElement: EditorElement;
  onChangeElement: (id: string, patch: Partial<EditorElement>) => void;
  onReplaceSelectedImage: (file: File) => void;
  onRemoveSelectedImageBackground: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <SidebarBlock title="상품 사진 정보">
      <div className="sidebar-image-panel">
        <div className="sidebar-image-preview">
          {selectedElement.imageUrl ? <img src={selectedElement.imageUrl} alt={selectedElement.label} /> : <span>사진</span>}
        </div>
        <div className="sidebar-image-controls">
          <div className="sidebar-inline-actions">
            <SidebarMiniButton onClick={onRemoveSelectedImageBackground}>배경 제거</SidebarMiniButton>
            <SidebarMiniButton onClick={() => onChangeElement(selectedElement.id, { hidden: true })}>객체 제거</SidebarMiniButton>
          </div>
          <div className="sidebar-edit-row">
            <span>투명도</span>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={selectedElement.opacity ?? 1}
              onChange={(event) => onChangeElement(selectedElement.id, { opacity: Number(event.target.value) })}
            />
          </div>
          <SidebarMiniButton className="sidebar-mini-btn--wide" onClick={() => inputRef.current?.click()}>
            사진 수정
          </SidebarMiniButton>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onReplaceSelectedImage(file);
              event.currentTarget.value = '';
            }}
          />
        </div>
      </div>
    </SidebarBlock>
  );
}

export default function Sidebar({
  step,
  expanded,
  onToggleExpanded,
  template: _template,
  elements: _elements,
  selectedElement,
  infoItems,
  storeName,
  mainSlogan,
  promptKo: _promptKo,
  promptHint,
  backgroundMode,
  recommendations,
  onPromptChange,
  onPromptHintChange,
  onStoreNameChange,
  onMainSloganChange,
  onGenerateSlogan,
  onToggleInfoItem,
  onBackgroundModeChange,
  onGenerateBackgrounds,
  onBackToInitialPage,
  onBackToBackgrounds,
  onSelectElement: _onSelectElement,
  onChangeElement,
  onToggleElementHidden: _onToggleElementHidden,
  onToggleElementLocked: _onToggleElementLocked,
  onAlignSelected,
  onSaveImage: _onSaveImage,
  onReplaceSelectedImage,
  onRemoveSelectedImageBackground,
}: SidebarProps) {
  const startColor = extractHexColor(promptHint.split('시작색:')[1]?.split(/\s|,|\./)[0] ?? '', '#93c5fd');
  const endColor = extractHexColor(promptHint.split('종료색:')[1]?.split(/\s|,|\./)[0] ?? '', '#1d4ed8');
  const solidColor = extractHexColor(parseBackgroundToken(promptHint, 'SOLID')?.[0] ?? '', '#60a5fa');
  const gradientColors = parseBackgroundToken(promptHint, 'GRADIENT') ?? [startColor, endColor];
  const multiColors = (parseBackgroundToken(promptHint, 'MULTI') ?? ['#c4b5fd', '#93c5fd']).map((color) =>
    extractHexColor(color, '#93c5fd')
  );
  const visibleInfoCount = useMemo(() => infoItems.filter((item) => item.visible).length, [infoItems]);

  const updatePromptHintColor = (key: '시작색' | '종료색', color: string) => {
    const pattern = new RegExp(`${key}:\\s*#[0-9a-fA-F]{3,6}`);
    const nextToken = `${key}: ${color}`;
    if (pattern.test(promptHint)) {
      onPromptHintChange(promptHint.replace(pattern, nextToken));
      return;
    }

    const trimmed = promptHint.trim();
    onPromptHintChange(trimmed ? `${trimmed}, ${nextToken}` : nextToken);
  };

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
    <aside className={`sidebar sidebar--structured ${expanded ? 'sidebar--expanded' : 'sidebar--collapsed'}`}>
      <div className="sidebar__topbar">
        <h1 className="sidebar__brand">AD-GEN <span>PRO</span></h1>
        <div className="sidebar__header-actions">
          <button className="sidebar__topbar-btn" onClick={onBackToInitialPage}>처음으로</button>
          <button className="sidebar__topbar-btn sidebar__topbar-btn--toggle" onClick={onToggleExpanded}>
            {expanded ? '<<' : '>>'}
          </button>
        </div>
      </div>

      <div className="sidebar__body">
        <SidebarBlock title="광고 정보">
          <input
            className="sidebar__input sidebar__input--compact"
            placeholder="가게 이름을 입력하세요"
            value={storeName}
            onChange={(event) => onStoreNameChange(event.target.value)}
          />
          <div className="sidebar-inline-actions sidebar-inline-actions--prompt">
            <input
              className="sidebar__input sidebar__input--compact"
              value={mainSlogan}
              onChange={(event) => onMainSloganChange(event.target.value)}
              placeholder="최종 광고 문구"
            />
            <SidebarMiniButton onClick={onGenerateSlogan}>AI 문구</SidebarMiniButton>
          </div>
        </SidebarBlock>

        <SidebarBlock title="추가 정보">
          <div className={`sidebar-info-grid ${expanded ? 'sidebar-info-grid--expanded' : ''}`}>
            {infoItems.map(({ label, visible }) => (
              <div key={label} className="sidebar-info-item">
                <span>{label}</span>
                <SidebarMiniButton
                  active={visible}
                  onClick={() => onToggleInfoItem(label)}
                  aria-label={`${label} ${visible ? '숨기기' : '표시하기'}`}
                  title={visible ? '숨기기' : '표시하기'}
                >
                  {visible ? '🙉' : '🙈'}
                </SidebarMiniButton>
              </div>
            ))}
          </div>
          {visibleInfoCount > 0 ? <span className="sidebar__text">보이는 항목은 템플릿에 텍스트와 이미지 요소로 추가됩니다.</span> : null}
        </SidebarBlock>

        <SidebarBlock title="배경 생성 옵션">
          <div className="sidebar-mode-grid">
            {modes.map((mode) => (
              <SidebarMiniButton
                key={mode.id}
                active={backgroundMode === mode.id}
                onClick={() => onBackgroundModeChange(mode.id)}
              >
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
                  onChange={(event) => setGradientToken(event.target.value, extractHexColor(gradientColors[1] ?? endColor, '#1d4ed8'))}
                />
              </label>
              <label className="sidebar-form-row">
                <span>종료 색</span>
                <input
                  type="color"
                  value={extractHexColor(gradientColors[1] ?? endColor, '#1d4ed8')}
                  onChange={(event) => setGradientToken(extractHexColor(gradientColors[0] ?? startColor, '#93c5fd'), event.target.value)}
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

        <SidebarBlock title="요소 추가">
          <div className={`sidebar-add-grid ${expanded ? 'sidebar-add-grid--expanded' : ''}`}>
            {expanded ? <input className="sidebar__input sidebar__input--compact" placeholder="요소 이름" /> : null}
            <SidebarMiniButton>텍스트 추가</SidebarMiniButton>
            <SidebarMiniButton>상품 사진 추가</SidebarMiniButton>
          </div>
        </SidebarBlock>

        {selectedElement?.kind === 'text' ? (
          <TextInfoPanel
            selectedElement={selectedElement}
            onChangeElement={onChangeElement}
          />
        ) : null}

        {selectedElement?.kind === 'image' ? (
          <ImageInfoPanel
            selectedElement={selectedElement}
            onChangeElement={onChangeElement}
            onReplaceSelectedImage={onReplaceSelectedImage}
            onRemoveSelectedImageBackground={onRemoveSelectedImageBackground}
          />
        ) : null}

        {expanded ? (
          <SidebarBlock title="추천 기능">
            <div className="recommendations">
              {recommendations.map((recommendation) => (
                <div key={recommendation.title} className="recommendation-card">
                  <strong>{recommendation.title}</strong>
                  {recommendation.items.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ))}
            </div>
          </SidebarBlock>
        ) : null}

      </div>
    </aside>
  );
}
