/**
 * 계층형 wireframe outer frame zone 정의.
 *
 * 기본 이미지 1.png (draw.io, 1000×1250 canvas)에서 추출.
 * 모든 값은 캔버스 대비 %.
 */

export interface FrameZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

// 4:5 캔버스(1000×1250) 기준 zone (draw.io 원본)
const CANVAS_W = 1000;
const CANVAS_H_4x5 = 1250;

const LOGO_H_PX = 100;
const MAIN_ZONE_H_PX = 850;
const SLOGAN_H_PX = 200;
const FOOTER_H_PX = 100;

/** @deprecated computeMainZoneDynamic 사용 권장 */
export const MAIN_ZONE_4x5: FrameZone = {
  x: 0,
  y: (LOGO_H_PX / CANVAS_H_4x5) * 100,           // 8%
  w: 100,
  h: (MAIN_ZONE_H_PX / CANVAS_H_4x5) * 100,       // 68%
};

export const MAIN_ZONE_HW_RATIO = MAIN_ZONE_H_PX / CANVAS_W; // 0.85

/**
 * @deprecated computeMainZoneDynamic 사용 권장
 * store/slogan의 y 좌표에 따라 main zone(제품 영역)을 동적 계산.
 *
 * - 둘 다 상단(y < 50): 텍스트 아래에 main zone 배치
 * - 둘 다 하단(y >= 50): 텍스트 위에 main zone 배치
 * - 혼합: 고정 MAIN_ZONE_4x5 사용
 */
export function computeMainZoneFromZones(storeY: number, sloganY: number): FrameZone {
  const storeTop = storeY < 50;
  const sloganTop = sloganY < 50;

  if (storeTop && sloganTop) {
    // 텍스트가 상단 → main zone은 아래
    const topEnd = Math.max(storeY, sloganY) + 7;
    return { x: 0, y: topEnd, w: 100, h: 100 - topEnd - 3 };
  } else if (!storeTop && !sloganTop) {
    // 텍스트가 하단 → main zone은 위
    const bottomStart = Math.min(storeY, sloganY) - 3;
    return { x: 0, y: 3, w: 100, h: bottomStart - 3 };
  }
  // 혼합 배치 → 고정 main zone
  return MAIN_ZONE_4x5;
}

/**
 * @deprecated computeMainZoneDynamic 사용 권장
 * 9:16 reflow: 절대 px 유지, main zone은 남는 세로 공간 중앙.
 */
export function computeMainZone916(): FrameZone {
  const canvasH = Math.round(CANVAS_W * 16 / 9); // 1778

  const logoBottom = LOGO_H_PX;
  const footerTop = canvasH - FOOTER_H_PX;
  const sloganTop = footerTop - SLOGAN_H_PX;

  const available = sloganTop - logoBottom; // 1378
  const mainY = logoBottom + (available - MAIN_ZONE_H_PX) / 2;

  return {
    x: 0,
    y: (mainY / canvasH) * 100,
    w: 100,
    h: (MAIN_ZONE_H_PX / canvasH) * 100,
  };
}

/**
 * 4개 text zone(store, slogan, details, summary)의 y 좌표를 기반으로
 * main zone(제품 영역)을 동적 계산. 비율(4:5, 9:16, 1:1) 무관.
 *
 * 1. upper zone(y < 50)과 lower zone(y >= 50)의 경계를 구한다.
 * 2. 가용 공간(available) 내에서 최대 높이(MAX_H = 68%)를 적용한다.
 * 3. 가용 공간이 MAX_H보다 크면, main zone을 가용 공간의 중앙에 배치한다.
 * 4. 가용 공간이 MAX_H 이하이면, 가용 공간을 전부 사용한다.
 */
export function computeMainZoneDynamic(
  zones: { store: { y: number }; slogan: { y: number }; details: { y: number }; summary: { y: number } },
): FrameZone {
  const PAD = 1;
  const EDGE = 1;
  const MAX_H = (MAIN_ZONE_H_PX / CANVAS_H_4x5) * 100; // 68%
  const allY = [zones.store.y, zones.slogan.y, zones.details.y, zones.summary.y];

  if (allY.some((y) => y == null || Number.isNaN(y))) {
    return MAIN_ZONE_4x5;
  }

  const upperY = allY.filter((y) => y < 50);
  const lowerY = allY.filter((y) => y >= 50);

  let top: number;
  let bottom: number;

  if (upperY.length > 0 && lowerY.length > 0) {
    top = Math.max(...upperY) + PAD;
    bottom = Math.min(...lowerY) - PAD;
  } else if (upperY.length > 0) {
    top = Math.max(...upperY) + PAD;
    bottom = 100 - EDGE;
  } else {
    top = EDGE;
    bottom = Math.min(...lowerY) - PAD;
  }

  const available = bottom - top;
  if (available <= 0) return MAIN_ZONE_4x5;

  const h = Math.min(available, MAX_H);
  const y = top + (available - h) / 2;

  return { x: 0, y, w: 100, h };
}
