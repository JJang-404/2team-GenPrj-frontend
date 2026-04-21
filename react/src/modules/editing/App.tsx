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
  applyDraftLayoutVariant,
  applyDraftTypographyVariant,
  applyElementVisibilityRules,
  buildGuideSummary,
  createCustomImageElement,
  createCustomTextElement,
  createElementsFromWireframe,
  getDefaultZonePositions,
  isPrimaryImageElement,
  mapProjectDataToTemplate,
} from './utils/editorFlow';
import { ADDITIONAL_INFO_ITEMS, type AdditionalInfoKey } from './utils/additionalInfo';
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
import { useAiDesignSystem } from './hooks/useAiDesignSystem';

const initialBootstrap: BootstrapResponse = {
  templates: [],
  sidebarRecommendations: [],
};

interface BackgroundColorDraft {
  solid: [string];
  gradient: [string, string];
  pastel: [string, string];
}

const DEFAULT_BACKGROUND_COLOR_DRAFT: BackgroundColorDraft = {
  solid: ['#60a5fa'],
  gradient: ['#ffffff', '#2f2f2f'],
  pastel: ['#ffffff', '#1f1f1f'],
};

// ─── AI 배경 후보 객체를 생성하는 순수 함수 ────────────────────────────────────
// img2img 전환 후: 단일 호출만 사용하므로 variant 구조 제거
function buildAiCandidate(
  res: { blobUrl?: string; prompt?: string; negativePrompt?: string },
  index: number,
): BackgroundCandidate {
  return {
    id: `ai-gen-${Date.now()}-${index}`,
    name: `AI 배경 ${index + 1}`,
    mode: 'ai-image' as const,
    cssBackground: 'transparent',
    imageUrl: res.blobUrl!,
    note: '제품 구도를 참조하여 생성된 배경입니다.',
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
  // 기존 인라인 기본값 선언 방식. 필요 시 아래 블록으로 원복 가능.
  // const [backgroundColorDraft, setBackgroundColorDraft] = useState<BackgroundColorDraft>({
  //   solid: ['#60a5fa'],
  //   gradient: ['#93c5fd', '#1d4ed8'],
  //   pastel: ['#c4b5fd', '#93c5fd'],
  // });
  const [backgroundColorDraft, setBackgroundColorDraft] = useState<BackgroundColorDraft>(DEFAULT_BACKGROUND_COLOR_DRAFT);
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

  // 현재 선택된 배경 후보 객체
  const selectedBackground = useMemo(
    () => backgroundCandidates.find((background) => background.id === selectedBackgroundId) ?? null,
    [backgroundCandidates, selectedBackgroundId],
  );

  // AI 디자인 시스템: 배경색에 따라 텍스트 색상을 자동으로 최적화합니다.
  useAiDesignSystem(selectedBackground, setElements);

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
    const preview = buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint, backgroundColorDraft);
    setBackgroundCandidates([preview]);
    setSelectedBackgroundId(preview.id);
  }, [backgroundMode, promptHint, projectData, backgroundColorDraft]);

  useEffect(() => {
    if (!projectData) return;
    if (backgroundMode === 'gradient' || backgroundMode === 'pastel') {
      setRightPanelMode('background');
      setQueuedBackgroundGeneration(true);
    }
  }, [backgroundMode, promptHint, projectData, backgroundColorDraft]);


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
          await handleStartFromHome(bridged.projectData, bridged.projectData.options.draftIndex ?? 0);
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

  /** initPage 옵에서 편집 사이드바의 초기 색상 토큰을 생성합니다. */
  const buildInitPromptHint = (options: HomeProjectData['options']): string => {
    // 기존 기본색(빨강/파랑) fallback. 필요 시 아래 두 줄로 원복 가능.
    // const start = options.startColor ?? '#FF4757';
    // const end = options.endColor ?? '#4A90E2';
    const start = options.startColor ?? DEFAULT_BACKGROUND_COLOR_DRAFT.gradient[0];
    const end = options.endColor ?? DEFAULT_BACKGROUND_COLOR_DRAFT.gradient[1];
    const concept = options.concept ?? '';
    if (concept === 'solid') return `BG_SOLID(${start})`;
    if (concept === 'gradient') return `BG_GRADIENT(${start},${end})`;
    if (concept === 'pastel') return `BG_MULTI(${start},${end})`;
    return '';
  };

  const buildInitialColorDraft = (options: HomeProjectData['options']): BackgroundColorDraft => {
    // 기존 모든 모드 공통 fallback(빨강/파랑). 필요 시 아래 두 줄로 원복 가능.
    // const start = options.startColor ?? '#FF4757';
    // const end = options.endColor ?? '#4A90E2';
    const solidStart = options.startColor ?? DEFAULT_BACKGROUND_COLOR_DRAFT.solid[0];
    const gradientStart = options.startColor ?? DEFAULT_BACKGROUND_COLOR_DRAFT.gradient[0];
    const gradientEnd = options.endColor ?? DEFAULT_BACKGROUND_COLOR_DRAFT.gradient[1];
    const pastelStart = options.startColor ?? DEFAULT_BACKGROUND_COLOR_DRAFT.pastel[0];
    const pastelEnd = options.endColor ?? DEFAULT_BACKGROUND_COLOR_DRAFT.pastel[1];
    return {
      solid: [solidStart],
      gradient: [gradientStart, gradientEnd],
      pastel: [pastelStart, pastelEnd],
    };
  };

  const handleSolidColorChange = (color: string) => {
    // 색상 첫 조작 직후에도 미리보기 effect가 동작하도록 동기화 잠금을 해제한다.
    suspendInitialBackgroundSyncRef.current = false;
    setBackgroundColorDraft((prev) => ({ ...prev, solid: [color] }));
  };

  const handleGradientColorsChange = (colors: [string, string]) => {
    suspendInitialBackgroundSyncRef.current = false;
    setBackgroundColorDraft((prev) => ({ ...prev, gradient: colors }));
  };

  const handleMultiColorsChange = (colors: [string, string]) => {
    suspendInitialBackgroundSyncRef.current = false;
    setBackgroundColorDraft((prev) => ({ ...prev, pastel: colors }));
  };

  const buildPromptHintWithColorDraft = (
    basePromptHint: string,
    mode: BackgroundMode,
    colorDraft: BackgroundColorDraft
  ) => {
    const freePrompt = basePromptHint.replace(/\s*BG_(?:SOLID|GRADIENT|MULTI)\([^)]*\)/g, '').trim();
    if (mode === 'solid') {
      return freePrompt ? `${freePrompt} BG_SOLID(${colorDraft.solid[0]})` : `BG_SOLID(${colorDraft.solid[0]})`;
    }
    if (mode === 'gradient') {
      return freePrompt
        ? `${freePrompt} BG_GRADIENT(${colorDraft.gradient.join(',')})`
        : `BG_GRADIENT(${colorDraft.gradient.join(',')})`;
    }
    if (mode === 'pastel') {
      return freePrompt
        ? `${freePrompt} BG_MULTI(${colorDraft.pastel.join(',')})`
        : `BG_MULTI(${colorDraft.pastel.join(',')})`;
    }
    return freePrompt;
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

    baked = { ...baked, zonePositions: getDefaultZonePositions(draftIndex) };
    setProjectData(baked);
    // bridge payload의 view* 플래그를 그대로 additionalInfoVisibility 로 seed (1:1 pass-through).
    // 로컬 변수로 캡처해 같은 함수 scope의 createElementsFromWireframe 호출에 그대로 전달
    // (setAdditionalInfoVisibility 직후 state는 stale이므로 state 읽기 대신 이 변수 사용).
    const info = baked.additionalInfo;
    const seededVisibility: Record<AdditionalInfoKey, boolean> = {
      viewParking: Boolean(info.viewParking),
      viewPet: Boolean(info.viewPet),
      viewNoKids: Boolean(info.viewNoKids),
      viewSmoking: Boolean(info.viewSmoking),
      viewElevator: Boolean(info.viewElevator),
      viewPhone: Boolean(info.viewPhone),
      viewAddress: Boolean(info.viewAddress),
    };
    setAdditionalInfoVisibility(seededVisibility);
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
    // 기존 토큰 기반 초기화 방식. 필요 시 이 줄로 원복 가능.
    // setPromptHint(initPromptHint);
    setPromptHint(initPromptHint.replace(/\s*BG_(?:SOLID|GRADIENT|MULTI)\([^)]*\)/g, '').trim());
    setBackgroundColorDraft(buildInitialColorDraft(baked.options));
    const initialBackground = buildPlainWhiteBackground(nextBackgroundMode);
    suspendInitialBackgroundSyncRef.current = true;
    setBackgroundCandidates([initialBackground]);
    setSelectedBackgroundId(initialBackground.id);
    const nextTemplate = bootstrap.templates[draftIndex] ?? selectedTemplate ?? bootstrap.templates[0] ?? null;
    if (nextTemplate) {
      setSelectedTemplateId(nextTemplate.id);
    }
    setElements(createElementsFromWireframe(baked, seededVisibility));
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
      zonePositions: getDefaultZonePositions(typeIndex),
    };
    setProjectData(nextProjectData);

    setElements(createElementsFromWireframe(nextProjectData, additionalInfoVisibility));
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
        const promptHintWithColorDraft = buildPromptHintWithColorDraft(promptHint, backgroundMode, backgroundColorDraft);
        const localResult = await generateBackgrounds({
          templateId: selectedTemplateId,
          backgroundMode,
          // 기존 promptHint 직접 사용 방식. 필요 시 아래 줄로 원복 가능.
          // promptKo: buildBackgroundPrompt(projectData, selectedTemplate, promptKo, promptHint),
          promptKo: buildBackgroundPrompt(projectData, selectedTemplate, promptKo, promptHintWithColorDraft),
          guideImage: '',
          guideSummary: '',
        });

        if (backgroundMode === 'solid') {
          const initialBackground = projectData
            ? buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint, backgroundColorDraft)
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

      // [Case B] AI 이미지 생성 모드 (img2img)
      // captureRef는 captureMode=true인 미러 캔버스 — 텍스트/로고/배경은 data-html2canvas-ignore 처리되어 제품 이미지만 캡처됨
      console.log('[Editing] AI 이미지 생성 시작 (img2img 모드)');

      const captureRoot = captureRef.current;
      if (!captureRoot) {
        throw new Error('캡처 대상 캔버스를 찾을 수 없습니다.');
      }

      const imageBase64 = await captureElementAsDataUrl(captureRoot);
      console.log('[Editing] MainPreview 캡처 완료, 백엔드에 이미지+프롬프트 전송');

      const res = await callApi.generateBackground({
        customPrompt: promptKo,
        imageBase64,
      });

      if (!res.ok || !res.blobUrl) {
        console.warn('[Editing] 생성 실패:', res.error);
        throw new Error('서버로부터 배경 이미지를 받지 못했습니다. 백엔드 상태를 확인하세요.');
      }

      const candidate = buildAiCandidate(res, 0);
      setBackgroundCandidates([candidate]);
      setSelectedBackgroundId(candidate.id);
      console.log('[Editing] 배경 후보군 업데이트 완료');

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

    const threshold = backgroundMode === 'ai-image' ? 1 : 4;
    if (backgroundCandidates.length >= threshold) {
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
      setQueuedBackgroundGeneration(true);
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

  const handleToggleInfoItem = (viewKey: AdditionalInfoKey) => {
    setAdditionalInfoVisibility((prev) => {
      const nextVisible = !prev[viewKey];
      const nextVisibility = { ...prev, [viewKey]: nextVisible };
      setElements((current) =>
        toggleAdditionalInfoElements(current, projectData, viewKey, nextVisible, nextVisibility),
      );

      return nextVisibility;
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
            additionalInfoVisibility,
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
    if (!captureRef.current) return;
    setSaving(true);
    try {
      const posterCanvas = captureRef.current.querySelector('.editor-stage__canvas');
      if (!(posterCanvas instanceof HTMLElement)) {
        throw new Error('포스터 저장 대상을 찾을 수 없습니다.');
      }
      const dataUrl = await captureElementAsDataUrl(posterCanvas, 3);
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
        infoItems={ADDITIONAL_INFO_ITEMS.map(({ viewKey, label }) => ({
          viewKey,
          label,
          visible: additionalInfoVisibility[viewKey] ?? false,
        }))}
        storeName={projectData?.storeName ?? ''}
        mainSlogan={projectData?.mainSlogan ?? ''}
        promptHint={promptHint}
        backgroundMode={backgroundMode}
        backgroundColorDraft={backgroundColorDraft}
        recommendations={bootstrap.sidebarRecommendations}
        onPromptHintChange={handlePromptHintChange}
        // 기존 직접 state 갱신 방식. 필요 시 아래 3줄로 원복 가능.
        // onSolidColorChange={(color) => setBackgroundColorDraft((prev) => ({ ...prev, solid: [color] }))}
        // onGradientColorsChange={(colors) => setBackgroundColorDraft((prev) => ({ ...prev, gradient: colors }))}
        // onMultiColorsChange={(colors) => setBackgroundColorDraft((prev) => ({ ...prev, pastel: colors }))}
        onSolidColorChange={handleSolidColorChange}
        onGradientColorsChange={handleGradientColorsChange}
        onMultiColorsChange={handleMultiColorsChange}
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
              background={selectedBackground}
              ratio={projectData?.options.ratio ?? '4:5'}
              selectedElementIds={[]}
              onSelect={() => { }}
              onChangeElement={(_id, _patch) => { }}
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
