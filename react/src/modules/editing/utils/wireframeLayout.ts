/**
 * Wireframe layout derivation for editing main-preview (fallback coordinates).
 *
 * Bridges `wireframeSlots.json` slot metadata (used by initPage wireframe Layout
 * components via `computeSlotStyle`) to the editing module's elements[] model.
 *
 * Key differences from the initPage rendering path:
 *   - No `useImageAR` async measurement — we use FALLBACK (unscaled) slot width
 *     (`sw`) directly. This yields visually-correct structural previews but
 *     ignores image aspect ratios. Cards (which render Layout JSX directly) and
 *     main-preview (which uses this helper) may therefore show ~up to 40% width
 *     differences on non-square product images. This is expected (Plan AC4c).
 *   - Text placements (storeName / mainSlogan) come from a hardcoded table
 *     (`wireframeTextPlacements.ts`), not from `wireframeSlots.json` — the JSON
 *     only provides product slot geometry.
 */

import type { HomeProductInput } from '../types/home';
import { getWireframeSlots } from './wireframeBridge';
import {
  WIREFRAME_TEXT_PLACEMENTS,
  type WireframeTextRect,
} from './wireframeTextPlacements';

/**
 * initPage wireframe canvas는 1000×1250 (4:5) 고정 → CANVAS_HW_RATIO = 1.25.
 * computeSlotStyle.js / OverlapGroupLayout.jsx / HalfCropGroupLayout.jsx와 동일.
 */
const CANVAS_HW_RATIO = 1.25;
const OVERLAP_RATIO = 0.2;

export interface WireframeRect {
  x: number;       // left percent  (= Cx - sw/2)
  y: number;       // top  percent  (= Cy - sh/2)
  width: number;   // sw percent    (fallback — no AR scaling)
  height: number;  // sh percent
}

export interface WireframeDerivedLayout {
  /**
   * Length equals the actual wireframe slot count for the (type, count, hasSlogan)
   * key. The caller must `.slice()` the product elements down to this length
   * if `productCount` exceeds the type's cap.
   */
  productSlots: WireframeRect[];
  storeName: WireframeRect;
  mainSlogan: WireframeRect;
}

interface SlotMeta {
  Cx: number;
  Cy: number;
  sw: number;
  sh: number;
}

const slotToRect = (slot: SlotMeta): WireframeRect => ({
  x: slot.Cx - slot.sw / 2,
  y: slot.Cy - slot.sh / 2,
  width: slot.sw,
  height: slot.sh,
});

const textToRect = (t: WireframeTextRect): WireframeRect => ({
  x: t.x,
  y: t.y,
  width: t.width,
  height: t.height,
});

/**
 * Derive fallback wireframe coordinates for the given draft type.
 *
 * @param draftIndex - 0=Type1 SingleLarge, 1=Type2 SingleCompact, 2=Type3 OverlapGroup, 3=Type4 HalfCropGroup
 * @param productCount - number of real product elements (callers typically pass `elements.filter(isPrimaryImageElement).length`)
 * @param hasSlogan - whether projectData.mainSlogan is non-empty; canonical source is the presence of a `fallback-main-slogan` element with truthy text
 */
export function deriveWireframeLayout(
  draftIndex: 0 | 1 | 2 | 3,
  productCount: number,
  hasSlogan: boolean,
): WireframeDerivedLayout {
  const texts = WIREFRAME_TEXT_PLACEMENTS[draftIndex];
  const storeName = textToRect(texts.storeName);
  const mainSlogan = textToRect(texts.mainSlogan);

  // productCount === 0: empty slots, no warn. `getWireframeSlots` would miss
  // on key `1-0-*` and log a warning — skip the lookup entirely.
  if (productCount <= 0) {
    return { productSlots: [], storeName, mainSlogan };
  }

  const type = (draftIndex + 1) as 1 | 2 | 3 | 4;
  const wireframe = getWireframeSlots(type, productCount, hasSlogan);

  // Unsupported (type, count, hasSlogan) combinations: return empty productSlots
  // without a console warning. The caller will keep existing element coordinates
  // instead of overriding them (AC10 clean console).
  if (!wireframe || !Array.isArray(wireframe.slots) || wireframe.slots.length === 0) {
    return { productSlots: [], storeName, mainSlogan };
  }

  const productSlots = (wireframe.slots as SlotMeta[]).map(slotToRect);
  return { productSlots, storeName, mainSlogan };
}

/**
 * Type 3 / Type 4에서 제품별로 배치와 이미지 소스 오버라이드를 함께 반환하기 위한 타입.
 *
 * - rect: main-preview element에 적용할 절대 % 좌표 (x/y/width/height)
 * - imageUrlOverride: Type 4 half-crop에서 원본 대신 사용할 pre-bake dataURL
 *   (Type 3는 원본 이미지 그대로이므로 undefined)
 * - halfSide: 디버깅/테스트용 메타 정보
 */
export interface WireframeProductPlacement {
  rect: WireframeRect;
  imageUrlOverride?: string;
  halfSide?: 'left' | 'right' | 'single';
  zIndex?: number;
}

interface PairSlotProduct {
  slot: SlotMeta;
  product: HomeProductInput;
}

/**
 * initPage `groupSlots` (OverlapGroupLayout.jsx)와 동일하게 제품을 짝짓는다.
 * 홀수일 때 마지막 제품은 single로 남는다.
 */
function groupPairs<T>(items: T[]): Array<{ type: 'pair'; left: T; right: T } | { type: 'single'; item: T }> {
  const groups: Array<{ type: 'pair'; left: T; right: T } | { type: 'single'; item: T }> = [];
  const count = items.length;
  const isOdd = count % 2 !== 0;
  let i = 0;
  while (i < count) {
    if (isOdd && i === count - 1) {
      groups.push({ type: 'single', item: items[i] });
      i += 1;
    } else if (i + 1 < count) {
      groups.push({ type: 'pair', left: items[i], right: items[i + 1] });
      i += 2;
    } else {
      groups.push({ type: 'single', item: items[i] });
      i += 1;
    }
  }
  return groups;
}

/**
 * fallback: natural 크기가 없을 때 슬롯 sw/sh를 그대로 사용.
 * (이미지 프리베이크가 실패한 제품을 위한 안전망)
 */
function scaledWidthOrFallback(slot: SlotMeta, product: HomeProductInput): number {
  const iw = product.imageNaturalWidth;
  const ih = product.imageNaturalHeight;
  if (!iw || !ih) return slot.sw;
  const AR = slot.sh / ih;
  return iw * AR * CANVAS_HW_RATIO;
}

/**
 * Type 3 오버랩 그룹 배치 계산. OverlapGroupLayout.jsx의 `OverlapPair` 공식과 동일.
 *
 *   wL = iwL * (sh / ihL) * 1.25
 *   wR = iwR * (sh / ihR) * 1.25
 *   Ow = (wL + wR) * 0.2
 *   pairCx = (leftSlot.Cx + rightSlot.Cx) / 2
 *   left:  { x: pairCx + Ow/2 - wL, y: Cy - sh/2, width: wL, height: sh, zIndex: 1 }
 *   right: { x: pairCx - Ow/2,      y: Cy - sh/2, width: wR, height: sh, zIndex: 2 }
 *
 * 홀수 single은 computeSlotStyle의 `side: 'single'`과 동일하게 wScaled를 사용.
 */
export function computeType3PairLayout(
  slots: SlotMeta[],
  products: HomeProductInput[],
): WireframeProductPlacement[] {
  const placements: WireframeProductPlacement[] = [];
  const paired: PairSlotProduct[] = [];
  const n = Math.min(slots.length, products.length);
  for (let i = 0; i < n; i += 1) {
    paired.push({ slot: slots[i], product: products[i] });
  }
  const groups = groupPairs(paired);

  groups.forEach((group) => {
    if (group.type === 'single') {
      const { slot, product } = group.item;
      const wScaled = scaledWidthOrFallback(slot, product);
      placements.push({
        rect: {
          x: slot.Cx - wScaled / 2,
          y: slot.Cy - slot.sh / 2,
          width: wScaled,
          height: slot.sh,
        },
        halfSide: 'single',
      });
      return;
    }
    const { left, right } = group;
    const wL = scaledWidthOrFallback(left.slot, left.product);
    const wR = scaledWidthOrFallback(right.slot, right.product);
    const Ow = (wL + wR) * OVERLAP_RATIO;
    const pairCx = (left.slot.Cx + right.slot.Cx) / 2;
    const top = left.slot.Cy - left.slot.sh / 2;

    placements.push({
      rect: {
        x: pairCx + Ow / 2 - wL,
        y: top,
        width: wL,
        height: left.slot.sh,
      },
      halfSide: 'left',
      zIndex: 1,
    });
    placements.push({
      rect: {
        x: pairCx - Ow / 2,
        y: right.slot.Cy - right.slot.sh / 2,
        width: wR,
        height: right.slot.sh,
      },
      halfSide: 'right',
      zIndex: 2,
    });
  });

  return placements;
}

/**
 * Type 4 반크롭 그룹 배치 계산. HalfCropGroupLayout.jsx의 `mapSlotsToProducts` +
 * computeSlotStyle 'left'/'right' 공식과 동일.
 *
 *   W_scaled = iw * (sh / ih) * 1.25
 *   w_final  = W_scaled / 2
 *   left  pairCx = slot.Cx + slot.sw / 2  (= 왼쪽 슬롯의 오른쪽 변)
 *   right pairCx = slot.Cx - slot.sw / 2  (= 오른쪽 슬롯의 왼쪽 변)
 *   left rect:  { x: pairCx - w_final, y: Cy - sh/2, width: w_final, height: sh }
 *   right rect: { x: pairCx,           y: Cy - sh/2, width: w_final, height: sh }
 *
 * 각 제품은 pre-bake된 `imageLeftHalf` / `imageRightHalf` 이미지로 교체된다.
 */
export function computeType4HalfCropLayout(
  slots: SlotMeta[],
  products: HomeProductInput[],
): WireframeProductPlacement[] {
  const placements: WireframeProductPlacement[] = [];
  const n = Math.min(slots.length, products.length);
  const isOdd = n % 2 !== 0;

  for (let i = 0; i < n; i += 1) {
    const slot = slots[i];
    const product = products[i];
    const isLastAndOdd = isOdd && i === n - 1;

    if (isLastAndOdd) {
      // HalfCropGroupLayout의 single 분기: 원본 이미지 + wScaled 폭
      const wScaled = scaledWidthOrFallback(slot, product);
      placements.push({
        rect: {
          x: slot.Cx - wScaled / 2,
          y: slot.Cy - slot.sh / 2,
          width: wScaled,
          height: slot.sh,
        },
        halfSide: 'single',
      });
      continue;
    }

    const W_scaled = scaledWidthOrFallback(slot, product);
    const w_final = W_scaled / 2;
    const top = slot.Cy - slot.sh / 2;

    if (i % 2 === 0) {
      // 왼쪽 제품 → 원본 이미지의 왼쪽 절반, 왼쪽 슬롯의 우측 변 기준
      const pairCx = slot.Cx + slot.sw / 2;
      placements.push({
        rect: {
          x: pairCx - w_final,
          y: top,
          width: w_final,
          height: slot.sh,
        },
        imageUrlOverride: product.imageLeftHalf,
        halfSide: 'left',
      });
    } else {
      // 오른쪽 제품 → 원본 이미지의 오른쪽 절반, 오른쪽 슬롯의 좌측 변 기준
      const pairCx = slot.Cx - slot.sw / 2;
      placements.push({
        rect: {
          x: pairCx,
          y: top,
          width: w_final,
          height: slot.sh,
        },
        imageUrlOverride: product.imageRightHalf,
        halfSide: 'right',
      });
    }
  }

  return placements;
}

/**
 * 타입별 배치 계산의 공통 진입점. Type 3/4는 전용 함수를, Type 1/2는 기존
 * `productSlots`(slotToRect) 결과를 그대로 감싸 반환한다.
 */
export function computeWireframeProductPlacements(
  draftIndex: 0 | 1 | 2 | 3,
  productCount: number,
  hasSlogan: boolean,
  products: HomeProductInput[],
): WireframeProductPlacement[] {
  if (productCount <= 0) return [];
  const type = (draftIndex + 1) as 1 | 2 | 3 | 4;
  const wireframe = getWireframeSlots(type, productCount, hasSlogan);
  if (!wireframe || !Array.isArray(wireframe.slots) || wireframe.slots.length === 0) {
    return [];
  }
  const slots = wireframe.slots as SlotMeta[];

  if (draftIndex === 2) {
    return computeType3PairLayout(slots, products);
  }
  if (draftIndex === 3) {
    return computeType4HalfCropLayout(slots, products);
  }
  return slots.map((slot) => ({ rect: slotToRect(slot) }));
}
