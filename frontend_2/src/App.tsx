import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { fetchBootstrap, generateBackgrounds, removeBackgroundImage } from './api/client';
import BackgroundCard from './components/BackgroundCard';
import EditorCanvas from './components/EditorCanvas';
import InitialHome from './components/InitialHome';
import Sidebar from './components/Sidebar';
import TemplateCard from './components/TemplateCard';
import type {
  BackgroundCandidate,
  BackgroundMode,
  BootstrapResponse,
  EditorElement,
  EditorStep,
  HomeProjectData,
  TemplateDefinition,
} from './types/editor';
import { cloneTemplateElements, updateElement } from './utils/editor';
import {
  additionalInfoLabels,
  applyDraftLayoutVariant,
  applyElementVisibilityRules,
  buildGuideSummary,
  createAdditionalInfoElements,
  createCustomImageElement,
  createCustomTextElement,
  mapProjectDataToTemplate,
  updateProjectTextElements,
} from './utils/editorFlow';

const initialBootstrap: BootstrapResponse = {
  templates: [],
  sidebarRecommendations: [],
};


export default function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse>(initialBootstrap);
  const [step, setStep] = useState<EditorStep>('home');
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
  const captureRef = useRef<HTMLDivElement>(null);

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
    if (!queuedBackgroundGeneration || step === 'home') return;

    const timer = window.setTimeout(() => {
      void handleGenerateBackgrounds();
      setQueuedBackgroundGeneration(false);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [queuedBackgroundGeneration, step]);

  const waitForImages = async (root: HTMLElement) => {
    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          })
      )
    );
  };

  const handleStartFromHome = (data: HomeProjectData, draftIndex = 0) => {
    setProjectData(data);
    setAdditionalInfoVisibility({});
    setBackgroundMode('ai-image');
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
      await waitForImages(captureRef.current);
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: null,
        scale: 1.5,
        useCORS: true,
      });
      const guideImage = canvas.toDataURL('image/png');
      const guideSummary = buildGuideSummary(projectData, selectedTemplate);
      const promptParts = [
        `색상 테마: ${projectData?.options.brandColor ?? selectedTemplate?.accent ?? '#ffffff'}`,
        promptKo,
        promptHint.trim(),
        '객체와 텍스트 위치는 유지하고 배경과 조명만 생성하세요',
        '컵, 손, 사람, 과일, 로고, 추가 제품은 생성하지 마세요',
      ].filter(Boolean);

      const data = await generateBackgrounds({
        templateId: selectedTemplateId,
        backgroundMode,
        promptKo: promptParts.join('. '),
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
    setStep('home');
    setSelectedElementId(null);
  };

  const handleStoreNameChange = (value: string) => {
    setProjectData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, storeName: value };
      setElements((current) => updateProjectTextElements(current, next, 'storeName'));
      return next;
    });
  };

  const handleMainSloganChange = (value: string) => {
    setProjectData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, mainSlogan: value };
      setElements((current) => updateProjectTextElements(current, next, 'mainSlogan'));
      return next;
    });
  };

  const handleGenerateSlogan = () => {
    const firstNamedProduct = projectData?.products.find((product) => product.name.trim());
    const store = projectData?.storeName.trim() || '우리 가게';
    const product = firstNamedProduct?.name.trim() || '시그니처 메뉴';
    const candidates = [
      `${store}의 ${product}, 지금 가장 선명한 한 잔`,
      `${product}의 매력을 ${store} 감성으로 완성하다`,
      `${store}에서 만나는 오늘의 ${product}`,
      `${product} 한 잔으로 기억되는 ${store}`,
    ];
    const nextSlogan = candidates[Math.floor(Math.random() * candidates.length)];
    handleMainSloganChange(nextSlogan);
  };

  const handleToggleInfoItem = (label: string) => {
    setAdditionalInfoVisibility((prev) => {
      const nextVisible = !prev[label];
      const nextInfoElements = createAdditionalInfoElements(projectData, label);
      const nextIds = new Set(nextInfoElements.map((element) => element.id));

      setElements((current) => {
        const withoutCurrentInfo = current.filter(
          (element) => element.label !== label && element.label !== `${label} 아이콘`
        );

        if (!nextVisible) {
          return withoutCurrentInfo;
        }

        return [...withoutCurrentInfo.filter((element) => !nextIds.has(element.id)), ...nextInfoElements];
      });

      return { ...prev, [label]: nextVisible };
    });
  };

  const handleReplaceSelectedImage = (file: File) => {
    if (!selectedElement || selectedElement.kind !== 'image') return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onChangeSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
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

  const handleAddImageElement = (file: File, label: string) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const nextElement = createCustomImageElement(reader.result as string, label);
      setElements((prev) => [...prev, nextElement]);
      setSelectedElementId(nextElement.id);
    };
    reader.readAsDataURL(file);
  };

  if (step === 'home') {
    return <InitialHome onStart={handleStartFromHome} />;
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
                      elements={applyElementVisibilityRules(template.id, mapProjectDataToTemplate(template, projectData), backgroundMode, projectData)}
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
