import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchBootstrap, generateBackgrounds, removeBackgroundImage } from '../../api/client';
import BackgroundCard from '../../components/BackgroundCard';
import EditorCanvas from '../../components/EditorCanvas';
import Sidebar from '../../components/Sidebar';
import TemplateCard from '../../components/TemplateCard';
import type { BackgroundCandidate, BootstrapResponse } from '../../types/api';
import type { BackgroundMode, EditorElement, EditorStep, TemplateDefinition } from '../../types/editor-core';
import type { HomeProjectData } from '../../types/home';
import { updateElement } from '../../utils/editor';
import {
  additionalInfoLabels,
  applyDraftLayoutVariant,
  applyElementVisibilityRules,
  buildGuideSummary,
  createCustomImageElement,
  createCustomTextElement,
  mapProjectDataToTemplate,
} from '../../utils/editorFlow';
import { captureElementAsDataUrl } from '../../utils/canvas';
import { readFileAsDataUrl } from '../../utils/file';
import {
  applyProjectTextField,
  buildBackgroundPrompt,
  createAutoSlogan,
  getTemplatePreviewElements,
  toggleAdditionalInfoElements,
} from '../../utils/projectEditor';
import { buildInitialBackgroundCandidate } from '../../utils/initialBackground';
import { parseBackgroundToken, extractHexColor } from '../../components/sidebar/backgroundTokens';

/**
 * 사이드바에서 선택한 모드/색상을 즉시 캔버스에 반영하는 미리보기 배경을 생성합니다.
 * 백엔드 API 호출 없이 CSS만으로 즉시 생성됩니다.
 */
function buildLivePreviewBackground(mode: BackgroundMode, promptHint: string): BackgroundCandidate {
  let cssBackground: string;

  if (mode === 'solid') {
    const parsed = parseBackgroundToken(promptHint, 'SOLID');
    const color = extractHexColor(parsed?.[0] ?? '', '#60a5fa');
    cssBackground = color;
  } else if (mode === 'gradient') {
    const parsed = parseBackgroundToken(promptHint, 'GRADIENT');
    const colors = (parsed ?? ['#93c5fd', '#1d4ed8']).map((c) => extractHexColor(c, '#93c5fd'));
    cssBackground = `linear-gradient(135deg, ${colors.join(', ')})`;
  } else if (mode === 'pastel') {
    const parsed = parseBackgroundToken(promptHint, 'MULTI');
    const colors = (parsed ?? ['#c4b5fd', '#93c5fd']).map((c) => extractHexColor(c, '#93c5fd'));
    if (colors.length === 2) {
      cssBackground = `linear-gradient(90deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
    } else {
      const step = 100 / colors.length;
      const stops = colors
        .flatMap((c, i) => [`${c} ${Math.round(i * step)}%`, `${c} ${Math.round((i + 1) * step)}%`])
        .join(', ');
      cssBackground = `linear-gradient(90deg, ${stops})`;
    }
  } else {
    cssBackground = 'linear-gradient(180deg, #111827 0%, #0f172a 100%)';
  }

  return {
    id: 'live-preview',
    name: '색상 미리보기',
    mode,
    cssBackground,
    note: '사이드바에서 선택한 색상 즉시 미리보기',
    translatedPrompt: '',
    negativePrompt: '',
  };
}

// ── 폴백 템플릿 (백엔드 없을 때 사용) ────────────────────────────────────────
const FALLBACK_TEMPLATE: TemplateDefinition = {
  id: 'template-fallback',
  name: '기본 템플릿',
  headline: '메인 문구',
  description: '설명 문구',
  priceText: '₩0',
  storeName: '가게 이름',
  accent: '#FF4757',
  previewNote: '미리보기',
  defaultPromptKo: '세련된 광고 배경을 만들어주세요.',
  elements: [
    { id: 'headline-fb', kind: 'text', label: '메인 타이틀', x: 8, y: 15, width: 82, height: 12, rotation: 0, zIndex: 10, text: '메인 문구', fontSize: 28, fontWeight: 900, lineHeight: 1.1, letterSpacing: 0, color: '#ffffff', align: 'left', opacity: 1 },
    { id: 'store-fb', kind: 'text', label: '가게명', x: 8, y: 88, width: 44, height: 8, rotation: 0, zIndex: 11, text: '가게 이름', fontSize: 16, fontWeight: 800, lineHeight: 1.1, letterSpacing: 0, color: '#ffffff', align: 'left', opacity: 1 },
    { id: 'product-img-fb-1', kind: 'image', label: '제품 이미지 1', x: 25, y: 26, width: 50, height: 50, rotation: 0, zIndex: 9, imageUrl: undefined, imageFit: 'contain', opacity: 1, hidden: true },
    { id: 'product-img-fb-2', kind: 'image', label: '제품 이미지 2', x: 4, y: 32, width: 28, height: 32, rotation: -8, zIndex: 8, imageUrl: undefined, imageFit: 'contain', opacity: 1, hidden: true },
    { id: 'product-img-fb-3', kind: 'image', label: '제품 이미지 3', x: 68, y: 32, width: 26, height: 30, rotation: 8, zIndex: 8, imageUrl: undefined, imageFit: 'contain', opacity: 1, hidden: true },
  ],
};

const FALLBACK_BOOTSTRAP: BootstrapResponse = {
  templates: [FALLBACK_TEMPLATE],
  sidebarRecommendations: [{ title: '추천 스타일', items: ['모던', '비비드', '프리미엄'] }],
};

interface Props {
  projectData: HomeProjectData;
  draftIndex: number;
  onBackToInit: () => void;
}

export default function EditorPage({ projectData, draftIndex, onBackToInit }: Props) {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse>(FALLBACK_BOOTSTRAP);
  const [step, setStep] = useState<EditorStep>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('ai-image');
  const [promptKo, setPromptKo] = useState('제품과 텍스트는 그대로 두고, 광고 촬영용 배경과 조명만 만들어줘. 객체는 절대 추가하지 마세요.');
  const [promptHint, setPromptHint] = useState('');
  const [backgroundCandidates, setBackgroundCandidates] = useState<BackgroundCandidate[]>([]);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [additionalInfoVisibility, setAdditionalInfoVisibility] = useState<Record<string, boolean>>({});
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  // ── 초기화: 백엔드 bootstrap 시도 → 실패 시 폴백 ────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchBootstrap();
        setBootstrap(data);
      } catch {
        // 백엔드 없음 — FALLBACK_BOOTSTRAP 유지
      }
    };
    void run();
  }, []);

  // ── 모드/색상 변경 시 즉시 캔버스 미리보기 업데이트 ─────────────────────
  // solid / gradient / pastel 은 CSS만으로 즉시 생성 가능.
  // ai-image 는 백엔드 생성 결과를 유지(덮어쓰지 않음).
  useEffect(() => {
    if (backgroundMode === 'ai-image') return;
    // 백엔드가 생성한 실제 후보가 이미 선택되어 있으면 미리보기로 교체
    const preview = buildLivePreviewBackground(backgroundMode, promptHint);
    setBackgroundCandidates((prev) => {
      // 기존 live-preview 교체, 백엔드 생성 후보는 유지
      const others = prev.filter((b) => b.id !== 'live-preview');
      return [preview, ...others];
    });
    setSelectedBackgroundId('live-preview');
  }, [backgroundMode, promptHint]);

  // ── projectData + draftIndex를 받아 에디터 상태 초기화 ──────────────────
  useEffect(() => {
    const templates = bootstrap.templates;
    if (templates.length === 0) return;

    const nextBackgroundMode: BackgroundMode =
      projectData.options.concept === 'solid' ||
      projectData.options.concept === 'gradient' ||
      projectData.options.concept === 'pastel' ||
      projectData.options.concept === 'ai-image'
        ? (projectData.options.concept as BackgroundMode)
        : 'ai-image';
    setBackgroundMode(nextBackgroundMode);

    // 1단계에서 선택한 색상을 promptHint 토큰으로 변환 →
    // live-preview useEffect가 올바른 초기 색상을 읽을 수 있도록 동기화
    const initColors = projectData.options.colors ?? [];
    if (nextBackgroundMode === 'solid') {
      const c = initColors[0] ?? projectData.options.brandColor ?? '#60a5fa';
      setPromptHint(`BG_SOLID(${c})`);
    } else if (nextBackgroundMode === 'gradient') {
      const cols = initColors.length >= 2 ? initColors : ['#93c5fd', '#1d4ed8'];
      setPromptHint(`BG_GRADIENT(${cols.join(',')})`);
    } else if (nextBackgroundMode === 'pastel') {
      const cols = initColors.length >= 2 ? initColors : ['#c4b5fd', '#93c5fd'];
      setPromptHint(`BG_MULTI(${cols.join(',')})`);
    } else {
      setPromptHint('');
    }

    const initialBackground = buildInitialBackgroundCandidate(projectData);
    setBackgroundCandidates([initialBackground]);
    setSelectedBackgroundId(initialBackground.id);

    const nextTemplate = templates[draftIndex] ?? templates[0];
    setSelectedTemplateId(nextTemplate.id);
    setElements(applyDraftLayoutVariant(mapProjectDataToTemplate(nextTemplate, projectData), draftIndex));
    setPromptKo(
      projectData.details
        ? `${nextTemplate.defaultPromptKo}, ${projectData.details}`
        : nextTemplate.defaultPromptKo,
    );
    setStep('background');
    setAdditionalInfoVisibility({});
    setSelectedElementId(null);
  }, [bootstrap.templates, projectData, draftIndex]);

  const selectedTemplate = useMemo(
    () => bootstrap.templates.find((t) => t.id === selectedTemplateId) ?? null,
    [bootstrap.templates, selectedTemplateId],
  );

  const selectedBackground = useMemo(
    () => backgroundCandidates.find((b) => b.id === selectedBackgroundId) ?? null,
    [backgroundCandidates, selectedBackgroundId],
  );

  const renderElements = useMemo(
    () => applyElementVisibilityRules(selectedTemplateId, elements, backgroundMode, projectData),
    [selectedTemplateId, elements, backgroundMode, projectData],
  );

  const selectedElement = useMemo(
    () => renderElements.find((el) => el.id === selectedElementId) ?? null,
    [renderElements, selectedElementId],
  );

  const handleTemplateSelect = (template: TemplateDefinition) => {
    setSelectedTemplateId(template.id);
    setElements(mapProjectDataToTemplate(template, projectData));
    setSelectedElementId(null);
    setPromptKo(
      projectData?.details
        ? `${template.defaultPromptKo}, ${projectData.details}`
        : template.defaultPromptKo,
    );
    setPromptHint('');
  };

  const handleGenerateBackgrounds = async () => {
    if (!selectedTemplateId || !captureRef.current) return;
    setGenerating(true);
    setError(null);
    const previousSelectedId = selectedElementId;
    setSelectedElementId(null);
    try {
      const guideImage = await captureElementAsDataUrl(captureRef.current, 1.5);
      const guideSummary = buildGuideSummary(projectData, selectedTemplate);
      const data = await generateBackgrounds({
        templateId: selectedTemplateId,
        backgroundMode,
        promptKo: buildBackgroundPrompt(projectData, selectedTemplate, promptKo, promptHint),
        guideImage,
        guideSummary,
      });
      setBackgroundCandidates(data.candidates);
      setSelectedBackgroundId(data.candidates[0]?.id ?? null);
      if (step === 'template') setStep('background');
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : '배경 생성에 실패했습니다.');
    } finally {
      setSelectedElementId(previousSelectedId);
      setGenerating(false);
    }
  };

  const handleSelectBackground = (backgroundId: string) => {
    setSelectedBackgroundId(backgroundId);
    setStep('editor');
  };

  const handleStoreNameChange = (value: string) => {
    setElements((current) => {
      const { nextElements } = applyProjectTextField(current, projectData, 'storeName', value);
      return nextElements;
    });
  };

  const handleMainSloganChange = (value: string) => {
    setElements((current) => {
      const { nextElements } = applyProjectTextField(current, projectData, 'mainSlogan', value);
      return nextElements;
    });
  };

  const handleToggleInfoItem = (label: string) => {
    setAdditionalInfoVisibility((prev) => {
      const nextVisible = !prev[label];
      setElements((current) => toggleAdditionalInfoElements(current, projectData, label, nextVisible));
      return { ...prev, [label]: nextVisible };
    });
  };

  const handleReplaceSelectedImage = async (file: File) => {
    if (!selectedElement || selectedElement.kind !== 'image') return;
    try {
      const imageUrl = await readFileAsDataUrl(file);
      setElements((prev) => updateElement(prev, selectedElement.id, { imageUrl, hidden: false }));
    } catch (replaceError) {
      setError(replaceError instanceof Error ? replaceError.message : '이미지 변경에 실패했습니다.');
    }
  };

  const handleRemoveSelectedImageBackground = async () => {
    if (!selectedElement || selectedElement.kind !== 'image' || !selectedElement.imageUrl) return;
    try {
      const result = await removeBackgroundImage(selectedElement.imageUrl);
      setElements((prev) => updateElement(prev, selectedElement.id, { imageUrl: result.imageDataUrl, hidden: false }));
    } catch (backgroundError) {
      setError(backgroundError instanceof Error ? backgroundError.message : '배경 제거에 실패했습니다.');
    }
  };

  const handleAddTextElement = (label: string) => {
    const nextElement = createCustomTextElement(label);
    setElements((prev) => [...prev, nextElement]);
    setSelectedElementId(nextElement.id);
  };

  const handleAddImageElement = async (file: File, label: string) => {
    try {
      const imageUrl = await readFileAsDataUrl(file);
      const nextElement = createCustomImageElement(imageUrl, label);
      setElements((prev) => [...prev, nextElement]);
      setSelectedElementId(nextElement.id);
    } catch (addImageError) {
      setError(addImageError instanceof Error ? addImageError.message : '이미지 요소 추가에 실패했습니다.');
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        expanded={sidebarExpanded}
        onToggleExpanded={() => setSidebarExpanded((prev) => !prev)}
        selectedElement={selectedElement}
        infoItems={additionalInfoLabels.map((label) => ({ label, visible: additionalInfoVisibility[label] ?? false }))}
        storeName={projectData.storeName}
        mainSlogan={projectData.mainSlogan}
        promptHint={promptHint}
        backgroundMode={backgroundMode}
        recommendations={bootstrap.sidebarRecommendations}
        onPromptHintChange={setPromptHint}
        onStoreNameChange={handleStoreNameChange}
        onMainSloganChange={handleMainSloganChange}
        onGenerateSlogan={() => handleMainSloganChange(createAutoSlogan(projectData))}
        onToggleInfoItem={handleToggleInfoItem}
        onAddTextElement={handleAddTextElement}
        onAddImageElement={handleAddImageElement}
        onBackgroundModeChange={setBackgroundMode}
        onGenerateBackgrounds={handleGenerateBackgrounds}
        onBackToInitialPage={onBackToInit}
        onBackToBackgrounds={() => setStep('background')}
        onChangeElement={(id, patch) => setElements((prev) => updateElement(prev, id, patch))}
        onReplaceSelectedImage={handleReplaceSelectedImage}
        onRemoveSelectedImageBackground={handleRemoveSelectedImageBackground}
      />

      <main className="workspace">
        <div className="workspace__header">
          <div>
            <span className="workspace__eyebrow">Layout Guided Background Flow</span>
            <h2>
              {step === 'template' && '1단계. 구조가 다른 템플릿 4종 선택'}
              {step === 'background' && '2단계. 배치에 맞춘 AI 배경 후보'}
              {step === 'editor' && '3단계. 객체 자유 편집'}
            </h2>
          </div>
          <div className="status-row">
            <span>{backgroundMode}</span>
            {generating && <span>가이드 이미지로 배경 생성 중...</span>}
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="capture-surface" aria-hidden="true">
          <div ref={captureRef}>
            <EditorCanvas
              elements={renderElements}
              background={null}
              selectedElementId={null}
              onSelect={() => {}}
              onChangeElement={(_id, _patch) => {}}
              captureMode
            />
          </div>
        </div>

        <>
          {step === 'template' && (
            <section className="workspace__section">
              <div className="choice-grid choice-grid--templates">
                {bootstrap.templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    elements={getTemplatePreviewElements(
                      template, projectData, backgroundMode,
                      applyElementVisibilityRules, mapProjectDataToTemplate,
                    )}
                    selected={template.id === selectedTemplateId}
                    onSelect={() => handleTemplateSelect(template)}
                  />
                ))}
              </div>
            </section>
          )}

          {(step === 'background' || step === 'editor') && (
            <section className="workspace__section workspace__section--split">
              <div className="workspace__main-preview">
                <EditorCanvas
                  elements={renderElements}
                  background={selectedBackground}
                  selectedElementId={selectedElementId}
                  onSelect={setSelectedElementId}
                  onChangeElement={(id, patch) => setElements((prev) => updateElement(prev, id, patch))}
                />
              </div>
              {step === 'background' && (
                <div className="workspace__choices">
                  <div className="choice-grid choice-grid--compact">
                    {backgroundCandidates.map((background) => (
                      <BackgroundCard
                        key={background.id}
                        background={background}
                        elements={renderElements}
                        selected={background.id === selectedBackgroundId}
                        onSelect={() => handleSelectBackground(background.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      </main>
    </div>
  );
}
