import { callApi } from "../../server/api/callApi";
import { adverApi } from "../../server/api/adverApi";
import { storeInfo } from "../../server/api/storeInfo";
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchBootstrap, generateBackgrounds } from './api/client';
import BackgroundCard from './components/BackgroundCard';
import EditorCanvas from './components/EditorCanvas';
import Sidebar from './components/Sidebar';
import WireframeChoiceCard from './components/WireframeChoiceCard';
import type { BackgroundCandidate, BootstrapResponse } from './types/api';
import type { BackgroundMode, EditorElement, EditorStep } from './types/editor-core';
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
  isPrimaryImageElement,
  mapProjectDataToTemplate,
} from './utils/editorFlow';
import { captureElementAsDataUrl } from './utils/canvas';
import { readFileAsDataUrl } from './utils/file';
import { removeBgPipeline } from '../initPage/utils/removeBackground';
import {
  applyProjectTextField,
  buildBackgroundPrompt,
  createAutoSlogan,
  toggleAdditionalInfoElements,
} from './utils/projectEditor';
import { readEditingBridgePayload } from './utils/editingBridge';
import { buildInitialBackgroundCandidate } from './utils/initialBackground';
import { prebakeProductImages, prebakeSingleProductImage } from './utils/productImagePrebake';

const initialBootstrap: BootstrapResponse = {
  templates: [],
  sidebarRecommendations: [],
};

type AdCopyResult = { ok?: boolean; data?: unknown; error?: string };
type TransformResult = { ok?: boolean; blobUrl?: string; error?: string };

export default function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse>(initialBootstrap);
  const [step, setStep] = useState<EditorStep>('background');
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
  const [rightPanelMode, setRightPanelMode] = useState<'background' | 'template'>('template');
  /**
   * Type 4 half-crop / Type 3 overlap는 제품 이미지의 natural 크기와
   * pre-bake된 절반 dataURL을 요구한다. editing 모듈 로드 시점에 한 번
   * 수행하고 완료 전까지는 편집 페이지 전체를 가리는 로딩 오버레이를 띄운다.
   */
  const [isPrebakingImages, setIsPrebakingImages] = useState(false);
  /**
   * editing 안에서 사용자가 개별 제품 이미지를 교체하거나 AI 변환(정면화, 배경 제거)을
   * 수행한 직후, 해당 제품만 재프리베이크가 진행 중임을 표시하기 위한 set.
   * UI 레벨의 '이미지 자르는 중' 로컬 인디케이터에 사용.
   */
  const [prebakingProductIds, setPrebakingProductIds] = useState<Set<number>>(() => new Set());
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
    setBackgroundCandidates([preview]);
    setSelectedBackgroundId(preview.id);
  }, [backgroundMode, promptHint, projectData]);

  useEffect(() => {
    if (loading || bridgeResolved) return;

    const resolveBridge = async () => {
      try {
        const bridged = await readEditingBridgePayload();
        if (bridged) {
          await handleStartFromHome(bridged.projectData, bridged.draftIndex ?? 0);
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

  const handleStartFromHome = async (data: HomeProjectData, draftIndex = 0) => {
    // 편집 페이지 로딩 오버레이 활성화 — 모든 제품 이미지의 좌/우 절반 PNG dataURL
    // + natural 크기 추출이 끝날 때까지 본 화면을 가린다.
    setIsPrebakingImages(true);
    let baked: HomeProjectData = data;
    try {
      const bakedProducts = await prebakeProductImages(data.products);
      baked = { ...data, products: bakedProducts };
    } catch (prebakeError) {
      console.warn('[editing] 제품 이미지 프리베이크 전체 실패', prebakeError);
    } finally {
      setIsPrebakingImages(false);
    }

    setProjectData(baked);
    setAdditionalInfoVisibility({});
    const nextBackgroundMode =
      baked.options.concept === 'solid' ||
      baked.options.concept === 'gradient' ||
      baked.options.concept === 'pastel' ||
      baked.options.concept === 'ai-image'
        ? baked.options.concept
        : 'ai-image';
    setBackgroundMode(nextBackgroundMode);
    // initPage 색상을 사이드바 컬러 피커에 반영
    const initPromptHint = buildInitPromptHint(baked.options);
    setPromptHint(initPromptHint);
    const initialBackground = buildInitialBackgroundCandidate(baked, nextBackgroundMode, initPromptHint);
    setBackgroundCandidates([initialBackground]);
    setSelectedBackgroundId(initialBackground.id);
    const nextTemplate = bootstrap.templates[draftIndex] ?? selectedTemplate ?? bootstrap.templates[0] ?? null;
    if (nextTemplate) {
      setSelectedTemplateId(nextTemplate.id);
      setElements(
        applyDraftTypographyVariant(
          applyDraftLayoutVariant(mapProjectDataToTemplate(nextTemplate, baked), draftIndex, baked),
          baked
        )
      );
    }
    setStep('background');
    setQueuedBackgroundGeneration(false);
    setSelectedElementId(null);
  };

  /**
   * 2단계 구도 선택 — 사용자가 wireframe 카드를 고르면
   *   1) projectData.options.draftIndex 를 갱신하고
   *   2) 현재 선택된 template 위에 새 draftIndex 기준으로
   *      applyDraftLayoutVariant → applyDraftTypographyVariant 를 재적용한다.
   * EditorCanvas/3단계 편집 기능은 건드리지 않는다 (elements 배열만 swap).
   */
  const handleSelectWireframeType = (typeIndex: 0 | 1 | 2 | 3) => {
    if (!projectData) return;
    const nextProjectData: HomeProjectData = {
      ...projectData,
      options: { ...projectData.options, draftIndex: typeIndex },
    };
    setProjectData(nextProjectData);

    const template = selectedTemplate ?? bootstrap.templates[typeIndex] ?? bootstrap.templates[0] ?? null;
    if (!template) return;

    const mapped = mapProjectDataToTemplate(template, nextProjectData);
    const withLayout = applyDraftLayoutVariant(mapped, typeIndex, nextProjectData);
    setElements(applyDraftTypographyVariant(withLayout, nextProjectData));
    setSelectedElementId(null);
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

        const nextCandidates = localResult.candidates.slice(0, 4);
        setBackgroundCandidates(nextCandidates);
        setSelectedBackgroundId(nextCandidates[0]?.id ?? null);
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
        setBackgroundCandidates(newCandidates.slice(0, 4));
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

  const handleShowBackgroundCandidates = async () => {
    if (backgroundMode === 'solid') {
      setStep('editor');
      return;
    }

    if (backgroundCandidates.length >= 4) {
      setStep('background');
      return;
    }

    if (!generating) {
      await handleGenerateBackgrounds();
    }
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
    setGenerating(true);
    setError(null);

    try {
      const result = (await callApi.generateAdCopy()) as AdCopyResult;
      
      if (result.ok && result.data) {
        const data = result.data;
        const copy =
          Array.isArray(data)
            ? data[0]
            : data && typeof data === 'object' && 'main_copy' in data
              ? (data as { main_copy?: unknown }).main_copy ?? data
              : data;
        console.log('[Editing] AI 광고 문구 수신:', copy);
        handleMainSloganChange(String(copy));
      } else {
        console.warn(`[Editing] AI 문구 생성 실패: ${result.error}. 로컬 생성기로 대체합니다.`);
        handleMainSloganChange(createAutoSlogan(projectData));
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

  /**
   * 선택된 제품 이미지 요소의 imageUrl을 교체하고, 해당 제품의 pre-bake
   * 결과(왼쪽/오른쪽 반쪽 dataURL + natural 크기)를 재계산한 뒤
   * 현재 draftIndex(Type 3/4 포함)로 레이아웃을 재적용한다.
   *
   * - elementId → productId 매핑: mapProjectDataToTemplate과 동일한 규칙으로
   *   `isPrimaryImageElement` 순서 ↔ `activeProducts(filter(image))` 순서로 매칭.
   * - 프리베이크 중에는 prebakingProductIds에 id를 추가해 로컬 '이미지 자르는 중' 표시.
   */
  const onChangeSelectedImage = async (imageUrl: string) => {
    if (!selectedElement || selectedElement.kind !== 'image') return;

    // 먼저 UI에는 즉시 새 이미지를 반영 (사용자 체감 레이턴시 감소)
    const targetElementId = selectedElement.id;
    setElements((prev) => updateElement(prev, targetElementId, { imageUrl, hidden: false }));

    if (!projectData) return;
    // 현재 화면의 primary image 순서 기준 인덱스
    const primaries = elements.filter(isPrimaryImageElement);
    const elementIndex = primaries.findIndex((el) => el.id === targetElementId);
    if (elementIndex < 0) return;
    const activeProducts = projectData.products.filter((p) => p.image);
    const targetProduct = activeProducts[elementIndex];
    if (!targetProduct) return;

    // 로컬 "이미지 자르는 중" 인디케이터 on
    setPrebakingProductIds((prev) => {
      const next = new Set(prev);
      next.add(targetProduct.id);
      return next;
    });

    try {
      const rebaked = await prebakeSingleProductImage({
        ...targetProduct,
        image: imageUrl,
        // stale한 기존 crop을 지워둔다 — 실패 시 폴백이 원본으로 돌아가도록
        imageLeftHalf: undefined,
        imageRightHalf: undefined,
        imageNaturalWidth: undefined,
        imageNaturalHeight: undefined,
      });

      // projectData.products에 반영
      setProjectData((prev) => {
        if (!prev) return prev;
        const nextProducts = prev.products.map((p) => (p.id === targetProduct.id ? rebaked : p));
        const nextData: HomeProjectData = { ...prev, products: nextProducts };

        // draftIndex 기준으로 레이아웃을 재적용 (Type 3/4 반영).
        // mapProjectDataToTemplate는 전체 재생성이라 편집 상태가 사라지므로
        // 현재 elements에 대해서만 applyDraftLayoutVariant를 다시 돌린다.
        setElements((currentElements) => {
          const layoutApplied = applyDraftLayoutVariant(
            currentElements,
            nextData.options.draftIndex ?? 0,
            nextData,
          );
          return applyDraftTypographyVariant(layoutApplied, nextData);
        });

        return nextData;
      });
    } catch (rebakeError) {
      console.warn('[editing] 단일 제품 프리베이크 실패', {
        productId: targetProduct.id,
        error: rebakeError,
      });
    } finally {
      setPrebakingProductIds((prev) => {
        const next = new Set(prev);
        next.delete(targetProduct.id);
        return next;
      });
    }
  };

  const handleRemoveSelectedImageBackground = async () => {
    if (!selectedElement || selectedElement.kind !== 'image' || !selectedElement.imageUrl) return;
    try {
      const result = await removeBgPipeline(selectedElement.imageUrl);
      // onChangeSelectedImage를 통해 단일 제품 재프리베이크까지 함께 수행한다.
      await onChangeSelectedImage(result.url);
    } catch (backgroundError) {
      setError(backgroundError instanceof Error ? backgroundError.message : '배경 제거에 실패했습니다.');
    }
  };

  const handleConvertToFrontalView = async () => {
    if (!selectedElement || selectedElement.kind !== 'image' || !selectedElement.imageUrl) return;

    setGenerating(true);
    setError(null);
    try {
      const result = (await callApi.transformImageToFrontal(selectedElement.imageUrl)) as TransformResult;
      if (result.ok && result.blobUrl) {
        // onChangeSelectedImage를 통해 단일 제품 재프리베이크까지 함께 수행한다.
        await onChangeSelectedImage(result.blobUrl);
      } else {
        throw new Error(result.error || '정면 변환에 실패했습니다.');
      }
    } catch (err) {
      console.error('[Editing] 정면 변환 오류:', err);
      setError(err instanceof Error ? err.message : '정면 변환 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
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

  // 제품 이미지 프리베이크가 끝나기 전까지는 본 편집 화면을 가리는 전체 오버레이만 표시.
  // (Type 4 half-crop이 pre-bake된 dataURL을 요구하기 때문에, 완료 전 렌더를 차단한다.)
  if (isPrebakingImages) {
    return <div className="empty-panel">편집 페이지 로딩 중</div>;
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
        onBackToBackgrounds={handleShowBackgroundCandidates}
        onChangeElement={(id, patch) => setElements((prev) => updateElement(prev, id, patch))}
        onSendBackward={handleSendBackward}
        onBringForward={handleBringForward}
        onReplaceSelectedImage={handleReplaceSelectedImage}
        onRemoveSelectedImageBackground={handleRemoveSelectedImageBackground}
        onConvertToFrontalView={handleConvertToFrontalView}
      />

      <main className="workspace">
        <div className="workspace__header">
          <div>
            <span className="workspace__eyebrow">Layout Guided Background Flow</span>
            <h2>
              {step === 'background' && '2단계. 배치에 맞춘 AI 배경 후보'}
              {step === 'editor' && '3단계. 객체 자유 편집'}
            </h2>
          </div>
          <div className="status-row">
            <span>{backgroundMode}</span>
            {generating && <span>가이드 이미지로 배경 생성 중...</span>}
            {prebakingProductIds.size > 0 && <span>이미지 자르는 중...</span>}
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
                    <div className="choice-toggle" role="tablist" aria-label="우측 패널 모드">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={rightPanelMode === 'template'}
                        className={`choice-toggle__btn ${rightPanelMode === 'template' ? 'choice-toggle__btn--active' : ''}`}
                        onClick={() => setRightPanelMode('template')}
                      >
                        구도 선택
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={rightPanelMode === 'background'}
                        className={`choice-toggle__btn ${rightPanelMode === 'background' ? 'choice-toggle__btn--active' : ''}`}
                        onClick={() => setRightPanelMode('background')}
                      >
                        배경 선택
                      </button>
                    </div>
                    {rightPanelMode === 'background' ? (
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
                    ) : (
                      <div className="choice-grid choice-grid--compact">
                        {([0, 1, 2, 3] as const).map((typeIndex) => (
                          <WireframeChoiceCard
                            key={typeIndex}
                            typeIndex={typeIndex}
                            projectData={projectData}
                            background={selectedBackground}
                            ratio={projectData?.options.ratio ?? '4:5'}
                            selected={(projectData?.options.draftIndex ?? 0) === typeIndex}
                            onSelect={() => handleSelectWireframeType(typeIndex)}
                          />
                        ))}
                      </div>
                    )}
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
