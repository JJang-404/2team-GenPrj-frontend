import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { fetchBootstrap, generateBackgrounds } from './api/client';
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
  HomeProductInput,
  HomeProjectData,
  TemplateDefinition,
} from './types/editor';
import { cloneTemplateElements, updateElement } from './utils/editor';

const initialBootstrap: BootstrapResponse = {
  templates: [],
  sidebarRecommendations: [],
};

function isPrimaryImageElement(element: EditorElement) {
  if (element.kind !== 'image') return false;
  if (/(splash|badge)/i.test(element.id) || /(스플래시|배지)/.test(element.label)) return false;
  return /(product|object|drink|latte)/i.test(element.id) || /(객체|제품|라떼)/.test(element.label);
}

function isDecorativeElement(element: EditorElement) {
  if (element.kind !== 'image') return false;
  return /(splash|badge|decoration|ornament)/i.test(element.id) || /(스플래시|배지|장식)/.test(element.label);
}

function shouldShowDecorativeElement(
  element: EditorElement,
  templateId: string | null,
  backgroundMode: BackgroundMode,
  projectData: HomeProjectData | null
) {
  if (!isDecorativeElement(element)) return true;

  const activeProducts = projectData?.products.filter(
    (product) => product.image || product.name || product.price || product.description || product.isAiGen
  ) ?? [];
  const productCount = activeProducts.length;
  const concept = projectData?.options.concept ?? 'vivid';

  if (backgroundMode === 'ai-image') {
    return false;
  }

  if (templateId === 'template-dual-drink') {
    if (element.id.includes('splash')) {
      return productCount >= 2 && backgroundMode !== 'solid' && (concept === 'vivid' || concept === 'retro');
    }
    return false;
  }

  if (templateId === 'template-split-hero') {
    if (element.id === 'splash') {
      return productCount >= 1 && backgroundMode !== 'solid' && concept !== 'premium';
    }
    return false;
  }

  if (templateId === 'template-pop-board') {
    if (element.id === 'badge') {
      return backgroundMode !== 'solid';
    }
    return false;
  }

  return false;
}

function applyElementVisibilityRules(
  templateId: string | null,
  elements: EditorElement[],
  backgroundMode: BackgroundMode,
  projectData: HomeProjectData | null
) {
  return elements.map((element) => {
    if (!isDecorativeElement(element)) {
      return element;
    }

    const shouldShow = shouldShowDecorativeElement(element, templateId, backgroundMode, projectData);
    return { ...element, hidden: !shouldShow };
  });
}

function mapProjectDataToTemplate(template: TemplateDefinition, projectData: HomeProjectData | null) {
  const baseElements = cloneTemplateElements(template);
  if (!projectData) {
    return baseElements;
  }

  const activeProducts = projectData.products.filter(
    (product) => product.image || product.name || product.price || product.description || product.isAiGen
  );
  const firstProduct = activeProducts[0];
  const primaryImages = baseElements.filter(isPrimaryImageElement);
  const usedProductIds = new Set<number>();
  const extras: EditorElement[] = [];
  const matchedFields = {
    store: false,
    slogan: false,
    details: false,
    price: false,
  };
  const extraLayoutPresets: Record<string, Array<{ x: number; y: number; width: number; height: number; rotation: number }>> = {
    'template-split-hero': [
      { x: 58, y: 58, width: 18, height: 20, rotation: -10 },
      { x: 36, y: 10, width: 18, height: 18, rotation: 12 },
    ],
    'template-dual-drink': [
      { x: 36, y: 60, width: 22, height: 24, rotation: 0 },
    ],
    'template-pop-board': [
      { x: 18, y: 18, width: 18, height: 20, rotation: -12 },
      { x: 72, y: 58, width: 16, height: 18, rotation: 14 },
    ],
    'template-arch-premium': [
      { x: 14, y: 52, width: 18, height: 22, rotation: -8 },
      { x: 68, y: 55, width: 18, height: 22, rotation: 8 },
    ],
  };

  const mapped = baseElements.map((element) => {
    if (element.kind === 'image') {
      const imageIndex = primaryImages.findIndex((item) => item.id === element.id);
      const product = imageIndex >= 0 ? activeProducts[imageIndex] ?? null : null;

      if (product?.image) {
        usedProductIds.add(product.id);
        return { ...element, imageUrl: product.image, hidden: false };
      }
      if (imageIndex >= 0) {
        return { ...element, hidden: true };
      }
      return element;
    }

    const normalizedLabel = `${element.id} ${element.label}`.toLowerCase();

    if (/(store|brand|가게명|브랜드명)/.test(normalizedLabel) && projectData.storeName) {
      matchedFields.store = true;
      return { ...element, text: projectData.storeName, color: projectData.options.brandColor };
    }

    if (/(headline|title|타이틀)/.test(normalizedLabel)) {
      if (projectData.mainSlogan) {
        matchedFields.slogan = true;
        return { ...element, text: projectData.mainSlogan };
      }
      if (firstProduct?.name) {
        matchedFields.slogan = true;
        return { ...element, text: firstProduct.name.toUpperCase() };
      }
    }

    if (/(subcopy|광고 문구|보조 타이틀|copy)/.test(normalizedLabel)) {
      if (projectData.mainSlogan) {
        matchedFields.slogan = true;
        return { ...element, text: projectData.mainSlogan };
      }
      if (firstProduct?.name) {
        matchedFields.slogan = true;
        return { ...element, text: firstProduct.name };
      }
    }

    if (/(description|설명|footer|cta|하단 문구)/.test(normalizedLabel)) {
      if (projectData.details) {
        matchedFields.details = true;
        return { ...element, text: projectData.details };
      }
      if (firstProduct?.description) {
        matchedFields.details = true;
        return { ...element, text: firstProduct.description };
      }
    }

    if (/(price|가격)/.test(normalizedLabel) && firstProduct?.price) {
      matchedFields.price = true;
      return { ...element, text: firstProduct.price };
    }

    return element;
  });

  const remainingProducts = activeProducts.filter((product) => product.image && !usedProductIds.has(product.id));
  const extraPresets = extraLayoutPresets[template.id] ?? [];
  remainingProducts.forEach((product, index) => {
    const preset = extraPresets[index];
    if (!preset || !product.image) return;
    extras.push({
      id: `extra-product-${product.id}`,
      kind: 'image',
      label: `추가 제품 ${index + 1}`,
      x: preset.x,
      y: preset.y,
      width: preset.width,
      height: preset.height,
      rotation: preset.rotation,
      zIndex: 9 + index,
      imageUrl: product.image,
      imageFit: 'contain',
      opacity: 1,
    });

    if (product.showName || product.showPrice) {
      extras.push({
        id: `extra-product-caption-${product.id}`,
        kind: 'text',
        label: `추가 제품 캡션 ${index + 1}`,
        x: preset.x,
        y: Math.min(92, preset.y + preset.height + 1),
        width: Math.max(14, preset.width),
        height: 8,
        rotation: 0,
        zIndex: 12 + index,
        text: [product.showName ? product.name : '', product.showPrice ? product.price : ''].filter(Boolean).join('\n'),
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1.15,
        letterSpacing: 0,
        color: '#ffffff',
        align: 'center',
        opacity: 1,
      });
    }
  });

  const productSummaryText = activeProducts
    .map((product) => [product.showName ? product.name : '', product.showPrice ? product.price : ''].filter(Boolean).join(' '))
    .filter(Boolean)
    .join('  /  ');

  if (projectData.storeName && !matchedFields.store) {
    extras.push({
      id: 'fallback-store-name',
      kind: 'text',
      label: '보조 가게명',
      x: 8,
      y: 8,
      width: 44,
      height: 8,
      rotation: 0,
      zIndex: 13,
      text: projectData.storeName,
      fontSize: 20,
      fontWeight: 900,
      lineHeight: 1.1,
      letterSpacing: 1,
      color: projectData.options.brandColor,
      align: 'left',
      opacity: 1,
    });
  }

  if ((projectData.mainSlogan || firstProduct?.name) && !matchedFields.slogan) {
    extras.push({
      id: 'fallback-main-slogan',
      kind: 'text',
      label: '보조 메인 문구',
      x: 8,
      y: 18,
      width: 58,
      height: 12,
      rotation: 0,
      zIndex: 13,
      text: projectData.mainSlogan || firstProduct?.name || '',
      fontSize: 24,
      fontWeight: 900,
      lineHeight: 1.05,
      letterSpacing: 0,
      color: '#ffffff',
      align: 'left',
      opacity: 1,
    });
  }

  if (projectData.details && !matchedFields.details) {
    extras.push({
      id: 'fallback-details',
      kind: 'text',
      label: '보조 상세 문구',
      x: 8,
      y: 72,
      width: 38,
      height: 14,
      rotation: 0,
      zIndex: 13,
      text: projectData.details,
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: 0,
      color: '#f8fafc',
      align: 'left',
      opacity: 1,
    });
  }

  if ((firstProduct?.price || productSummaryText) && !matchedFields.price) {
    extras.push({
      id: 'fallback-product-summary',
      kind: 'text',
      label: '보조 가격 정보',
      x: 8,
      y: 88,
      width: 60,
      height: 7,
      rotation: 0,
      zIndex: 13,
      text: productSummaryText || firstProduct?.price || '',
      fontSize: 12,
      fontWeight: 800,
      lineHeight: 1.15,
      letterSpacing: 0,
      color: '#fde68a',
      align: 'left',
      opacity: 1,
    });
  }

  return [...mapped, ...extras];
}

function buildGuideSummary(projectData: HomeProjectData | null, template: TemplateDefinition | null) {
  if (!projectData && !template) return '';

  const productSummary = (projectData?.products ?? [])
    .filter((product) => product.image || product.name || product.price || product.description)
    .map((product: HomeProductInput, index) => {
      const bits = [product.name, product.price, product.description].filter(Boolean);
      return `product ${index + 1}: ${bits.join(', ') || 'image only'}`;
    })
    .join(' / ');

  return [
    `template: ${template?.name ?? ''}`,
    `store: ${projectData?.storeName ?? ''}`,
    `slogan: ${projectData?.mainSlogan ?? ''}`,
    `details: ${projectData?.details ?? ''}`,
    `concept: ${projectData?.options.concept ?? ''}`,
    `brand color: ${projectData?.options.brandColor ?? ''}`,
    productSummary,
  ]
    .filter(Boolean)
    .join(' | ');
}

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
  const [queuedBackgroundGeneration, setQueuedBackgroundGeneration] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

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
    setBackgroundMode('ai-image');
    const nextTemplate = bootstrap.templates[draftIndex] ?? selectedTemplate ?? bootstrap.templates[0] ?? null;
    if (nextTemplate) {
      setSelectedTemplateId(nextTemplate.id);
      setElements(mapProjectDataToTemplate(nextTemplate, data));
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

  const handleAlignSelected = (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedElementId) return;
    setElements((prev) =>
      prev.map((element) => {
        if (element.id !== selectedElementId) return element;
        if (direction === 'left') return { ...element, x: 0 };
        if (direction === 'center') return { ...element, x: Math.max(0, (100 - element.width) / 2) };
        if (direction === 'right') return { ...element, x: Math.max(0, 100 - element.width) };
        if (direction === 'top') return { ...element, y: 0 };
        if (direction === 'middle') return { ...element, y: Math.max(0, (100 - element.height) / 2) };
        return { ...element, y: Math.max(0, 100 - element.height) };
      })
    );
  };

  const handleBackToInitialPage = () => {
    setStep('home');
    setSelectedElementId(null);
  };

  const handleSaveImage = async () => {
    if (!exportRef.current) return;
    const previousSelectedId = selectedElementId;
    setSelectedElementId(null);

    try {
      await waitForImages(exportRef.current);
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${selectedTemplate?.id ?? 'edited-poster'}.png`;
      link.click();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '이미지 저장에 실패했습니다.');
    } finally {
      setSelectedElementId(previousSelectedId);
    }
  };

  if (step === 'home') {
    return <InitialHome onStart={handleStartFromHome} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        step={step}
        template={selectedTemplate}
        elements={renderElements}
        selectedElement={selectedElement}
        promptKo={promptKo}
        promptHint={promptHint}
        backgroundMode={backgroundMode}
        recommendations={bootstrap.sidebarRecommendations}
        onPromptChange={setPromptKo}
        onPromptHintChange={setPromptHint}
        onBackgroundModeChange={setBackgroundMode}
        onGenerateBackgrounds={handleGenerateBackgrounds}
        onBackToInitialPage={handleBackToInitialPage}
        onBackToBackgrounds={() => setStep('background')}
        onSelectElement={setSelectedElementId}
        onChangeElement={(id, patch) => setElements((prev) => updateElement(prev, id, patch))}
        onToggleElementHidden={(id) =>
          setElements((prev) => prev.map((element) => (element.id === id ? { ...element, hidden: !element.hidden } : element)))
        }
        onToggleElementLocked={(id) =>
          setElements((prev) => prev.map((element) => (element.id === id ? { ...element, locked: !element.locked } : element)))
        }
        onAlignSelected={handleAlignSelected}
        onSaveImage={handleSaveImage}
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
                <div className="workspace__main-preview" ref={exportRef}>
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
