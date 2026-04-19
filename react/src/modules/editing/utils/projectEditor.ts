import type { BackgroundMode, EditorElement, TemplateDefinition } from '../types/editor-core';
import type { HomeProjectData } from '../types/home';
import {
  ADDITIONAL_INFO_KEYS,
  getAdditionalInfoLabel,
  type AdditionalInfoKey,
} from './additionalInfo';
import {
  computeFooterPresets,
  createAdditionalInfoElements,
  updateProjectTextElements,
} from './editorFlow';

export function buildBackgroundPrompt(
  projectData: HomeProjectData | null,
  selectedTemplate: TemplateDefinition | null,
  promptKo: string,
  promptHint: string
) {
  return [
    `색상 테마: ${projectData?.options.brandColor ?? selectedTemplate?.accent ?? '#ffffff'}`,
    promptKo,
    promptHint.trim(),
    '객체와 텍스트 위치는 유지하고 배경과 조명만 생성하세요',
    '컵, 손, 사람, 과일, 로고, 추가 제품은 생성하지 마세요',
  ]
    .filter(Boolean)
    .join('. ');
}

export function createAutoSlogan(projectData: HomeProjectData | null) {
  const firstNamedProduct = projectData?.products.find((product) => product.name.trim());
  const store = projectData?.storeName.trim() || '우리 가게';
  const product = firstNamedProduct?.name.trim() || '시그니처 메뉴';
  const candidates = [
    `${store}의 ${product}, 지금 가장 선명한 한 잔`,
    `${product}의 매력을 ${store} 감성으로 완성하다`,
    `${store}에서 만나는 오늘의 ${product}`,
    `${product} 한 잔으로 기억되는 ${store}`,
  ];

  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function applyProjectTextField(
  elements: EditorElement[],
  projectData: HomeProjectData,
  field: 'storeName' | 'mainSlogan',
  value: string
) {
  const nextProjectData =
    field === 'storeName' ? { ...projectData, storeName: value } : { ...projectData, mainSlogan: value };

  return {
    nextProjectData,
    nextElements: updateProjectTextElements(elements, nextProjectData, field),
  };
}

export function toggleAdditionalInfoElements(
  elements: EditorElement[],
  projectData: HomeProjectData | null,
  viewKey: AdditionalInfoKey,
  nextVisible: boolean,
  nextVisibility: Record<string, boolean>,
) {
  // EditorElement.label 은 UI 레이블(한국어)이므로 key → label 변환하여 필터링.
  const uiLabel = getAdditionalInfoLabel(viewKey);
  const withoutCurrentInfo = elements.filter(
    (element) => element.label !== uiLabel && element.label !== `${uiLabel} 아이콘`
  );

  // 2. nextVisible=true면 nextVisibility 기준으로 새 elements 생성
  const newElements = nextVisible
    ? createAdditionalInfoElements(projectData, viewKey, nextVisibility)
    : [];
  const newIds = new Set(newElements.map((el) => el.id));

  // 3. 나머지 info elements(다른 항목)의 좌표를 nextVisibility 기준으로 재배치
  //    — 우측 정렬 특성상 1개 visible 변경 시 나머지 아이콘 위치가 모두 이동해야 함
  const presets = computeFooterPresets(projectData, nextVisibility);
  const repositioned = withoutCurrentInfo
    .filter((el) => !newIds.has(el.id))
    .map((el) => {
      const textMatch = el.id.match(/^info-text-(\d+)$/);
      if (textMatch) {
        const idx = Number(textMatch[1]) - 1;
        const matchKey = ADDITIONAL_INFO_KEYS[idx];
        const p = matchKey ? presets[matchKey] : undefined;
        if (p) return { ...el, x: p.text.x, y: p.text.y, width: p.text.width, height: p.text.height };
      }
      const imgMatch = el.id.match(/^info-image-(\d+)$/);
      if (imgMatch) {
        const idx = Number(imgMatch[1]) - 1;
        const matchKey = ADDITIONAL_INFO_KEYS[idx];
        const p = matchKey ? presets[matchKey] : undefined;
        if (p) return { ...el, x: p.image.x, y: p.image.y, width: p.image.width, height: p.image.height };
      }
      return el;
    });

  return [...repositioned, ...newElements];
}

