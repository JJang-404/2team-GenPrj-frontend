export interface DraftSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface DraftTextPlacement {
  x: number;
  y: number;
  width: number;
  rotation?: number;
  zIndex?: number;
  align?: 'left' | 'center' | 'right';
}

interface DraftLayoutConfig {
  products: DraftSlot[][];
  store: DraftTextPlacement;
  slogan: DraftTextPlacement;
  details: DraftTextPlacement;
  summary: DraftTextPlacement;
}

const DRAFT_LAYOUTS: DraftLayoutConfig[] = [
  {
    products: [
      [{ x: 22, y: 28, width: 56, height: 42, rotation: 0 }],
      [
        { x: 9, y: 34, width: 34, height: 32, rotation: -5 },
        { x: 57, y: 34, width: 34, height: 32, rotation: 5 },
      ],
      [
        { x: 6, y: 38, width: 25, height: 24, rotation: -8 },
        { x: 36, y: 27, width: 28, height: 35, rotation: 0 },
        { x: 69, y: 38, width: 25, height: 24, rotation: 8 },
      ],
    ],
    store: { x: 18, y: 7, width: 64, align: 'center', rotation: 0, zIndex: 30 },
    slogan: { x: 16, y: 16, width: 68, align: 'center', rotation: 0, zIndex: 29 },
    details: { x: 14, y: 74, width: 72, align: 'center', rotation: 0, zIndex: 28 },
    summary: { x: 18, y: 86, width: 64, align: 'center', rotation: 0, zIndex: 28 },
  },
  {
    products: [
      [{ x: 22, y: 24, width: 56, height: 50, rotation: -4 }],
      [
        { x: 8, y: 31, width: 37, height: 35, rotation: -8 },
        { x: 55, y: 25, width: 37, height: 35, rotation: 8 },
      ],
      [
        { x: 5, y: 38, width: 25, height: 24, rotation: -10 },
        { x: 35, y: 21, width: 31, height: 39, rotation: 0 },
        { x: 68, y: 34, width: 22, height: 22, rotation: 10 },
      ],
    ],
    store: { x: 10, y: 10, width: 48, align: 'left', rotation: -3, zIndex: 30 },
    slogan: { x: 12, y: 21, width: 42, align: 'left', rotation: 0, zIndex: 29 },
    details: { x: 66, y: 74, width: 24, align: 'right', rotation: 0, zIndex: 28 },
    summary: { x: 64, y: 86, width: 26, align: 'right', rotation: 0, zIndex: 28 },
  },
  {
    products: [
      [{ x: 24, y: 20, width: 52, height: 58, rotation: 0 }],
      [
        { x: 13, y: 40, width: 26, height: 25, rotation: -8 },
        { x: 58, y: 22, width: 29, height: 29, rotation: 8 },
      ],
      [
        { x: 7, y: 45, width: 24, height: 23, rotation: -10 },
        { x: 36, y: 24, width: 30, height: 38, rotation: 0 },
        { x: 69, y: 14, width: 18, height: 18, rotation: -4 },
      ],
    ],
    store: { x: 22, y: 83, width: 56, align: 'center', rotation: 0, zIndex: 30 },
    slogan: { x: 24, y: 90, width: 52, align: 'center', rotation: 0, zIndex: 29 },
    details: { x: 18, y: 12, width: 64, align: 'center', rotation: 0, zIndex: 28 },
    summary: { x: 26, y: 74, width: 48, align: 'center', rotation: 90, zIndex: 28 },
  },
  {
    products: [
      [{ x: 18, y: 20, width: 64, height: 60, rotation: 0 }],
      [
        { x: 11, y: 28, width: 34, height: 34, rotation: -10 },
        { x: 55, y: 28, width: 34, height: 34, rotation: 10 },
      ],
      [
        { x: 10, y: 36, width: 22, height: 22, rotation: -10 },
        { x: 35, y: 22, width: 32, height: 40, rotation: 0 },
        { x: 70, y: 36, width: 18, height: 18, rotation: 10 },
      ],
    ],
    store: { x: 14, y: 11, width: 72, align: 'center', rotation: 0, zIndex: 30 },
    slogan: { x: 20, y: 23, width: 60, align: 'center', rotation: 0, zIndex: 29 },
    details: { x: 16, y: 77, width: 68, align: 'center', rotation: 0, zIndex: 28 },
    summary: { x: 24, y: 88, width: 52, align: 'center', rotation: 0, zIndex: 28 },
  },
];

function getCountIndex(count: number) {
  if (count <= 1) return 0;
  if (count === 2) return 1;
  return 2;
}

export function getDraftProductSlots(draftIndex: number, count: number): DraftSlot[] {
  const config = DRAFT_LAYOUTS[draftIndex % DRAFT_LAYOUTS.length];
  const slots = config.products[getCountIndex(count)] ?? config.products[0];
  return slots.map((slot) => ({ ...slot }));
}

export function getDraftTextPlacements(draftIndex: number) {
  const config = DRAFT_LAYOUTS[draftIndex % DRAFT_LAYOUTS.length];
  return {
    store: { ...config.store },
    slogan: { ...config.slogan },
    details: { ...config.details },
    summary: { ...config.summary },
  };
}
