import type {
  BackgroundMode,
  EditorElement,
  TemplateDefinition,
} from '../types/editor-core';
import type { HomeProjectData, HomeProductInput } from '../types/home';
import {
  computeWireframeProductPlacements,
  deriveWireframeLayout,
  type WireframeProductPlacement,
} from './wireframeLayout';
import { WIREFRAME_TEXT_PLACEMENTS } from './wireframeTextPlacements';
import { MAIN_ZONE_4x5, computeMainZone916, computeMainZoneFromZones, type FrameZone } from './wireframeBridge';

/**
 * Legacy text placement table — bitwise copy of shared/draftLayout.ts DRAFT_LAYOUTS[0..3].{store,slogan,details,summary}.
 *
 * This exists so editing can stop importing from shared/draftLayout while the
 * fallback-details / fallback-product-summary / generic text regex branches
 * keep rendering identical coordinates. Only `store` and `slogan` are
 * overridden by the wireframe-derived layout; `details` and `summary` fall
 * through to these values.
 *
 * If shared/draftLayout.ts ever changes upstream, these values must be
 * re-synced or the divergence justified.
 */
interface LegacyTextRect {
  x: number;
  y: number;
  width: number;
  rotation?: number;
  zIndex?: number;
  align?: 'left' | 'center' | 'right';
}
interface LegacyTextPlacements {
  store: LegacyTextRect;
  slogan: LegacyTextRect;
  details: LegacyTextRect;
  summary: LegacyTextRect;
}
const LEGACY_TEXT_PLACEMENTS: LegacyTextPlacements[] = [
  // draftIndex 0 (Type1)
  {
    store: { x: 18, y: 7, width: 64, align: 'center', rotation: 0, zIndex: 30 },
    slogan: { x: 16, y: 16, width: 68, align: 'center', rotation: 0, zIndex: 29 },
    details: { x: 14, y: 74, width: 72, align: 'center', rotation: 0, zIndex: 28 },
    summary: { x: 18, y: 86, width: 64, align: 'center', rotation: 0, zIndex: 28 },
  },
  // draftIndex 1 (Type2)
  {
    store: { x: 10, y: 10, width: 48, align: 'left', rotation: -3, zIndex: 30 },
    slogan: { x: 12, y: 21, width: 42, align: 'left', rotation: 0, zIndex: 29 },
    details: { x: 66, y: 74, width: 24, align: 'right', rotation: 0, zIndex: 28 },
    summary: { x: 64, y: 86, width: 26, align: 'right', rotation: 0, zIndex: 28 },
  },
  // draftIndex 2 (Type3)
  {
    store: { x: 22, y: 83, width: 56, align: 'center', rotation: 0, zIndex: 30 },
    slogan: { x: 24, y: 90, width: 52, align: 'center', rotation: 0, zIndex: 29 },
    details: { x: 18, y: 12, width: 64, align: 'center', rotation: 0, zIndex: 28 },
    summary: { x: 26, y: 74, width: 48, align: 'center', rotation: 90, zIndex: 28 },
  },
  // draftIndex 3 (Type4)
  {
    store: { x: 14, y: 11, width: 72, align: 'center', rotation: 0, zIndex: 30 },
    slogan: { x: 20, y: 23, width: 60, align: 'center', rotation: 0, zIndex: 29 },
    details: { x: 16, y: 77, width: 68, align: 'center', rotation: 0, zIndex: 28 },
    summary: { x: 24, y: 88, width: 52, align: 'center', rotation: 0, zIndex: 28 },
  },
];
import type { ZonePositions } from '../types/home';

export function getDefaultZonePositions(draftIndex: number): ZonePositions {
  const typeIndex = (((draftIndex % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  const p = LEGACY_TEXT_PLACEMENTS[typeIndex];
  return {
    store: { x: p.store.x, y: p.store.y, width: p.store.width, align: p.store.align, rotation: p.store.rotation, zIndex: p.store.zIndex },
    slogan: { x: p.slogan.x, y: p.slogan.y, width: p.slogan.width, align: p.slogan.align, rotation: p.slogan.rotation, zIndex: p.slogan.zIndex },
    details: { x: p.details.x, y: p.details.y, width: p.details.width, align: p.details.align, rotation: p.details.rotation, zIndex: p.details.zIndex },
    summary: { x: p.summary.x, y: p.summary.y, width: p.summary.width, align: p.summary.align, rotation: p.summary.rotation, zIndex: p.summary.zIndex },
  };
}

import { getDraftTypography } from '../../../shared/draftTypography';

/**
 * 템플릿 없이 wireframe + zone 좌표에서 직접 EditorElement[]를 생성한다.
 * WireframeChoiceCard의 Layout 렌더링과 동일한 결과를 elements 배열로 표현.
 */
export function createElementsFromWireframe(projectData: HomeProjectData): EditorElement[] {
  const draftIndex = projectData.options.draftIndex ?? 0;
  const typeIndex = (((draftIndex % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  const ratio = projectData.options.ratio ?? '4:5';
  const zones = projectData.zonePositions ?? getDefaultZonePositions(draftIndex);
  const typography = getDraftTypography(draftIndex, ratio);

  const elements: EditorElement[] = [];

  if (projectData.storeName) {
    elements.push({
      id: 'fallback-store-name',
      kind: 'text',
      label: '가게명',
      x: zones.store.x,
      y: zones.store.y,
      width: zones.store.width,
      height: 8,
      rotation: zones.store.rotation ?? 0,
      zIndex: zones.store.zIndex ?? 13,
      text: projectData.storeName,
      fontSize: typography.storeSize,
      fontWeight: 900,
      lineHeight: typography.storeLineHeight,
      letterSpacing: 0,
      color: projectData.options.brandColor || DEFAULT_TEXT_COLOR,
      align: zones.store.align ?? 'center',
      fontFamily: DEFAULT_TITLE_FONT,
      opacity: 1,
    });
  }

  if (projectData.mainSlogan) {
    elements.push({
      id: 'fallback-main-slogan',
      kind: 'text',
      label: '소개 문구',
      x: zones.slogan.x,
      y: zones.slogan.y,
      width: zones.slogan.width,
      height: 12,
      rotation: zones.slogan.rotation ?? 0,
      zIndex: zones.slogan.zIndex ?? 13,
      text: projectData.mainSlogan,
      fontSize: typography.sloganSize,
      fontWeight: 900,
      lineHeight: typography.sloganLineHeight,
      letterSpacing: 0,
      color: DEFAULT_TEXT_COLOR,
      align: zones.slogan.align ?? 'center',
      fontFamily: DEFAULT_TITLE_FONT,
      opacity: 1,
    });
  }

  if (projectData.details) {
    elements.push({
      id: 'fallback-details',
      kind: 'text',
      label: '상세 설명',
      x: zones.details.x,
      y: zones.details.y,
      width: zones.details.width,
      height: 10,
      rotation: zones.details.rotation ?? 0,
      zIndex: zones.details.zIndex ?? 12,
      text: projectData.details,
      fontSize: typography.detailsSize,
      fontWeight: 500,
      lineHeight: 1.3,
      letterSpacing: 0,
      color: DEFAULT_TEXT_COLOR,
      align: zones.details.align ?? 'center',
      fontFamily: DEFAULT_TITLE_FONT,
      opacity: 1,
    });
  }

  const activeProducts = projectData.products.filter((p) => p.image);
  const productCount = activeProducts.length;
  const hasSlogan = Boolean(projectData.mainSlogan);

  if (productCount > 0) {
    const isTall = ratio === '9:16';
    const mainZone: FrameZone = isTall
      ? computeMainZone916()
      : computeMainZoneFromZones(zones.store.y, zones.slogan.y);

    const rawPlacements = computeWireframeProductPlacements(
      typeIndex,
      productCount,
      hasSlogan,
      activeProducts,
    );

    rawPlacements.forEach((p, i) => {
      const product = activeProducts[i];
      if (!product) return;

      const rect = {
        x: mainZone.x + (p.rect.x / 100) * mainZone.w,
        y: mainZone.y + (p.rect.y / 100) * mainZone.h,
        width: (p.rect.width / 100) * mainZone.w,
        height: (p.rect.height / 100) * mainZone.h,
      };

      elements.push({
        id: `product-${product.id}`,
        kind: 'image',
        label: product.name || `제품 ${i + 1}`,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rotation: 0,
        zIndex: 10 + (p.zIndex ?? 0),
        imageUrl: p.imageUrlOverride || product.image || '',
        imageFit: 'contain',
        opacity: 1,
        productName: product.name ?? '',
        productPrice: product.price ?? '',
        productDescription: product.description ?? '',
        priceCurrency: (product.currency === '$' ? '$' : '원') as '원' | '$',
      });

      // 상품 정보(이름, 가격 등) 텍스트 요소 추가
      const metaTexts = buildProductTextElements(product, i);
      metaTexts.forEach((te) => {
        elements.push(placeProductMetaElement(te, rect, typeIndex));
      });
    });
  }

  /* [MODIFIED] 추가 정보(주소/전화번호) 초기 자동 생성 로직 추가 (원복 시 아래 로직 전체 삭제) */
  additionalInfoLabels.forEach((label) => {
    if (shouldShowAdditionalInfoText(projectData, label)) {
      const infoElements = createAdditionalInfoElements(projectData, label);
      infoElements.forEach(el => {
        if (el.id.startsWith('info-text-')) {
          const preset = additionalInfoPresets[label];
          el.x = preset ? preset.text.x : 5;
          el.width = preset ? preset.text.width : 90;
          el.align = 'center';
          el.fontSize = 11;
          el.color = DEFAULT_TEXT_COLOR;
        }
        elements.push(el);
      });
    }
  });

  return elements;
}
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
  '주차 공간 수': { text: { x: 10, y: 78, width: 24, height: 6 }, image: { x: 86, y: 88, width: 7, height: 7 } },
  '애견 동반 가능 여부': { text: { x: 58, y: 78, width: 26, height: 6 }, image: { x: 78, y: 88, width: 7, height: 7 } },
  '노키즈존': { text: { x: 10, y: 66, width: 20, height: 6 }, image: { x: 70, y: 88, width: 7, height: 7 } },
  '흡연 구역 존재 여부': { text: { x: 58, y: 66, width: 26, height: 6 }, image: { x: 86, y: 80, width: 7, height: 7 } },
  '엘리베이터 존재 여부': { text: { x: 10, y: 90, width: 26, height: 6 }, image: { x: 78, y: 80, width: 7, height: 7 } },
  /* [ORIGINAL]
  '전화번호': { text: { x: 56, y: 90, width: 28, height: 7 }, image: { x: 0, y: 0, width: 0, height: 0 } },
  주소: { text: { x: 8, y: 56, width: 34, height: 7 }, image: { x: 0, y: 0, width: 0, height: 0 } },
  [MODIFIED] Footer 겹침 방지 및 라운드 테두리 대응 안전 여백 적용 (백업 기준)
  */
  '전화번호': { text: { x: 5, y: 96, width: 90, height: 7 }, image: { x: 0, y: 0, width: 0, height: 0 } },
  주소: { text: { x: 5, y: 92.5, width: 90, height: 7 }, image: { x: 0, y: 0, width: 0, height: 0 } },
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
const DEFAULT_TEXT_COLOR = '#000000';

function buildProductTextElements(product: HomeProductInput, index: number): EditorElement[] {
  const prefix = `product-meta-${product.id}`;
  const elements: EditorElement[] = [];

  if (product.showName && product.name?.trim()) {
    elements.push({
      id: `${prefix}-name`,
      kind: 'text',
      label: `상품명 ${index + 1}`,
      x: 8,
      y: 8,
      width: 20,
      height: 4,
      rotation: 0,
      zIndex: 24,
      text: product.name.trim(),
      fontSize: 10,
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: 0,
      color: DEFAULT_TEXT_COLOR,
      align: 'center',
      fontFamily: DEFAULT_TITLE_FONT,
      opacity: 1,
    });
  }

  if (product.showPrice && product.price?.trim()) {
    elements.push({
      id: `${prefix}-price`,
      kind: 'text',
      label: `상품 가격 ${index + 1}`,
      x: 8,
      y: 12,
      width: 20,
      height: 4,
      rotation: 0,
      zIndex: 24,
      text: `${product.price.trim()}${normalizePriceCurrency(product.currency)}`,
      fontSize: 9,
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: 0,
      color: DEFAULT_TEXT_COLOR,
      align: 'center',
      fontFamily: DEFAULT_TITLE_FONT,
      opacity: 1,
    });
  }

  if (product.showDesc && product.description?.trim()) {
    elements.push({
      id: `${prefix}-desc`,
      kind: 'text',
      label: `상품 소개문구 ${index + 1}`,
      x: 8,
      y: 16,
      width: 24,
      height: 6,
      rotation: 0,
      zIndex: 24,
      text: product.description.trim(),
      fontSize: 8,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: 0,
      color: DEFAULT_TEXT_COLOR,
      align: 'center',
      fontFamily: DEFAULT_TITLE_FONT,
      opacity: 1,
    });
  }

  return elements;
}

function placeProductMetaElement(
  element: EditorElement,
  rect: WireframeProductPlacement['rect'],
  draftIndex: 0 | 1 | 2 | 3,
): EditorElement {
  const isName = /-name$/.test(element.id);
  const isPrice = /-price$/.test(element.id);
  const meta = WIREFRAME_TEXT_PLACEMENTS[draftIndex].productMeta;
  const width = Math.max(
    rect.width,
    isName ? meta.nameMinWidth : isPrice ? meta.priceMinWidth : meta.descMinWidth,
  );
  const x = rect.x + (rect.width - width) / 2;
  const yOffset = isName ? meta.nameOffsetY : isPrice ? meta.priceOffsetY : meta.descOffsetY;
  const fontSize = isName ? 10 : isPrice ? 9 : 8;

  return {
    ...element,
    x,
    y: Math.min(95, rect.y + rect.height + yOffset),
    width,
    rotation: 0,
    align: 'center',
    fontSize,
    color: DEFAULT_TEXT_COLOR,
  };
}

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
      return true;
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

export function applyDraftLayoutVariant(
  elements: EditorElement[],
  draftIndex: number,
  projectData?: HomeProjectData | null,
) {
  const productCount = elements.filter(isPrimaryImageElement).length;
  // hasSlogan canonical source: presence of a `fallback-main-slogan` element with truthy text.
  // mapProjectDataToTemplate only creates that element when projectData.mainSlogan is set,
  // so this is equivalent to `Boolean(projectData?.mainSlogan)` without threading projectData.
  const hasSlogan = elements.some(
    (el) => el.id === 'fallback-main-slogan' && el.kind === 'text' && Boolean(el.text)
  );
  const typeIndex = (((draftIndex % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  const wireframe = deriveWireframeLayout(typeIndex, productCount, hasSlogan);

  // zone positions: projectData.zonePositions(state) 우선, 없으면 LEGACY 상수 fallback
  const zones = projectData?.zonePositions ?? getDefaultZonePositions(draftIndex);
  const storeRect = zones.store;
  const sloganRect = zones.slogan;

  // WireframeChoiceCard의 Layout 컴포넌트와 동일한 mainZone 계산
  const isTall = (projectData?.options.ratio ?? '4:5') === '9:16';
  const defaultMainZone: FrameZone = isTall ? computeMainZone916() : MAIN_ZONE_4x5;
  // Type 4: store/slogan이 상단이므로 제품 영역을 그 아래에 배치 (HalfCropGroupLayout과 동일)
  const mainZone: FrameZone = typeIndex === 3
    ? (() => {
      const sloganBottom = Math.max(zones.store.y, zones.slogan.y) + 7;
      return { x: 0, y: sloganBottom, w: 100, h: 100 - sloganBottom - 3 };
    })()
    : defaultMainZone;

  // Type 3/4는 제품 natural 크기 + pre-bake 반쪽 이미지가 필요하므로
  // projectData를 직접 전달받아 computeWireframeProductPlacements를 사용한다.
  // projectData가 없을 때는 기존 sw/sh fallback slotToRect 동작을 유지한다.
  // mapProjectDataToTemplate와 동일한 활성 제품 순서(primaryImages 기준)를 사용.
  const activeProducts: HomeProductInput[] = (projectData?.products ?? []).filter(
    (product) => product.image,
  );
  const rawPlacements: WireframeProductPlacement[] =
    projectData && activeProducts.length > 0
      ? computeWireframeProductPlacements(typeIndex, productCount, hasSlogan, activeProducts)
      : wireframe.productSlots.map((rect) => ({ rect }));

  // wireframeSlots 좌표(0-100%)를 mainZone 컨테이너 기준에서 전체 캔버스 기준으로 리매핑
  // (WireframeChoiceCard의 Layout이 mainZone div 안에서 렌더하는 것과 동일한 결과)
  const placements: WireframeProductPlacement[] = rawPlacements.map((p) => ({
    ...p,
    rect: {
      x: mainZone.x + (p.rect.x / 100) * mainZone.w,
      y: mainZone.y + (p.rect.y / 100) * mainZone.h,
      width: (p.rect.width / 100) * mainZone.w,
      height: (p.rect.height / 100) * mainZone.h,
    },
  }));

  // When placements is empty (productCount === 0 OR unsupported key), keep
  // existing element coordinates instead of overriding them.
  const useWireframeProducts = placements.length > 0;
  const productElements = elements
    .filter(isPrimaryImageElement)
    .slice(0, placements.length);
  const productIds = new Set(productElements.map((element) => element.id));
  const productPlacementById = new Map(
    activeProducts.slice(0, placements.length).map((product, index) => [String(product.id), placements[index]?.rect]),
  );

  let productCursor = 0;
  return elements.map((element) => {
    if (useWireframeProducts && productIds.has(element.id)) {
      const placement = placements[productCursor] ?? placements[0];
      productCursor += 1;
      const { rect, imageUrlOverride, zIndex: placementZ } = placement;
      const next: EditorElement = {
        ...element,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        // wireframe은 rotation을 지정하지 않으므로 0으로 초기화한다.
        // (템플릿 기본값이 남아있으면 main-preview/BackgroundCard에서
        // 의도치 않은 회전이 유지되는 문제를 방지.)
        rotation: 0,
        // Type 3 overlap pair: left=1, right=2 → 오른쪽이 왼쪽 위에 렌더.
        // element의 base zIndex에 placement offset을 더해 pair 내 상대 순서를 보장.
        // placementZ가 없는 Type 1/2/4는 element.zIndex 유지.
        zIndex: placementZ !== undefined ? element.zIndex + placementZ : element.zIndex,
      };
      // Type 4 half-crop: element.imageUrl을 pre-bake dataURL로 교체.
      // pre-bake 실패(override undefined)인 경우 원본 imageUrl을 유지.
      if (imageUrlOverride) {
        next.imageUrl = imageUrlOverride;
      }
      return next;
    }

    const productMetaMatch = element.id.match(/^product-meta-(.+)-(name|price|desc)$/);
    if (productMetaMatch) {
      const rect = productPlacementById.get(String(productMetaMatch[1]));
      if (rect) {
        return placeProductMetaElement(element, rect, typeIndex);
      }
    }

    if (element.id === 'fallback-main-slogan') {
      return {
        ...element,
        x: sloganRect.x,
        y: sloganRect.y,
        width: sloganRect.width,
        rotation: sloganRect.rotation ?? element.rotation,
        zIndex: sloganRect.zIndex ?? element.zIndex,
        align: sloganRect.align ?? element.align,
      };
    }

    if (element.id === 'fallback-store-name') {
      return {
        ...element,
        x: storeRect.x,
        y: storeRect.y,
        width: storeRect.width,
        rotation: storeRect.rotation ?? element.rotation,
        zIndex: storeRect.zIndex ?? element.zIndex,
        align: storeRect.align ?? element.align,
      };
    }

    if (element.id === 'fallback-details') {
      return {
        ...element,
        x: zones.details.x,
        y: zones.details.y,
        width: zones.details.width,
        rotation: zones.details.rotation ?? element.rotation,
        zIndex: zones.details.zIndex ?? element.zIndex,
        align: zones.details.align ?? element.align,
      };
    }

    if (element.id === 'fallback-product-summary') {
      return {
        ...element,
        x: zones.summary.x,
        y: zones.summary.y,
        width: zones.summary.width,
        rotation: zones.summary.rotation ?? element.rotation,
        zIndex: zones.summary.zIndex ?? element.zIndex,
        align: zones.summary.align ?? element.align,
      };
    }

    if (element.kind === 'text') {
      const normalizedLabel = `${element.id} ${element.label}`.toLowerCase();

      if (/(store|brand|가게명|브랜드명)/.test(normalizedLabel)) {
        return {
          ...element,
          x: zones.store.x,
          y: zones.store.y,
          width: zones.store.width,
          rotation: zones.store.rotation ?? element.rotation,
          zIndex: zones.store.zIndex ?? element.zIndex,
          align: zones.store.align ?? element.align,
        };
      }

      if (/(headline|title|타이틀)/.test(normalizedLabel)) {
        return {
          ...element,
          x: zones.slogan.x,
          y: zones.slogan.y,
          width: zones.slogan.width,
          rotation: zones.slogan.rotation ?? element.rotation,
          zIndex: zones.slogan.zIndex ?? element.zIndex,
          align: zones.slogan.align ?? element.align,
        };
      }

      if (/(subcopy|광고 문구|보조 타이틀|copy)/.test(normalizedLabel)) {
        const typo = getDraftTypography(draftIndex, projectData?.options?.ratio ?? '4:5');
        return {
          ...element,
          x: zones.slogan.x,
          y: zones.slogan.y,
          yOffsetPx: typo.sloganSize * typo.sloganLineHeight + 2,
          width: zones.slogan.width,
          rotation: zones.slogan.rotation ?? element.rotation,
          zIndex: zones.slogan.zIndex ?? element.zIndex,
          align: zones.slogan.align ?? element.align,
        };
      }

      if (/(description|설명|footer|cta|하단 문구)/.test(normalizedLabel)) {
        return {
          ...element,
          x: zones.details.x,
          y: zones.details.y,
          width: zones.details.width,
          rotation: zones.details.rotation ?? element.rotation,
          zIndex: zones.details.zIndex ?? element.zIndex,
          align: zones.details.align ?? element.align,
        };
      }

      if (/(price|가격)/.test(normalizedLabel)) {
        return {
          ...element,
          x: zones.summary.x,
          y: zones.summary.y,
          width: zones.summary.width,
          rotation: zones.summary.rotation ?? element.rotation,
          zIndex: zones.summary.zIndex ?? element.zIndex,
          align: zones.summary.align ?? element.align,
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
  const primaryImages = baseElements.filter(isPrimaryImageElement);
  const usedProductIds = new Set<number>();
  const extras: EditorElement[] = [];
  const matchedFields = { store: false, slogan: false, details: false };

  const mapped = baseElements.map((element) => {
    if (element.kind === 'image') {
      const imageIndex = primaryImages.findIndex((item) => item.id === element.id);
      const product = imageIndex >= 0 ? activeProducts[imageIndex] ?? null : null;

      if (product?.image) {
        usedProductIds.add(product.id);
        // payload의 transform 좌표가 있으면 템플릿 기본값보다 우선 적용
        const transformOverride = product.transform
          ? {
            x: product.transform.x,
            y: product.transform.y,
            width: product.transform.width,
            height: product.transform.height,
            rotation: product.transform.rotation,
          }
          : {};
        return {
          ...element,
          ...transformOverride,
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

    if (/(store|brand|가게명|브랜드명)/.test(normalizedLabel) && projectData.storeName && !matchedFields.store) {
      matchedFields.store = true;
      return {
        ...element,
        text: projectData.storeName,
        color: projectData.options.brandColor || DEFAULT_TEXT_COLOR,
        hidden: false,
        fontFamily: DEFAULT_TITLE_FONT,
      };
    }
    if (/(store|brand|가게명|브랜드명)/.test(normalizedLabel) && !projectData.storeName) {
      return { ...element, text: '', hidden: true };
    }

    if (/(headline|title|타이틀)/.test(normalizedLabel) && !matchedFields.slogan) {
      if (projectData.mainSlogan) {
        matchedFields.slogan = true;
        return {
          ...element,
          text: projectData.mainSlogan,
          hidden: false,
          fontFamily: DEFAULT_TITLE_FONT,
          color: DEFAULT_TEXT_COLOR,
        };
      }
      return { ...element, text: '', hidden: true };
    }

    if (/(subcopy|광고 문구|보조 타이틀|copy)/.test(normalizedLabel) && !matchedFields.slogan) {
      if (projectData.mainSlogan) {
        matchedFields.slogan = true;
        return {
          ...element,
          text: projectData.mainSlogan,
          hidden: false,
          fontFamily: DEFAULT_TITLE_FONT,
          color: DEFAULT_TEXT_COLOR,
        };
      }
      return { ...element, text: '', hidden: true };
    }

    if (/(vertical|세로문구)/.test(normalizedLabel)) {
      return { ...element, text: '', hidden: true };
    }

    if (/(description|설명|footer|cta|하단 문구)/.test(normalizedLabel) && !matchedFields.details) {
      if (projectData.details) {
        matchedFields.details = true;
        return {
          ...element,
          text: projectData.details,
          hidden: false,
          fontFamily: DEFAULT_TITLE_FONT,
          color: DEFAULT_TEXT_COLOR,
        };
      }
      return { ...element, text: '', hidden: true };
    }

    if (/(price|가격)/.test(normalizedLabel)) {
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

  });

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
      color: projectData.options.brandColor || DEFAULT_TEXT_COLOR,
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
      color: DEFAULT_TEXT_COLOR,
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
      color: DEFAULT_TEXT_COLOR,
      align: 'left',
      fontFamily: DEFAULT_TITLE_FONT,
      opacity: 1,
    });
  }

  activeProducts.forEach((product, index) => {
    extras.push(...buildProductTextElements(product, index));
  });

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
  let matched = false;
  const nextElements = elements.map((element) => {
    const normalizedLabel = `${element.id} ${element.label}`.toLowerCase();

    if (element.id === fallbackId) {
      matched = true;
      return {
        ...element,
        text: nextValue,
        fontSize: field === 'storeName' ? typography.storeSize : typography.sloganSize,
        lineHeight: field === 'storeName' ? typography.storeLineHeight : typography.sloganLineHeight,
      };
    }

    if (field === 'storeName' && element.kind === 'text' && /(store|brand|가게명|브랜드명)/.test(normalizedLabel)) {
      matched = true;
      return {
        ...element,
        text: nextValue,
        color: projectData.options.brandColor || DEFAULT_TEXT_COLOR,
        fontSize: typography.storeSize,
        lineHeight: typography.storeLineHeight,
      };
    }

    if (
      field === 'mainSlogan' &&
      element.kind === 'text' &&
      (/(headline|title|타이틀)/.test(normalizedLabel) || /(subcopy|광고 문구|보조 타이틀|copy)/.test(normalizedLabel))
    ) {
      matched = true;
      return {
        ...element,
        text: nextValue,
        color: DEFAULT_TEXT_COLOR,
        fontSize: typography.sloganSize,
        lineHeight: typography.sloganLineHeight,
      };
    }

    return element;
  });

  if (matched || !nextValue.trim()) {
    return nextElements;
  }

  if (field === 'storeName') {
    const fallbackElement: EditorElement = {
      id: fallbackId,
      kind: 'text',
      label: '보조 가게명',
      x: 8,
      y: 8,
      width: 44,
      height: 8,
      rotation: 0,
      zIndex: 13,
      text: nextValue,
      fontSize: typography.storeSize,
      fontWeight: 900,
      lineHeight: typography.storeLineHeight,
      letterSpacing: 1,
      color: projectData.options.brandColor || DEFAULT_TEXT_COLOR,
      align: 'left',
      fontFamily: DEFAULT_TITLE_FONT,
      opacity: 1,
    };
    return [
      ...nextElements,
      fallbackElement,
    ];
  }

  const fallbackElement: EditorElement = {
    id: fallbackId,
    kind: 'text',
    label: '보조 메인 문구',
    x: 8,
    y: 18,
    width: 58,
    height: 12,
    rotation: 0,
    zIndex: 13,
    text: nextValue,
    fontSize: typography.sloganSize,
    fontWeight: 900,
    lineHeight: typography.sloganLineHeight,
    letterSpacing: 0,
    color: DEFAULT_TEXT_COLOR,
    align: 'left',
    fontFamily: DEFAULT_TITLE_FONT,
    opacity: 1,
  };
  return [
    ...nextElements,
    fallbackElement,
  ];
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
      /* [ORIGINAL] color: '#ffffff', [MODIFIED] 가독성을 위해 기본 텍스트 색상 적용 */
      color: DEFAULT_TEXT_COLOR,
      /* [ORIGINAL] align: 'left', [MODIFIED] 중앙 정렬 고정 */
      align: 'center',
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
