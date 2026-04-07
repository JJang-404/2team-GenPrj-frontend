import type {
  BackgroundMode,
  EditorElement,
  TemplateDefinition,
} from '../types/editor-core';
import type { HomeProjectData, HomeProductInput } from '../types/home';
import { getAdditionalInfoDisplayText, getAdditionalInfoIcon } from './additionalInfo';
import { cloneTemplateElements } from './editor';

export const additionalInfoLabels = [
  '주차 공간 수',
  '애견 동반 가능 여부',
  '노키즈존',
  '흡연 구역 존재 여부',
  '엘리베이터 존재 여부',
  '전화번호',
  '주소',
] as const;

export const additionalInfoPresets: Record<
  string,
  {
    text: { x: number; y: number; width: number; height: number };
    image: { x: number; y: number; width: number; height: number };
  }
> = {
  '주차 공간 수': { text: { x: 10, y: 78, width: 24, height: 6 }, image: { x: 34, y: 76, width: 12, height: 12 } },
  '애견 동반 가능 여부': { text: { x: 58, y: 78, width: 26, height: 6 }, image: { x: 80, y: 76, width: 12, height: 12 } },
  '노키즈존': { text: { x: 10, y: 66, width: 20, height: 6 }, image: { x: 34, y: 64, width: 12, height: 12 } },
  '흡연 구역 존재 여부': { text: { x: 58, y: 66, width: 26, height: 6 }, image: { x: 80, y: 64, width: 12, height: 12 } },
  '엘리베이터 존재 여부': { text: { x: 10, y: 90, width: 26, height: 6 }, image: { x: 34, y: 88, width: 12, height: 12 } },
  '전화번호': { text: { x: 56, y: 90, width: 28, height: 7 }, image: { x: 0, y: 0, width: 0, height: 0 } },
  주소: { text: { x: 8, y: 56, width: 34, height: 7 }, image: { x: 0, y: 0, width: 0, height: 0 } },
};

const homeDraftLayouts = [
  [
    { x: 34, y: 14, width: 52, rotation: 0 },
    { x: 8, y: 50, width: 22, rotation: -12 },
    { x: 10, y: 12, width: 20, rotation: 10 },
  ],
  [
    { x: 6, y: 26, width: 38, rotation: -4 },
    { x: 53, y: 22, width: 38, rotation: 5 },
    { x: 36, y: 62, width: 22, rotation: 0 },
  ],
  [
    { x: 7, y: 43, width: 34, rotation: -9 },
    { x: 58, y: 18, width: 34, rotation: 7 },
    { x: 40, y: 12, width: 16, rotation: -4 },
  ],
  [
    { x: 27, y: 28, width: 45, rotation: 0 },
    { x: 8, y: 55, width: 24, rotation: -8 },
    { x: 68, y: 55, width: 24, rotation: 8 },
  ],
] as const;

const fallbackSloganPositions = [
  { x: 8, y: 8, width: 62 },
  { x: 8, y: 8, width: 62 },
  { x: 10, y: 10, width: 58 },
  { x: 8, y: 10, width: 60 },
] as const;

const extraLayoutPresets: Record<
  string,
  Array<{ x: number; y: number; width: number; height: number; rotation: number }>
> = {
  'template-split-hero': [
    { x: 58, y: 58, width: 18, height: 20, rotation: -10 },
    { x: 36, y: 10, width: 18, height: 18, rotation: 12 },
  ],
  'template-dual-drink': [{ x: 36, y: 60, width: 22, height: 24, rotation: 0 }],
  'template-pop-board': [
    { x: 18, y: 18, width: 18, height: 20, rotation: -12 },
    { x: 72, y: 58, width: 16, height: 18, rotation: 14 },
  ],
  'template-arch-premium': [
    { x: 14, y: 52, width: 18, height: 22, rotation: -8 },
    { x: 68, y: 55, width: 18, height: 22, rotation: 8 },
  ],
};

export function slugInfoLabel(label: string) {
  return String(additionalInfoLabels.indexOf(label as (typeof additionalInfoLabels)[number]) + 1);
}

export function isPrimaryImageElement(element: EditorElement) {
  if (element.kind !== 'image') return false;
  if (/(splash|badge)/i.test(element.id) || /(스플래시|배지)/.test(element.label)) return false;
  return /(product|object|drink|latte)/i.test(element.id) || /(객체|제품|라떼)/.test(element.label);
}

function isDecorativeElement(element: EditorElement) {
  if (element.kind !== 'image') return false;
  return /(splash|badge|decoration|ornament)/i.test(element.id) || /(스플래시|배지|장식)/.test(element.label);
}

export function shouldShowAdditionalInfoIcon(projectData: HomeProjectData | null, label: string) {
  const info = projectData?.additionalInfo;
  if (!info) return false;

  switch (label) {
    case '주차 공간 수':
      return Boolean(info.parkingSpaces.trim());
    case '애견 동반 가능 여부':
    case '노키즈존':
    case '흡연 구역 존재 여부':
    case '엘리베이터 존재 여부':
      return true;
    default:
      return false;
  }
}

export function shouldShowAdditionalInfoText(projectData: HomeProjectData | null, label: string) {
  const info = projectData?.additionalInfo;
  if (!info) return false;

  switch (label) {
    case '전화번호':
      return Boolean(info.phoneNumber.trim());
    case '주소':
      return Boolean(info.address.trim());
    default:
      return false;
  }
}

export function applyDraftLayoutVariant(elements: EditorElement[], draftIndex: number) {
  const layout = homeDraftLayouts[draftIndex % homeDraftLayouts.length];
  const productElements = elements.filter(isPrimaryImageElement).slice(0, layout.length);
  const productIds = new Set(productElements.map((element) => element.id));

  let productCursor = 0;
  return elements.map((element) => {
    if (productIds.has(element.id)) {
      const slot = layout[productCursor] ?? layout[0];
      productCursor += 1;
      return { ...element, x: slot.x, y: slot.y, width: slot.width, rotation: slot.rotation };
    }

    if (element.id === 'fallback-main-slogan') {
      const slot = fallbackSloganPositions[draftIndex % fallbackSloganPositions.length];
      return { ...element, x: slot.x, y: slot.y, width: slot.width };
    }

    if (element.id === 'fallback-store-name') {
      return { ...element, x: 12, y: 88, width: 56 };
    }

    return element;
  });
}

export function applyElementVisibilityRules(
  _templateId: string | null,
  elements: EditorElement[],
  _backgroundMode: BackgroundMode,
  _projectData: HomeProjectData | null
) {
  return elements.map((element) => {
    if (!isDecorativeElement(element)) {
      return element;
    }
    return { ...element, hidden: true };
  });
}

export function mapProjectDataToTemplate(template: TemplateDefinition, projectData: HomeProjectData | null) {
  const baseElements = cloneTemplateElements(template);
  if (!projectData) return baseElements;

  const activeProducts = projectData.products.filter(
    (product) => product.image || product.name || product.price || product.description || product.isAiGen
  );
  const firstProduct = activeProducts[0];
  const primaryImages = baseElements.filter(isPrimaryImageElement);
  const usedProductIds = new Set<number>();
  const extras: EditorElement[] = [];
  const matchedFields = { store: false, slogan: false, details: false, price: false };

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

export function buildGuideSummary(projectData: HomeProjectData | null, template: TemplateDefinition | null) {
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

export function updateProjectTextElements(
  elements: EditorElement[],
  projectData: HomeProjectData | null,
  field: 'storeName' | 'mainSlogan'
) {
  if (!projectData) return elements;

  const nextValue = field === 'storeName' ? projectData.storeName : projectData.mainSlogan;
  const fallbackId = field === 'storeName' ? 'fallback-store-name' : 'fallback-main-slogan';

  return elements.map((element) => {
    const normalizedLabel = `${element.id} ${element.label}`.toLowerCase();

    if (element.id === fallbackId) {
      return { ...element, text: nextValue };
    }

    if (field === 'storeName' && element.kind === 'text' && /(store|brand|가게명|브랜드명)/.test(normalizedLabel)) {
      return { ...element, text: nextValue, color: projectData.options.brandColor };
    }

    if (
      field === 'mainSlogan' &&
      element.kind === 'text' &&
      (/(headline|title|타이틀)/.test(normalizedLabel) || /(subcopy|광고 문구|보조 타이틀|copy)/.test(normalizedLabel))
    ) {
      return { ...element, text: nextValue };
    }

    return element;
  });
}

export function createAdditionalInfoElements(projectData: HomeProjectData | null, label: string) {
  const preset = additionalInfoPresets[label];
  const slug = slugInfoLabel(label);
  const elements: EditorElement[] = [];

  if (!preset) return elements;

  if (shouldShowAdditionalInfoText(projectData, label)) {
    elements.push({
      id: `info-text-${slug}`,
      kind: 'text',
      label,
      text: getAdditionalInfoDisplayText(projectData, label),
      x: preset.text.x,
      y: preset.text.y,
      width: preset.text.width,
      height: preset.text.height,
      rotation: 0,
      zIndex: 20,
      fontSize: 12,
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: 0,
      color: '#ffffff',
      align: 'left',
      opacity: 1,
    });
  }

  if (shouldShowAdditionalInfoIcon(projectData, label)) {
    elements.push({
      id: `info-image-${slug}`,
      kind: 'image',
      label: `${label} 아이콘`,
      x: preset.image.x,
      y: preset.image.y,
      width: preset.image.width,
      height: preset.image.height,
      rotation: 0,
      zIndex: 21,
      imageUrl: getAdditionalInfoIcon(projectData, label),
      imageFit: 'contain',
      opacity: 1,
      hidden: false,
    });
  }

  return elements;
}

export function createCustomTextElement(label: string): EditorElement {
  const elementLabel = label || '새 텍스트';
  return {
    id: `custom-text-${Date.now()}`,
    kind: 'text',
    label: elementLabel,
    text: elementLabel,
    x: 28,
    y: 24,
    width: 36,
    height: 10,
    rotation: 0,
    zIndex: 40,
    fontSize: 24,
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: 0,
    color: '#ffffff',
    align: 'center',
    opacity: 1,
  };
}

export function createCustomImageElement(imageUrl: string, label: string): EditorElement {
  return {
    id: `custom-image-${Date.now()}`,
    kind: 'image',
    label: label || '추가 상품 사진',
    x: 34,
    y: 30,
    width: 24,
    height: 24,
    rotation: 0,
    zIndex: 41,
    imageUrl,
    imageFit: 'contain',
    opacity: 1,
  };
}
