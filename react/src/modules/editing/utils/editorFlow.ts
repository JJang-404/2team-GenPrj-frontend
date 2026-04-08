import type {
  BackgroundMode,
  EditorElement,
  TemplateDefinition,
} from '../types/editor-core';
import type { HomeProjectData, HomeProductInput } from '../types/home';
import { getDraftProductSlots, getDraftTextPlacements } from '../../../shared/draftLayout';
import { getDraftTypography } from '../../../shared/draftTypography';
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

const DEFAULT_TITLE_FONT = '"ZenSerif", serif';

function normalizePriceCurrency(currency?: string): '원' | '$' {
  return currency === '$' || currency === '달러' ? '$' : '원';
}

export function slugInfoLabel(label: string) {
  return String(additionalInfoLabels.indexOf(label as (typeof additionalInfoLabels)[number]) + 1);
}

export function isPrimaryImageElement(element: EditorElement) {
  if (element.kind !== 'image') return false;
  if (/(splash|badge)/i.test(element.id) || /(스플래시|배지)/.test(element.label)) return false;
  return /(product|object|drink|latte)/i.test(element.id) || /(객체|제품|라떼)/.test(element.label);
}

function isDecorativeElement(element: EditorElement) {
  if (element.kind === 'image') {
    return /(splash|badge|decoration|ornament)/i.test(element.id) || /(스플래시|배지|장식)/.test(element.label);
  }

  if (element.kind === 'shape') {
    return /(arch-panel|diagonal|panel|overlay|shape)/i.test(element.id) || /(아치|대각선|면|패널|장식)/.test(element.label);
  }

  return false;
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
  const layout = getDraftProductSlots(draftIndex, elements.filter(isPrimaryImageElement).length);
  const textPlacements = getDraftTextPlacements(draftIndex);
  const productElements = elements.filter(isPrimaryImageElement).slice(0, layout.length);
  const productIds = new Set(productElements.map((element) => element.id));

  let productCursor = 0;
  return elements.map((element) => {
    if (productIds.has(element.id)) {
      const slot = layout[productCursor] ?? layout[0];
      productCursor += 1;
      return {
        ...element,
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
        rotation: slot.rotation,
      };
    }

    if (element.id === 'fallback-main-slogan') {
      return {
        ...element,
        x: textPlacements.slogan.x,
        y: textPlacements.slogan.y,
        width: textPlacements.slogan.width,
        rotation: textPlacements.slogan.rotation ?? element.rotation,
        zIndex: textPlacements.slogan.zIndex ?? element.zIndex,
        align: textPlacements.slogan.align ?? element.align,
      };
    }

    if (element.id === 'fallback-store-name') {
      return {
        ...element,
        x: textPlacements.store.x,
        y: textPlacements.store.y,
        width: textPlacements.store.width,
        rotation: textPlacements.store.rotation ?? element.rotation,
        zIndex: textPlacements.store.zIndex ?? element.zIndex,
        align: textPlacements.store.align ?? element.align,
      };
    }

    if (element.id === 'fallback-details') {
      return {
        ...element,
        x: textPlacements.details.x,
        y: textPlacements.details.y,
        width: textPlacements.details.width,
        rotation: textPlacements.details.rotation ?? element.rotation,
        zIndex: textPlacements.details.zIndex ?? element.zIndex,
        align: textPlacements.details.align ?? element.align,
      };
    }

    if (element.id === 'fallback-product-summary') {
      return {
        ...element,
        x: textPlacements.summary.x,
        y: textPlacements.summary.y,
        width: textPlacements.summary.width,
        rotation: textPlacements.summary.rotation ?? element.rotation,
        zIndex: textPlacements.summary.zIndex ?? element.zIndex,
        align: textPlacements.summary.align ?? element.align,
      };
    }

    if (element.kind === 'text') {
      const normalizedLabel = `${element.id} ${element.label}`.toLowerCase();

      if (/(store|brand|가게명|브랜드명)/.test(normalizedLabel)) {
        return {
          ...element,
          x: textPlacements.store.x,
          y: textPlacements.store.y,
          width: textPlacements.store.width,
          rotation: textPlacements.store.rotation ?? element.rotation,
          zIndex: textPlacements.store.zIndex ?? element.zIndex,
          align: textPlacements.store.align ?? element.align,
        };
      }

      if (/(headline|title|타이틀|subcopy|광고 문구|보조 타이틀|copy)/.test(normalizedLabel)) {
        return {
          ...element,
          x: textPlacements.slogan.x,
          y: textPlacements.slogan.y,
          width: textPlacements.slogan.width,
          rotation: textPlacements.slogan.rotation ?? element.rotation,
          zIndex: textPlacements.slogan.zIndex ?? element.zIndex,
          align: textPlacements.slogan.align ?? element.align,
        };
      }

      if (/(description|설명|footer|cta|하단 문구)/.test(normalizedLabel)) {
        return {
          ...element,
          x: textPlacements.details.x,
          y: textPlacements.details.y,
          width: textPlacements.details.width,
          rotation: textPlacements.details.rotation ?? element.rotation,
          zIndex: textPlacements.details.zIndex ?? element.zIndex,
          align: textPlacements.details.align ?? element.align,
        };
      }

      if (/(price|가격)/.test(normalizedLabel)) {
        return {
          ...element,
          x: textPlacements.summary.x,
          y: textPlacements.summary.y,
          width: textPlacements.summary.width,
          rotation: textPlacements.summary.rotation ?? element.rotation,
          zIndex: textPlacements.summary.zIndex ?? element.zIndex,
          align: textPlacements.summary.align ?? element.align,
        };
      }
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
  const visiblePriceText = activeProducts
    .filter((product) => product.showPrice && product.price?.trim())
    .map((product) => `${product.price}${normalizePriceCurrency(product.currency)}`)
    .join(' / ');
  const visibleProductSummaryText = activeProducts
    .map((product) =>
      [
        product.showName && product.name?.trim() ? product.name : '',
        product.showPrice && product.price?.trim() ? `${product.price}${normalizePriceCurrency(product.currency)}` : '',
      ]
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .join('  /  ');

  const mapped = baseElements.map((element) => {
    if (element.kind === 'image') {
      const imageIndex = primaryImages.findIndex((item) => item.id === element.id);
      const product = imageIndex >= 0 ? activeProducts[imageIndex] ?? null : null;

      if (product?.image) {
        usedProductIds.add(product.id);
      return {
        ...element,
        imageUrl: product.image,
        hidden: false,
        productName: product.name ?? '',
        productPrice: product.price ?? '',
        productDescription: product.description ?? '',
        priceCurrency: normalizePriceCurrency(product.currency),
      };
      }
      if (imageIndex >= 0) {
        return { ...element, hidden: true };
      }
      return element;
    }

    const normalizedLabel = `${element.id} ${element.label}`.toLowerCase();

    if (/(store|brand|가게명|브랜드명)/.test(normalizedLabel) && projectData.storeName) {
      matchedFields.store = true;
      return {
        ...element,
        text: projectData.storeName,
        color: projectData.options.brandColor,
        hidden: false,
        fontFamily: DEFAULT_TITLE_FONT,
      };
    }
    if (/(store|brand|가게명|브랜드명)/.test(normalizedLabel) && !projectData.storeName) {
      return { ...element, text: '', hidden: true };
    }

    if (/(headline|title|타이틀)/.test(normalizedLabel)) {
      if (projectData.mainSlogan) {
        matchedFields.slogan = true;
        return { ...element, text: projectData.mainSlogan, hidden: false, fontFamily: DEFAULT_TITLE_FONT };
      }
      return { ...element, text: '', hidden: true };
    }

    if (/(subcopy|광고 문구|보조 타이틀|copy)/.test(normalizedLabel)) {
      if (projectData.mainSlogan) {
        matchedFields.slogan = true;
        return { ...element, text: projectData.mainSlogan, hidden: false, fontFamily: DEFAULT_TITLE_FONT };
      }
      return { ...element, text: '', hidden: true };
    }

    if (/(vertical|세로문구)/.test(normalizedLabel)) {
      return { ...element, text: '', hidden: true };
    }

    if (/(description|설명|footer|cta|하단 문구)/.test(normalizedLabel)) {
      if (projectData.details) {
        matchedFields.details = true;
        return { ...element, text: projectData.details, hidden: false, fontFamily: DEFAULT_TITLE_FONT };
      }
      return { ...element, text: '', hidden: true };
    }

    if (/(price|가격)/.test(normalizedLabel) && visiblePriceText) {
      matchedFields.price = true;
      return { ...element, text: visiblePriceText, hidden: false, fontFamily: DEFAULT_TITLE_FONT };
    }

    if (/(price|가격)/.test(normalizedLabel) && !visiblePriceText) {
      return { ...element, text: '', hidden: true };
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
      productName: product.name ?? '',
      productPrice: product.price ?? '',
      productDescription: product.description ?? '',
      priceCurrency: normalizePriceCurrency(product.currency),
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
        text: [
          product.showName && product.name?.trim() ? product.name : '',
          product.showPrice && product.price?.trim()
            ? `${product.price}${normalizePriceCurrency(product.currency)}`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1.15,
        letterSpacing: 0,
        color: '#ffffff',
        align: 'center',
        fontFamily: DEFAULT_TITLE_FONT,
        opacity: 1,
      });
    }
  });

  const productSummaryText = visibleProductSummaryText;

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
      fontFamily: DEFAULT_TITLE_FONT,
      opacity: 1,
    });
  }

  if (projectData.mainSlogan && !matchedFields.slogan) {
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
      text: projectData.mainSlogan,
      fontSize: 24,
      fontWeight: 900,
      lineHeight: 1.05,
      letterSpacing: 0,
      color: '#ffffff',
      align: 'left',
      fontFamily: DEFAULT_TITLE_FONT,
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
      fontFamily: DEFAULT_TITLE_FONT,
      opacity: 1,
    });
  }

  if (productSummaryText && !matchedFields.price) {
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
      text: productSummaryText,
      fontSize: 12,
      fontWeight: 800,
      lineHeight: 1.15,
      letterSpacing: 0,
      color: '#fde68a',
      align: 'left',
      fontFamily: DEFAULT_TITLE_FONT,
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
  const typography = getDraftTypography(projectData.options.draftIndex ?? 0, projectData.options.ratio);

  return elements.map((element) => {
    const normalizedLabel = `${element.id} ${element.label}`.toLowerCase();

    if (element.id === fallbackId) {
      return {
        ...element,
        text: nextValue,
        fontSize: field === 'storeName' ? typography.storeSize : typography.sloganSize,
        lineHeight: field === 'storeName' ? typography.storeLineHeight : typography.sloganLineHeight,
      };
    }

    if (field === 'storeName' && element.kind === 'text' && /(store|brand|가게명|브랜드명)/.test(normalizedLabel)) {
      return {
        ...element,
        text: nextValue,
        color: projectData.options.brandColor,
        fontSize: typography.storeSize,
        lineHeight: typography.storeLineHeight,
      };
    }

    if (
      field === 'mainSlogan' &&
      element.kind === 'text' &&
      (/(headline|title|타이틀)/.test(normalizedLabel) || /(subcopy|광고 문구|보조 타이틀|copy)/.test(normalizedLabel))
    ) {
      return {
        ...element,
        text: nextValue,
        fontSize: typography.sloganSize,
        lineHeight: typography.sloganLineHeight,
      };
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
    fontFamily: DEFAULT_TITLE_FONT,
    opacity: 1,
  };
}

export function applyDraftTypographyVariant(elements: EditorElement[], projectData: HomeProjectData | null) {
  if (!projectData) return elements;

  const typography = getDraftTypography(projectData.options.draftIndex ?? 0, projectData.options.ratio);

  return elements.map((element) => {
    if (element.kind !== 'text') return element;
    const normalizedLabel = `${element.id} ${element.label}`.toLowerCase();

    if (/(store|brand|가게명|브랜드명)/.test(normalizedLabel) || element.id === 'fallback-store-name') {
      return {
        ...element,
        fontSize: typography.storeSize,
        lineHeight: typography.storeLineHeight,
        fontFamily: DEFAULT_TITLE_FONT,
      };
    }

    if (
      /(headline|title|타이틀|subcopy|광고 문구|보조 타이틀|copy)/.test(normalizedLabel) ||
      element.id === 'fallback-main-slogan'
    ) {
      return {
        ...element,
        fontSize: typography.sloganSize,
        lineHeight: typography.sloganLineHeight,
        fontFamily: DEFAULT_TITLE_FONT,
      };
    }

    if (/(description|설명|footer|cta|하단 문구)/.test(normalizedLabel) || element.id === 'fallback-details') {
      return {
        ...element,
        fontSize: typography.detailsSize,
        fontFamily: DEFAULT_TITLE_FONT,
      };
    }

    if (/(price|가격)/.test(normalizedLabel) || element.id === 'fallback-product-summary') {
      return {
        ...element,
        fontSize: typography.summarySize,
        fontFamily: DEFAULT_TITLE_FONT,
      };
    }

    return element;
  });
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
    productName: '',
    productPrice: '',
    productDescription: '',
    priceCurrency: '원',
    opacity: 1,
  };
}
