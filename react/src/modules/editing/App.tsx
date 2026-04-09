import { callApi } from "../../server/api/callApi";
import { adverApi } from "../../server/api/adverApi";
import { storeInfo } from "../../server/api/storeInfo";
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchBootstrap, generateBackgrounds } from './api/client';
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
  applyDraftTypographyVariant,
  applyElementVisibilityRules,
  buildGuideSummary,
  createCustomImageElement,
  createCustomTextElement,
  mapProjectDataToTemplate,
} from './utils/editorFlow';
import { captureElementAsDataUrl } from './utils/canvas';
import { readFileAsDataUrl } from './utils/file';
import { removeBgPipeline } from '../initPage/utils/removeBackground';
import {
  applyProjectTextField,
  buildBackgroundPrompt,
  createAutoSlogan,
  getTemplatePreviewElements,
  toggleAdditionalInfoElements,
} from './utils/projectEditor';
import { readEditingBridgePayload } from './utils/editingBridge';
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
  const [promptKo, setPromptKo] = useState('');
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

  const getInitPageUrl = () => import.meta.env.VITE_INITPAGE_URL ?? '/';

  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchBootstrap();
        setBootstrap(data);
        if (data.templates[0]) {
          setSelectedTemplateId(data.templates[0].id);
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

  /**
   * 단색/그라데이션/다중색 모드에서 모드 버튼 클릭 또는 색상 변경 시
   * 별도 '이미지 생성' 버튼 없이 캔버스 배경을 즉시 업데이트합니다.
   */
  useEffect(() => {
    if (!projectData || backgroundMode === 'ai-image') return;
    const preview = buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint);
    setBackgroundCandidates((prev) => {
      const rest = prev.filter((b) => b.id !== preview.id);
      return [preview, ...rest];
    });
    setSelectedBackgroundId(preview.id);
  }, [backgroundMode, promptHint, projectData]);

  useEffect(() => {
    if (loading || bridgeResolved) return;

    const resolveBridge = async () => {
      try {
        const bridged = await readEditingBridgePayload();
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
  }, [loading, bridgeResolved]);

  /** initPage 옵션에서 편집 사이드바의 초기 색상 토큰을 생성합니다. */
  const buildInitPromptHint = (options: HomeProjectData['options']): string => {
    const start = options.startColor ?? '#FF4757';
    const end = options.endColor ?? '#4A90E2';
    const concept = options.concept ?? '';
    if (concept === 'solid') return `BG_SOLID(${start})`;
    if (concept === 'gradient') return `BG_GRADIENT(${start},${end})`;
    if (concept === 'pastel') return `BG_MULTI(${start},${end})`;
    return '';
  };

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
    // initPage 색상을 사이드바 컬러 피커에 반영
    const initPromptHint = buildInitPromptHint(data.options);
    setPromptHint(initPromptHint);
    const initialBackground = buildInitialBackgroundCandidate(data, nextBackgroundMode, initPromptHint);
    setBackgroundCandidates([initialBackground]);
    setSelectedBackgroundId(initialBackground.id);
    const nextTemplate = bootstrap.templates[draftIndex] ?? selectedTemplate ?? bootstrap.templates[0] ?? null;
    if (nextTemplate) {
      setSelectedTemplateId(nextTemplate.id);
      setElements(
        applyDraftTypographyVariant(
          applyDraftLayoutVariant(mapProjectDataToTemplate(nextTemplate, data), draftIndex),
          data
        )
      );
    }
    setStep(nextTemplate ? 'background' : 'template');
    setQueuedBackgroundGeneration(false);
    setSelectedElementId(null);
  };

  const handleTemplateSelect = (template: TemplateDefinition) => {
    setSelectedTemplateId(template.id);
    const mapped = mapProjectDataToTemplate(template, projectData);
    const withLayout = applyDraftLayoutVariant(mapped, projectData?.options.draftIndex ?? 0);
    setElements(applyDraftTypographyVariant(withLayout, projectData));
    setSelectedElementId(null);
    setPromptHint('');
  };

  const handleGenerateBackgrounds = async () => {
    if (!selectedTemplateId || !projectData) return;
    
    setGenerating(true);
    setError(null);

    // 편집 중이던 선택 박스 해제
    const previousSelectedId = selectedElementId;
    setSelectedElementId(null);

    try {
      // [Case A] 단색/그라데이션/다중색 모드 (로컬 생성)
      if (backgroundMode !== 'ai-image') {
        const localResult = await generateBackgrounds({
          templateId: selectedTemplateId,
          backgroundMode,
          promptKo: buildBackgroundPrompt(projectData, selectedTemplate, promptKo, promptHint),
          guideImage: '',
          guideSummary: '',
        });
        
        const initialBackground = projectData
          ? buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint)
          : null;

        if (backgroundMode === 'solid') {
          if (initialBackground) {
            setBackgroundCandidates([initialBackground]);
            setSelectedBackgroundId(initialBackground.id);
          }
          setStep('editor');
          return;
        }

        const mergedCandidates = initialBackground
          ? [initialBackground, ...localResult.candidates.filter((c) => c.id !== initialBackground.id)]
          : localResult.candidates;

        
        setBackgroundCandidates(mergedCandidates);
        setSelectedBackgroundId((prev) => {
          if (prev === initialBackground?.id) return prev;
          return mergedCandidates[0]?.id ?? null;
        });
        setStep('background');
        return;
      }

      // [Case B] AI 이미지 생성 모드 (서버 호출 + 4개 확장)
      console.log('[Editing] AI 이미지 생성 모드 시작 (4개 병렬 요청)');

      // 4가지 스타일 정의
      const variantStyles = [
        '분위기 고급지게',
        '빈티지',
        '세련되게',
        '카툰화'
      ];

      //  4개의 생성 태스크를 병렬로 준비합니다.
      const generateTasks = variantStyles.map((style, idx) => {
        const sequence = idx + 1;
        console.log(`[Editing] 배경 요청 #${sequence} 준비 (스타일: ${style})...`);
        
        // 사용자가 입력한 프롬프트에 스타일 키워드를 조합
        const combinedPrompt = promptKo.trim() 
          ? `${promptKo}, ${style}` 
          : style;

        return callApi.generateBackground({
          storeName: projectData.storeName,
          industry: projectData.industry,
          storeDesc: projectData.mainSlogan,
          customPrompt: combinedPrompt,
        }).then(res => {
          console.log(`[Editing] 배경 요청 #${sequence} [${style}] 응답 수신:`, res.ok ? '성공' : '실패');
          return { ...res, styleName: style };
        });
      });
      // 4개의 요청을 동시에 실행하고 기다립니다.
      const results = await Promise.all(generateTasks);
      console.log('[Editing] 모든 배경 생성 요청 완료. 결과 분석 중...');

      // 성공한 결과만 필터링하여 후보군(Candidates)으로 변환
      const newCandidates = results
        .filter(res => {
          if (!res.ok) console.warn('[Editing] 생성 실패 항목:', res.error);
          return res.ok && res.blobUrl;
        })
        .map((res: any, idx) => ({
          id: `ai-gen-${Date.now()}-${idx}`,
          name: `AI 배경 ${idx + 1} (${res.styleName})`,
          mode: 'ai-image' as const,
          cssBackground: 'transparent',
          imageUrl: res.blobUrl!,
          note: `${res.styleName} 스타일로 생성된 배경입니다.`,
          translatedPrompt: res.prompt || '',
          negativePrompt: res.negativePrompt || '',
        }));
  
      console.log(`[Editing] 유효한 새 후보군 수: ${newCandidates.length}`);

      if (newCandidates.length > 0) {
        // 기존 initPage 배경은 유지하면서 앞에 4개를 추가합니다
        setBackgroundCandidates(prev => [...newCandidates, ...prev]);
        setSelectedBackgroundId(newCandidates[0].id); // 첫 번째 이미지를 자동 선택
        setStep('background');
        console.log('[Editing] 배경 후보군 업데이트 완료');
      } else {
        throw new Error('서버로부터 배경 이미지를 받지 못했습니다. 백엔드 상태를 확인하세요.');
      }
  
    } catch (err) {
      console.error('[배경 생성 오류]', err);
      setError(err instanceof Error ? err.message : '배경 생성 도중 오류가 발생했습니다.');
    } finally {
      // 생성 완료 후 원래 선택했던 요소 다시 선택 (UX 배려)
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

  const handleGenerateSlogan = async () => {
    const prompt = storeInfo.buildAdPrompt();
    if (!prompt) {
      console.warn('[Editing] 저장된 가게 정보가 없어 기본 생성기를 사용합니다.');
      handleMainSloganChange(createAutoSlogan(projectData));
      return;
    }

    setGenerating(true);
    try {
      console.log('[Editing] AI 광고 문구 생성 요청 프롬프트:\n', prompt);
      const result = await adverApi.generateAdCopy(prompt);
      
      if (result.ok && result.data) {
        // 결과가 배열이거나 단일 문자열일 수 있으므로 유연하게 처리
        const copy = Array.isArray(result.data) ? result.data[0] : (result.data.main_copy || result.data);
        console.log('[Editing] AI 광고 문구 수신:', copy);
        handleMainSloganChange(String(copy));
      } else {
        throw new Error(result.error || '광고 문구를 생성하지 못했습니다.');
      }
    } catch (err) {
      console.error('[Editing] 광고 문구 생성 오류:', err);
      // 실패 시 fallback: 기존 로컬 생성기 사용
      handleMainSloganChange(createAutoSlogan(projectData));
    } finally {
      setGenerating(false);
    }
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
      const result = await removeBgPipeline(selectedElement.imageUrl);
      setElements((prev) => updateElement(prev, selectedElement.id, { imageUrl: result.url, hidden: false }));
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

  const handleSendBackward = (id: string) => {
    setElements((prev) => {
      const minZ = Math.min(...prev.map((element) => element.zIndex));
      return updateElement(prev, id, { zIndex: minZ - 1 });
    });
  };

  const handleBringForward = (id: string) => {
    setElements((prev) => {
      const maxZ = Math.max(...prev.map((element) => element.zIndex));
      return updateElement(prev, id, { zIndex: maxZ + 1 });
    });
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
        templateId={selectedTemplateId}
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
        onSendBackward={handleSendBackward}
        onBringForward={handleBringForward}
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
                      ratio={projectData?.options.ratio ?? '4:5'}
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
                    ratio={projectData?.options.ratio ?? '4:5'}
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
                          ratio={projectData?.options.ratio ?? '4:5'}
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
