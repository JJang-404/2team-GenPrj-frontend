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

export const MAIN_ZONE_4x5: FrameZone = {
  x: 0,
  y: (LOGO_H_PX / CANVAS_H_4x5) * 100,           // 8%
  w: 100,
  h: (MAIN_ZONE_H_PX / CANVAS_H_4x5) * 100,       // 68%
};

export const MAIN_ZONE_HW_RATIO = MAIN_ZONE_H_PX / CANVAS_W; // 0.85

/**
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
