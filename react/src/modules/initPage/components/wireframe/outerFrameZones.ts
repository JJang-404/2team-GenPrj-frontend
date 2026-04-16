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
