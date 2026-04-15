/**
 * Wireframe text placement table (Type1-4) — PLACEHOLDER values.
 *
 * These coordinates are a first approximation of the Tailwind flow used by
 * initPage Layout components (SingleLargeLayout / SingleCompactLayout /
 * OverlapGroupLayout / HalfCropGroupLayout). They are tuned for the 4:5 ratio
 * and must be visually verified per Type during Step 7 (AC4b-sub tune gate).
 *
 * Coordinates are percent of canvas. Only x/y/width/height are provided here;
 * rotation / zIndex / align are preserved from the existing element or from
 * LEGACY_TEXT_PLACEMENTS in editorFlow.ts.
 */

export interface WireframeTextRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WireframeProductMetaPlacement {
  nameOffsetY: number;
  priceOffsetY: number;
  descOffsetY: number;
  nameMinWidth: number;
  priceMinWidth: number;
  descMinWidth: number;
}

export interface WireframeTypeTextPlacement {
  storeName: WireframeTextRect;
  mainSlogan: WireframeTextRect;
  productMeta: WireframeProductMetaPlacement;
}

export const WIREFRAME_TEXT_PLACEMENTS: Record<0 | 1 | 2 | 3, WireframeTypeTextPlacement> = {
  // Type1 — SingleLargeLayout (클래식 대형, 상단 store + 하단 slogan 밴드)
  0: {
    /* 기존 값 백업:
    storeName:  { x: 4, y: 4,  width: 68, height: 10 },
    mainSlogan: { x: 4, y: 90, width: 92, height: 8  },
    */
    storeName:  { x: 4, y: 5,  width: 92, height: 10 },
    mainSlogan: { x: 0, y: 92, width: 100, height: 8  },
    productMeta: {
      nameOffsetY: 1.4,
      priceOffsetY: 4.8,
      descOffsetY: 7.8,
      nameMinWidth: 18,
      priceMinWidth: 16,
      descMinWidth: 22,
    },
  },
  // Type2 — SingleCompactLayout (상단 헤더 블록: store + inline slogan)
  1: {
    /* 기존 값 백업:
    storeName:  { x: 4, y: 4,  width: 56, height: 12 },
    mainSlogan: { x: 4, y: 88, width: 92, height: 8  },
    */
    storeName:  { x: 4, y: 5,  width: 92, height: 12 },
    mainSlogan: { x: 4, y: 15, width: 92, height: 10 }, // 헤더 내 슬로건 위치로 조정
    productMeta: {
      nameOffsetY: 1.2,
      priceOffsetY: 4.6,
      descOffsetY: 7.4,
      nameMinWidth: 18,
      priceMinWidth: 16,
      descMinWidth: 22,
    },
  },
  // Type3 — OverlapGroupLayout (상단 store, 하단 slogan, overlap 제품 위 z-30)
  2: {
    /* 기존 값 백업:
    storeName:  { x: 4, y: 4,  width: 68, height: 10 },
    mainSlogan: { x: 4, y: 90, width: 92, height: 8  },
    */
    storeName:  { x: 4, y: 5,  width: 92, height: 10 },
    mainSlogan: { x: 0, y: 92, width: 100, height: 8  },
    productMeta: {
      nameOffsetY: 1.1,
      priceOffsetY: 4.2,
      descOffsetY: 6.8,
      nameMinWidth: 16,
      priceMinWidth: 15,
      descMinWidth: 20,
    },
  },
  // Type4 — HalfCropGroupLayout (반쪽 크롭 전폭, 텍스트 상/하 얇게)
  3: {
    /* 기존 값 백업:
    storeName:  { x: 4, y: 3,  width: 68, height: 9  },
    mainSlogan: { x: 4, y: 91, width: 92, height: 7  },
    */
    storeName:  { x: 4, y: 4,  width: 92, height: 9  },
    mainSlogan: { x: 0, y: 93, width: 100, height: 7  },
    productMeta: {
      nameOffsetY: 1,
      priceOffsetY: 4.1,
      descOffsetY: 6.6,
      nameMinWidth: 18,
      priceMinWidth: 16,
      descMinWidth: 22,
    },
  },
};
