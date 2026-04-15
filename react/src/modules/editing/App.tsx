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

// ─── AI 배경 스타일 변형 정의 ──────────────────────────────────────────────────
// 한국어로 작성하면 백엔드 GPT(OpenAiJob.build_prompt_bundle)가 SD3.5 영문으로 번역합니다.
// 새 스타일 추가 시 이 배열에만 항목을 추가하면 됩니다.
const BACKGROUND_VARIANTS = [
  { label: '고급',   style: '고급스럽고 프리미엄한 분위기' },
  { label: '빈티지', style: '빈티지 레트로 감성'           },
  { label: '세련',   style: '세련되고 모던한 미니멀'        },
  { label: '활기찬', style: '밝고 활기찬 따뜻한 색감'       },
] as const;

// 테스트용: 생성할 배경 수 (전체 생성 시 BACKGROUND_VARIANTS.length 로 변경)
const GENERATE_VARIANT_COUNT = 1;

// ─── 후보군 항목 타입 (as const 로 인한 widening 방지) ─────────────────────────
type BackgroundVariant = (typeof BACKGROUND_VARIANTS)[number];

// ─── AI 배경 후보 객체를 생성하는 순수 함수 ────────────────────────────────────
function buildAiCandidate(
  res: { blobUrl?: string; prompt?: string; negativePrompt?: string },
  variant: BackgroundVariant,
  index: number,
): BackgroundCandidate {
  return {
    id: `ai-gen-${Date.now()}-${index}`,
    name: `AI 배경 ${index + 1} (${variant.label})`,
    mode: 'ai-image' as const,
    cssBackground: 'transparent',
    imageUrl: res.blobUrl!,
    note: `${variant.label} 스타일로 생성된 배경입니다.`,
    translatedPrompt: res.prompt ?? '',
    negativePrompt: res.negativePrompt ?? '',
  };
}

type AdCopyResult = { ok?: boolean; data?: unknown; error?: string };
type TransformResult = { ok?: boolean; blobUrl?: string; error?: string };

function extractAdCopy(result: AdCopyResult) {
  if (!result.ok || !result.data) return '';
  const data = result.data;
  const copy =
    Array.isArray(data)
      ? data[0]
      : data && typeof data === 'object' && 'main_copy' in data
        ? (data as { main_copy?: unknown }).main_copy ?? data
        : data;
  return String(copy ?? '').trim();
}

function buildPlainWhiteBackground(mode: BackgroundMode): BackgroundCandidate {
  return {
    id: 'init-preview-background',
    name: '기본 흰색 배경',
    mode,
    cssBackground: '#ffffff',
    note: 'editing 진입 시 기본 흰색 배경',
    translatedPrompt: '',
    negativePrompt: '',
  };
}

export default function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse>(initialBootstrap);
  const [step, setStep] = useState<EditorStep>('background');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
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
  const [saving, setSaving] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const mainPreviewRef = useRef<HTMLDivElement>(null);
  const autoCopyKeyRef = useRef('');
  const suspendInitialBackgroundSyncRef = useRef(false);

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
    () =>
      selectedElementIds.length === 1
        ? renderElements.find((element) => element.id === selectedElementIds[0]) ?? null
        : null,
    [renderElements, selectedElementIds]
  );

  const handleCanvasSelect = (id: string | null, options?: { append?: boolean }) => {
    if (!id) {
      setSelectedElementIds([]);
      return;
    }

    if (options?.append) {
      setSelectedElementIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
      return;
    }

    setSelectedElementIds([id]);
  };

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
    if (suspendInitialBackgroundSyncRef.current) {
      return;
    }
    const preview = buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint);
    setBackgroundCandidates([preview]);
    setSelectedBackgroundId(preview.id);
  }, [backgroundMode, promptHint, projectData]);


  useEffect(() => {
    if (!projectData) return;
    if (projectData.mainSlogan?.trim()) {
      autoCopyKeyRef.current = '';
      return;
    }

    const hasPromptSource =
      Boolean(projectData.storeName?.trim()) ||
      Boolean(projectData.industry?.trim()) ||
      projectData.products.some((product) => product.showDesc && product.description?.trim());

    if (!hasPromptSource) return;

    const requestKey = JSON.stringify({
      storeName: projectData.storeName ?? '',
      industry: projectData.industry ?? '',
      products: projectData.products.map((product) => ({
        description: product.description ?? '',
        showDesc: Boolean(product.showDesc),
      })),
    });

    if (autoCopyKeyRef.current === requestKey) return;
    autoCopyKeyRef.current = requestKey;

    const timer = window.setTimeout(() => {
      void handleGenerateSlogan();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [projectData]);

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
    const initialBackground = buildPlainWhiteBackground(nextBackgroundMode);
    suspendInitialBackgroundSyncRef.current = true;
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
    setSelectedElementIds([]);
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
    setRightPanelMode('background');
    setSelectedElementIds([]);
  };

  const handleGenerateBackgrounds = async () => {
    if (!selectedTemplateId || !projectData) return;
    suspendInitialBackgroundSyncRef.current = false;

    setGenerating(true);
    setError(null);

    // 편집 중이던 선택 박스 해제
    const previousSelectedIds = selectedElementIds;
    setSelectedElementIds([]);

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
        
        if (backgroundMode === 'solid') {
          const initialBackground = projectData
            ? buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint)
            : null;
          if (initialBackground) {
            setBackgroundCandidates([initialBackground]);
            setSelectedBackgroundId(initialBackground.id);
          }
          return;
        }

        const nextCandidates = localResult.candidates.slice(0, 4);
        setBackgroundCandidates(nextCandidates);
        setSelectedBackgroundId(nextCandidates[0]?.id ?? null);
        return;
      }

      // [Case B] AI 이미지 생성 모드 — GENERATE_VARIANT_COUNT 만큼 병렬 생성
      const activeVariants = BACKGROUND_VARIANTS.slice(0, GENERATE_VARIANT_COUNT);
      console.log(`[Editing] AI 이미지 생성 시작 (${activeVariants.length}개 요청)`);

      // 각 스타일별 생성 태스크 구성
      // - 사용자 입력 프롬프트(promptKo)를 최우선으로 배치하고 스타일 키워드를 보조로 결합
      // - 백엔드 GPT(OpenAiJob.build_prompt_bundle)가 한국어 → SD3.5 영문으로 번역
      const generateTasks = activeVariants.map((variant, idx) => {
        const combinedPrompt = promptKo.trim()
          ? `${promptKo}, ${variant.style}`
          : variant.style;

        console.log(`[Editing] 배경 요청 #${idx + 1} (${variant.label}) 준비...`);

        return callApi.generateBackground({ customPrompt: combinedPrompt })
          .then(res => {
            console.log(`[Editing] 배경 요청 #${idx + 1} [${variant.label}]:`, res.ok ? '성공' : '실패');
            return { res, variant, idx };
          });
      });

      const results = await Promise.all(generateTasks);
      console.log('[Editing] 모든 배경 생성 완료. 결과 분석 중...');

      // 성공한 결과만 후보군(BackgroundCandidate)으로 변환
      const newCandidates = results
        .filter(({ res }) => {
          if (!res.ok) console.warn('[Editing] 생성 실패:', res.error);
          return res.ok && res.blobUrl;
        })
        .map(({ res, variant, idx }) => buildAiCandidate(res, variant, idx));
  
      console.log(`[Editing] 유효한 새 후보군 수: ${newCandidates.length}`);

      if (newCandidates.length > 0) {
        setBackgroundCandidates(newCandidates.slice(0, 4));
        setSelectedBackgroundId(newCandidates[0].id); // 첫 번째 이미지를 자동 선택
        console.log('[Editing] 배경 후보군 업데이트 완료');
      } else {
        throw new Error('서버로부터 배경 이미지를 받지 못했습니다. 백엔드 상태를 확인하세요.');
      }
  
    } catch (err) {
      console.error('[배경 생성 오류]', err);
      setError(err instanceof Error ? err.message : '배경 생성 도중 오류가 발생했습니다.');
    } finally {
      // 생성 완료 후 원래 선택했던 요소 다시 선택 (UX 배려)
      setSelectedElementIds(previousSelectedIds);
      setGenerating(false);
    }
  };
  
  const handleSelectBackground = (backgroundId: string) => {
    setSelectedBackgroundId(backgroundId);
  };

  const handleShowBackgroundCandidates = async () => {
    if (backgroundMode === 'solid') {
      setRightPanelMode('template');
      return;
    }

    setRightPanelMode('background');

    if (backgroundCandidates.length >= 4) {
      return;
    }

    if (!generating) {
      await handleGenerateBackgrounds();
    }
  };

  const handleBackToInitialPage = () => {
    storeInfo.clearStoreDesc();
    storeInfo.clearStoreIntro();
    window.location.href = getInitPageUrl();
  };

  const handleBackgroundModeChange = (mode: BackgroundMode) => {
    suspendInitialBackgroundSyncRef.current = false;
    setBackgroundMode(mode);

    if (mode === 'solid') {
      setQueuedBackgroundGeneration(false);
      setRightPanelMode('template');
      return;
    }

    if (mode === 'gradient' || mode === 'pastel') {
      setRightPanelMode('background');
      setQueuedBackgroundGeneration(false);
      return;
    }

    setRightPanelMode('background');
  };

  const handlePromptHintChange = (value: string) => {
    suspendInitialBackgroundSyncRef.current = false;
    setPromptHint(value);
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
    if (projectData) {
      storeInfo.saveStoreInfo({
        basicInfo: {
          storeName: projectData.storeName,
          industry: projectData.industry ?? '',
          storeDesc: value,
        },
        products: projectData.products,
      });
    }
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

      const copy = extractAdCopy(result);
      if (copy) {
        console.log('[Editing] AI 광고 문구 수신:', copy);
        handleMainSloganChange(copy);
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
    setSelectedElementIds([nextElement.id]);
  };

  const handleAddImageElement = async (file: File, label: string) => {
    try {
      const imageUrl = await readFileAsDataUrl(file);
      const nextElement = createCustomImageElement(imageUrl, label);
      setElements((prev) => [...prev, nextElement]);
      setSelectedElementIds([nextElement.id]);
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

  const handleFullSave = async () => {
    if (!mainPreviewRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await captureElementAsDataUrl(mainPreviewRef.current, 3);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${projectData?.storeName ?? 'design'}_full.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '이미지 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
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
        selectionCount={selectedElementIds.length}
        infoItems={additionalInfoLabels.map((label) => ({ label, visible: additionalInfoVisibility[label] ?? false }))}
        storeName={projectData?.storeName ?? ''}
        mainSlogan={projectData?.mainSlogan ?? ''}
        promptHint={promptHint}
        backgroundMode={backgroundMode}
        recommendations={bootstrap.sidebarRecommendations}
        onPromptHintChange={handlePromptHintChange}
        onStoreNameChange={handleStoreNameChange}
        onMainSloganChange={handleMainSloganChange}
        onGenerateSlogan={handleGenerateSlogan}
        onToggleInfoItem={handleToggleInfoItem}
        onAddTextElement={handleAddTextElement}
        onAddImageElement={handleAddImageElement}
        onBackgroundModeChange={handleBackgroundModeChange}
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
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase font-zen">EditingView</h2>
          </div>
          <div className="status-row">
            <span>{backgroundMode}</span>
            {generating && <span>가이드 이미지로 배경 생성 중...</span>}
            {prebakingProductIds.size > 0 && <span>이미지 자르는 중...</span>}
            <button
              type="button"
              className="btn-full-save"
              onClick={() => void handleFullSave()}
              disabled={saving || generating}
            >
              {saving ? '저장 중...' : '전체 저장'}
            </button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="capture-surface" aria-hidden="true">
          <div ref={captureRef}>
            <EditorCanvas
              elements={renderElements}
              background={null}
              selectedElementIds={[]}
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
            <section className="workspace__section workspace__section--split">
              <div className="workspace__main-preview" ref={mainPreviewRef}>
                <EditorCanvas
                  elements={renderElements}
                  background={selectedBackground}
                  ratio={projectData?.options.ratio ?? '4:5'}
                  selectedElementIds={selectedElementIds}
                  onSelect={handleCanvasSelect}
                  onChangeElement={(id, patch) => setElements((prev) => updateElement(prev, id, patch))}
                />
              </div>
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
            </section>
          </>
        )}
      </main>
    </div>
  );
}
