import type { ChangeEvent } from 'react';
import type {
  BackgroundMode,
  EditorElement,
  EditorStep,
  SidebarRecommendation,
  TemplateDefinition,
} from '../types/editor';

interface SidebarProps {
  step: EditorStep;
  template: TemplateDefinition | null;
  elements: EditorElement[];
  selectedElement: EditorElement | null;
  promptKo: string;
  promptHint: string;
  backgroundMode: BackgroundMode;
  recommendations: SidebarRecommendation[];
  onPromptChange: (value: string) => void;
  onPromptHintChange: (value: string) => void;
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
}

const modes: { id: BackgroundMode; label: string; hint: string }[] = [
  { id: 'solid', label: '단색', hint: '분할 면, 포인트 블록, 단일 컬러' },
  { id: 'gradient', label: '그라데이션', hint: '톤 변화를 활용한 깊이감' },
  { id: 'pastel', label: '파스텔', hint: '부드러운 크림 톤과 색면' },
  { id: 'ai-image', label: 'AI 이미지 생성', hint: '객체 없는 배경 이미지만 생성' },
];

const fontOptions = [
  { value: '"Pretendard Variable", "Noto Sans KR", sans-serif', label: 'Pretendard' },
  { value: '"MaruBuri", serif', label: 'MaruBuri' },
  { value: '"Gowun Dodum", "Noto Sans KR", sans-serif', label: 'Gowun Dodum' },
  { value: '"Nanum Myeongjo", serif', label: 'Nanum Myeongjo' },
  { value: '"Arial Black", Arial, sans-serif', label: 'Arial Black' },
];

export default function Sidebar({
  step,
  template,
  elements,
  selectedElement,
  promptKo,
  promptHint,
  backgroundMode,
  recommendations,
  onPromptChange,
  onPromptHintChange,
  onBackgroundModeChange,
  onGenerateBackgrounds,
  onBackToInitialPage,
  onBackToBackgrounds,
  onSelectElement,
  onChangeElement,
  onToggleElementHidden,
  onToggleElementLocked,
  onAlignSelected,
  onSaveImage,
}: SidebarProps) {
  const updateText = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, patchKey: keyof EditorElement) => {
    if (!selectedElement) return;
    onChangeElement(selectedElement.id, { [patchKey]: event.target.value } as Partial<EditorElement>);
  };

  const updateNumber = (event: ChangeEvent<HTMLInputElement>, patchKey: keyof EditorElement) => {
    if (!selectedElement) return;
    onChangeElement(selectedElement.id, { [patchKey]: Number(event.target.value) } as Partial<EditorElement>);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__topbar">
        <h1 className="sidebar__brand">AD-GEN <span>PRO</span></h1>
        <button className="sidebar__topbar-btn" onClick={onBackToInitialPage}>처음으로</button>
      </div>

      <div className="sidebar__body">
        <div className="sidebar__section">
          <div className="sidebar__eyebrow">Workflow</div>
          <h1 className="sidebar__title">광고 템플릿 편집 데모</h1>
          <p className="sidebar__text">
            템플릿 구조를 먼저 고르고, 배경만 다시 생성한 뒤, 객체를 전부 이동·회전·크기조절하는 흐름입니다.
          </p>
          <div className="sidebar__button-group">
            <button className="sidebar__button sidebar__button--ghost" onClick={onBackToBackgrounds}>
              배경 후보 다시 보기
            </button>
          </div>
        </div>

        <div className="sidebar__section">
          <div className="sidebar__label">배경 생성 옵션</div>
          <div className="mode-grid">
            {modes.map((mode) => (
              <button
                key={mode.id}
                className={`mode-chip ${backgroundMode === mode.id ? 'active' : ''}`}
                onClick={() => onBackgroundModeChange(mode.id)}
              >
                <strong>{mode.label}</strong>
                <span>{mode.hint}</span>
              </button>
            ))}
          </div>
          <textarea
            className="sidebar__textarea"
            value={promptKo}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="예: 녹차 라떼 포스터에 어울리는 깊은 올리브 컬러 배경, 컵이나 과일 같은 객체는 절대 넣지 마세요"
          />
          <input
            className="sidebar__input"
            value={promptHint}
            onChange={(event) => onPromptHintChange(event.target.value)}
            placeholder="예: 얼음 파편 추가, 여름 햇살 느낌, 종이 질감"
          />
          <button className="sidebar__button sidebar__button--icon" onClick={onGenerateBackgrounds}>
            <span className="icon-rotate" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 3v6h6" />
              </svg>
            </span>
            배경 다시 생성
          </button>
          <p className="sidebar__hint">
            한국어 프롬프트는 백엔드에서 영어로 변환한 뒤 모델 입력용 프롬프트로 정리됩니다.
          </p>
        </div>

        {template && (
          <div className="sidebar__section">
            <div className="sidebar__label">현재 템플릿</div>
            <div className="template-summary">
              <strong>{template.name}</strong>
              <span>{template.previewNote}</span>
            </div>
            <div className="layer-list">
              {elements.map((element) => (
                <div key={element.id} className="layer-list__item">
                  <button className="layer-list__main" onClick={() => onSelectElement(element.id)}>
                    <strong>{element.label}</strong>
                    <span>{element.kind}</span>
                  </button>
                  <div className="layer-list__actions">
                    <button type="button" onClick={() => onToggleElementHidden(element.id)} title="숨기기">
                      {element.hidden ? '🙈' : '👁'}
                    </button>
                    <button type="button" onClick={() => onToggleElementLocked(element.id)} title="잠금">
                      {element.locked ? '🔒' : '🔓'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedElement && (
          <div className="sidebar__section">
            <div className="sidebar__label">선택 요소 편집</div>
            <div className="field-grid">
              <label>
                X
                <input type="range" min="0" max="90" value={selectedElement.x} onChange={(e) => updateNumber(e, 'x')} />
              </label>
              <label>
                Y
                <input type="range" min="0" max="90" value={selectedElement.y} onChange={(e) => updateNumber(e, 'y')} />
              </label>
              <label>
                너비
                <input type="range" min="6" max="95" value={selectedElement.width} onChange={(e) => updateNumber(e, 'width')} />
              </label>
              <label>
                높이
                <input type="range" min="6" max="95" value={selectedElement.height} onChange={(e) => updateNumber(e, 'height')} />
              </label>
              <label>
                회전
                <input type="range" min="-180" max="180" value={selectedElement.rotation} onChange={(e) => updateNumber(e, 'rotation')} />
              </label>
              <label>
                투명도
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.05"
                  value={selectedElement.opacity ?? 1}
                  onChange={(event) =>
                    selectedElement && onChangeElement(selectedElement.id, { opacity: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                그림자
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={selectedElement.shadowStrength ?? 0}
                  onChange={(event) =>
                    selectedElement && onChangeElement(selectedElement.id, { shadowStrength: Number(event.target.value) })
                  }
                />
              </label>
            </div>

            <div className="align-grid">
              <button type="button" onClick={() => onAlignSelected('left')}>좌측 정렬</button>
              <button type="button" onClick={() => onAlignSelected('center')}>중앙 정렬</button>
              <button type="button" onClick={() => onAlignSelected('right')}>우측 정렬</button>
              <button type="button" onClick={() => onAlignSelected('top')}>상단 정렬</button>
              <button type="button" onClick={() => onAlignSelected('middle')}>중간 정렬</button>
              <button type="button" onClick={() => onAlignSelected('bottom')}>하단 정렬</button>
            </div>

            {selectedElement.kind === 'text' && (
              <>
                <textarea
                  className="sidebar__textarea"
                  value={selectedElement.text ?? ''}
                  onChange={(event) => updateText(event, 'text')}
                />
                <div className="field-grid">
                  <label>
                    글씨 색상
                    <input
                      type="color"
                      value={selectedElement.color ?? '#ffffff'}
                      onChange={(event) =>
                        selectedElement && onChangeElement(selectedElement.id, { color: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    글씨체
                    <select
                      className="sidebar__select"
                      value={selectedElement.fontFamily ?? fontOptions[0].value}
                      onChange={(event) =>
                        selectedElement && onChangeElement(selectedElement.id, { fontFamily: event.target.value })
                      }
                    >
                      {fontOptions.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    글자 크기
                    <input
                      type="range"
                      min="12"
                      max="96"
                      value={selectedElement.fontSize ?? 24}
                      onChange={(event) => updateNumber(event, 'fontSize')}
                    />
                  </label>
                  <label>
                    자간
                    <input
                      type="range"
                      min="-2"
                      max="12"
                      value={selectedElement.letterSpacing ?? 0}
                      onChange={(event) => updateNumber(event, 'letterSpacing')}
                    />
                  </label>
                </div>
              </>
            )}
          </div>
        )}

        <div className="sidebar__section">
          <div className="sidebar__label">추천 사이드바 기능</div>
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
        </div>
      </div>
      <div className="sidebar__footer">
        {step === 'editor' ? (
          <button className="sidebar__footer-button" onClick={onSaveImage}>
            편집 이미지 저장
          </button>
        ) : (
          <button className="sidebar__footer-button" onClick={onGenerateBackgrounds}>
            Generate AI Drafts
          </button>
        )}
      </div>
    </aside>
  );
}
