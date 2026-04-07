import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchBootstrap, generateBackgrounds, removeBackgroundImage } from './api/client';
import BackgroundCard from './components/BackgroundCard';
import EditorCanvas from './components/EditorCanvas';
import Sidebar from './components/Sidebar';
import TemplateCard from './components/TemplateCard';
import type { BackgroundCandidate, BootstrapResponse } from './types/api';
import type { BackgroundMode, EditorElement, EditorStep, TemplateDefinition } from './types/editor-core';
import type { HomeProjectData } from './types/home';
import { cloneTemplateElements, updateElement } from './utils/editor';
import {
  additionalInfoLabels,
  applyDraftLayoutVariant,
  applyElementVisibilityRules,
  buildGuideSummary,
  createCustomImageElement,
  createCustomTextElement,
  mapProjectDataToTemplate,
} from './utils/editorFlow';
import { captureElementAsDataUrl } from './utils/canvas';
import { readFileAsDataUrl } from './utils/file';
import {
  applyProjectTextField,
  buildBackgroundPrompt,
  createAutoSlogan,
  getTemplatePreviewElements,
  toggleAdditionalInfoElements,
} from './utils/projectEditor';
import { readEditingBridgePayload, readEditingBridgePayloadByToken } from './utils/editingBridge';
import { buildInitialBackgroundCandidate } from './utils/initialBackground';

const initialBootstrap: BootstrapResponse = {
  templates: [],
  sidebarRecommendations: [],
};

export default function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse>(initialBootstrap);
  const [step, setStep] = useState<EditorStep>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('ai-image');
  const [promptKo, setPromptKo] = useState('제품과 텍스트는 그대로 두고, 광고 촬영용 배경과 조명만 만들어줘. 객체는 절대 추가하지 마세요.');
  const [promptHint, setPromptHint] = useState('');
  const [backgroundCandidates, setBackgroundCandidates] = useState<BackgroundCandidate[]>([]);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<HomeProjectData | null>(null);
  const [additionalInfoVisibility, setAdditionalInfoVisibility] = useState<Record<string, boolean>>({});
  const [queuedBackgroundGeneration, setQueuedBackgroundGeneration] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [bridgeResolved, setBridgeResolved] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const getInitPageUrl = () => import.meta.env.VITE_INITPAGE_URL ?? 'http://localhost:5173';

  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchBootstrap();
        setBootstrap(data);
        if (data.templates[0]) {
          setSelectedTemplateId(data.templates[0].id);
          setPromptKo(data.templates[0].defaultPromptKo);
          setElements(cloneTemplateElements(data.templates[0]));
        }
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : '초기 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const selectedTemplate = useMemo(
    () => bootstrap.templates.find((template) => template.id === selectedTemplateId) ?? null,
    [bootstrap.templates, selectedTemplateId]
  );

  const selectedBackground = useMemo(
    () => backgroundCandidates.find((background) => background.id === selectedBackgroundId) ?? null,
    [backgroundCandidates, selectedBackgroundId]
  );

  const renderElements = useMemo(
    () => applyElementVisibilityRules(selectedTemplateId, elements, backgroundMode, projectData),
    [selectedTemplateId, elements, backgroundMode, projectData]
  );

  const selectedElement = useMemo(
    () => renderElements.find((element) => element.id === selectedElementId) ?? null,
    [renderElements, selectedElementId]
  );

  useEffect(() => {
    if (!queuedBackgroundGeneration || !projectData) return;

    const timer = window.setTimeout(() => {
      void handleGenerateBackgrounds();
      setQueuedBackgroundGeneration(false);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [queuedBackgroundGeneration, step]);

  useEffect(() => {
    if (loading || bootstrap.templates.length === 0 || bridgeResolved) return;

    const resolveBridge = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('bridgeToken');

        if (token) {
          const bridged = await readEditingBridgePayloadByToken(token);
          window.history.replaceState({}, document.title, window.location.pathname);
          handleStartFromHome(bridged.projectData, bridged.draftIndex ?? 0);
          return;
        }

        const bridged = readEditingBridgePayload();
        if (bridged) {
          handleStartFromHome(bridged.projectData, bridged.draftIndex ?? 0);
          return;
        }

        window.location.replace(getInitPageUrl());
      } catch (bridgeError) {
        setError(bridgeError instanceof Error ? bridgeError.message : '초기 연결 데이터 복원에 실패했습니다.');
      } finally {
        setBridgeResolved(true);
      }
    };

    void resolveBridge();
  }, [loading, bootstrap.templates.length, bridgeResolved]);

  const handleStartFromHome = (data: HomeProjectData, draftIndex = 0) => {
    setProjectData(data);
    setAdditionalInfoVisibility({});
    const nextBackgroundMode =
      data.options.concept === 'solid' ||
      data.options.concept === 'gradient' ||
      data.options.concept === 'pastel' ||
      data.options.concept === 'ai-image'
        ? data.options.concept
        : 'ai-image';
    setBackgroundMode(nextBackgroundMode);
    const initialBackground = buildInitialBackgroundCandidate(data);
    setBackgroundCandidates([initialBackground]);
    setSelectedBackgroundId(initialBackground.id);
    const nextTemplate = bootstrap.templates[draftIndex] ?? selectedTemplate ?? bootstrap.templates[0] ?? null;
    if (nextTemplate) {
      setSelectedTemplateId(nextTemplate.id);
      setElements(applyDraftLayoutVariant(mapProjectDataToTemplate(nextTemplate, data), draftIndex));
      setPromptKo(data.details ? `${nextTemplate.defaultPromptKo}, ${data.details}` : nextTemplate.defaultPromptKo);
    }
    setStep(nextTemplate ? 'background' : 'template');
    setQueuedBackgroundGeneration(Boolean(nextTemplate));
    setSelectedElementId(null);
  };

  const handleTemplateSelect = (template: TemplateDefinition) => {
    setSelectedTemplateId(template.id);
    setElements(mapProjectDataToTemplate(template, projectData));
    setSelectedElementId(null);
    setPromptKo(
      projectData?.details
        ? `${template.defaultPromptKo}, ${projectData.details}`
        : template.defaultPromptKo
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
      if (step === 'template') {
        setStep('background');
      }
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : '이미지 기반 배경 생성에 실패했습니다.');
    } finally {
      setSelectedElementId(previousSelectedId);
      setGenerating(false);
    }
  };

  const handleSelectBackground = (backgroundId: string) => {
    setSelectedBackgroundId(backgroundId);
    setStep('editor');
  };

  const handleBackToInitialPage = () => {
    window.location.href = getInitPageUrl();
  };

  const handleStoreNameChange = (value: string) => {
    setProjectData((prev) => {
      if (!prev) return prev;
      setElements((current) => {
        const { nextElements } = applyProjectTextField(current, prev, 'storeName', value);
        return nextElements;
      });
      return { ...prev, storeName: value };
    });
  };

  const handleMainSloganChange = (value: string) => {
    setProjectData((prev) => {
      if (!prev) return prev;
      setElements((current) => {
        const { nextElements } = applyProjectTextField(current, prev, 'mainSlogan', value);
        return nextElements;
      });
      return { ...prev, mainSlogan: value };
    });
  };

  const handleGenerateSlogan = () => {
    handleMainSloganChange(createAutoSlogan(projectData));
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
      onChangeSelectedImage(imageUrl);
    } catch (replaceError) {
      setError(replaceError instanceof Error ? replaceError.message : '이미지 변경에 실패했습니다.');
    }
  };

  const onChangeSelectedImage = (imageUrl: string) => {
    if (!selectedElement || selectedElement.kind !== 'image') return;
    setElements((prev) => updateElement(prev, selectedElement.id, { imageUrl, hidden: false }));
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

  if (!bridgeResolved) {
    return <div className="empty-panel">초기 연결 데이터를 확인하는 중입니다.</div>;
  }

  if (!projectData) {
    return <div className="empty-panel">initPage로 이동 중입니다.</div>;
  }

  return (
    <div className="app-shell">
      <Sidebar
        expanded={sidebarExpanded}
        onToggleExpanded={() => setSidebarExpanded((prev) => !prev)}
        selectedElement={selectedElement}
        infoItems={additionalInfoLabels.map((label) => ({ label, visible: additionalInfoVisibility[label] ?? false }))}
        storeName={projectData?.storeName ?? ''}
        mainSlogan={projectData?.mainSlogan ?? ''}
        promptHint={promptHint}
        backgroundMode={backgroundMode}
        recommendations={bootstrap.sidebarRecommendations}
        onPromptHintChange={setPromptHint}
        onStoreNameChange={handleStoreNameChange}
        onMainSloganChange={handleMainSloganChange}
        onGenerateSlogan={handleGenerateSlogan}
        onToggleInfoItem={handleToggleInfoItem}
        onAddTextElement={handleAddTextElement}
        onAddImageElement={handleAddImageElement}
        onBackgroundModeChange={setBackgroundMode}
        onGenerateBackgrounds={handleGenerateBackgrounds}
        onBackToInitialPage={handleBackToInitialPage}
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

        {loading ? (
          <div className="empty-panel">초기 구성을 불러오는 중입니다.</div>
        ) : (
          <>
            {step === 'template' && (
              <section className="workspace__section">
                <div className="choice-grid choice-grid--templates">
                  {bootstrap.templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      elements={getTemplatePreviewElements(
                        template,
                        projectData,
                        backgroundMode,
                        applyElementVisibilityRules,
                        mapProjectDataToTemplate
                      )}
                      selected={template.id === selectedTemplateId}
                      onSelect={() => handleTemplateSelect(template)}
                    />
                  ))}
                </div>
                <div className="callout">
                  <strong>가이드 생성 방식</strong>
                  <span>현재 배치된 객체와 글자 구조를 투명 PNG로 캡처해 배경 생성용 guide image로 전달합니다.</span>
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
        )}
      </main>
    </div>
  );
}
