import type { BackgroundMode, EditorElement, TemplateDefinition } from '../types/editor-core';
import type { HomeProjectData } from '../types/home';
import { createAdditionalInfoElements, updateProjectTextElements } from './editorFlow';

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
  label: string,
  nextVisible: boolean
) {
  const nextInfoElements = createAdditionalInfoElements(projectData, label);
  const nextIds = new Set(nextInfoElements.map((element) => element.id));
  const withoutCurrentInfo = elements.filter(
    (element) => element.label !== label && element.label !== `${label} 아이콘`
  );

  if (!nextVisible) {
    return withoutCurrentInfo;
  }

  return [...withoutCurrentInfo.filter((element) => !nextIds.has(element.id)), ...nextInfoElements];
}

