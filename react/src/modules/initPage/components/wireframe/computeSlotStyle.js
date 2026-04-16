import wireframeSlots from './wireframeSlots.json';

/**
 * 설계 가이드 수식 엔진 (Section 3.1: Type 4 Half-Crop)
 *
 * AR = sh / ih (높이 기준 고정, px→canvas% 변환 계수)
 * Half-crop: object-fit:cover + object-position:left/right로 이미지 좌/우 절반 크롭
 * Single: object-fit:cover 중앙 배치
 *
 * 좌표계 보정: sh는 높이%, sw/Cx는 너비%.
 * AR(=sh/ih)로 계산한 너비는 높이% 단위이므로
 * CSS width/left(너비%)로 쓸 때 canvasH/canvasW 비율로 변환 필요.
 */
import { MAIN_ZONE_HW_RATIO } from './outerFrameZones';

// 계층 구조: slot은 main zone(1000×850) 내부 기준이므로 HW ratio = 0.85
const CANVAS_HW_RATIO = MAIN_ZONE_HW_RATIO;

/**
 * Type 4 half-crop 또는 single 슬롯의 CSS 스타일 계산
 *
 * @param {{ Cx: number, Cy: number, sw: number, sh: number }} slotMeta
 * @param {{ naturalWidth: number, naturalHeight: number }} imageNaturals
 * @param {'left' | 'right' | 'single'} side
 * @returns {{ containerStyle: object, imgStyle: object }}
 */
export const computeSlotStyle = (slotMeta, imageNaturals, side) => {
  const { naturalWidth: iw, naturalHeight: ih } = imageNaturals;
  if (!iw || !ih) return getFallbackStyle(slotMeta, side);

  const { Cx, Cy, sw, sh } = slotMeta;

  // AR은 높이 기준 고정: 슬롯 높이(sh)에 이미지를 맞추고, 너비만 동적 조정
  const AR = sh / ih;

  if (side === 'single') {
    // Step 5: 슬롯 동기화 — 높이 고정, 너비만 이미지 AR에 맞춰 조정
    // AR은 높이% 단위 → 너비%로 변환하려면 ×CANVAS_HW_RATIO
    const wScaled = iw * AR * CANVAS_HW_RATIO;
    return {
      containerStyle: {
        left: (Cx - wScaled / 2) + '%',
        top: (Cy - sh / 2) + '%',
        width: wScaled + '%',
        height: sh + '%',
      },
      imgStyle: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center center',
        display: 'block',
      },
    };
  }

  // Half-crop (left 또는 right)
  // Step 5: 슬롯 동기화 — 높이 고정(sh), 너비는 이미지 AR 기반
  // AR은 높이% 단위 → 너비%로 변환하려면 ×CANVAS_HW_RATIO
  const W_scaled = iw * AR * CANVAS_HW_RATIO;
  const w_final = W_scaled / 2;

  return {
    containerStyle: {
      left: (side === 'left' ? Cx - w_final : Cx) + '%',
      top: (Cy - sh / 2) + '%',
      width: w_final + '%',
      height: sh + '%',
    },
    imgStyle: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: side === 'left' ? 'left center' : 'right center',
      display: 'block',
    },
  };
};

/**
 * 이미지 로드 전 폴백 스타일 (1:1 AR 가정 → w_final = sw)
 */
export const getFallbackStyle = (slotMeta, side) => {
  const { Cx, Cy, sw, sh } = slotMeta;

  if (side === 'single') {
    return {
      containerStyle: {
        left: (Cx - sw / 2) + '%',
        top: (Cy - sh / 2) + '%',
        width: sw + '%',
        height: sh + '%',
      },
      imgStyle: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center center',
        display: 'block',
      },
    };
  }

  return {
    containerStyle: {
      left: (side === 'left' ? Cx - sw : Cx) + '%',
      top: (Cy - sh / 2) + '%',
      width: sw + '%',
      height: sh + '%',
    },
    imgStyle: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: side === 'left' ? 'left center' : 'right center',
      display: 'block',
    },
  };
};

/**
 * Type 3 높이 고정 스케일링 — 슬롯 높이(sh)에 맞추고 너비만 동적 조정
 *
 * AR = sh / ih (높이 기준 고정)
 * 캔버스 비율 보정: AR은 높이% 단위 → 너비%로 변환 시 ×CANVAS_HW_RATIO
 *
 * @returns {{ wScaled: number, hScaled: number }} 너비%/높이% 단위
 */
export const computeType3Style = (slotMeta, imageNaturals) => {
  const { naturalWidth: iw, naturalHeight: ih } = imageNaturals;
  if (!iw || !ih) return { wScaled: slotMeta.sw, hScaled: slotMeta.sh };

  const { sh } = slotMeta;
  const AR = sh / ih;

  return {
    wScaled: iw * AR * CANVAS_HW_RATIO,  // 너비%
    hScaled: sh,                           // 높이% (고정)
  };
};

/**
 * 와이어프레임 키 생성
 * count=1은 공통 "n-1-x" 와이어프레임 사용
 */
export const getWireframeKey = (type, productCount, hasSlogan) => {
  if (productCount <= 1) {
    return `n-1-${hasSlogan ? '1' : '2'}`;
  }
  return `${type}-${productCount}-${hasSlogan ? '1' : '2'}`;
};

/**
 * wireframeSlots.json에서 슬롯 데이터 조회
 */
export const getWireframeSlots = (type, productCount, hasSlogan) => {
  const key = getWireframeKey(type, productCount, hasSlogan);
  return wireframeSlots.wireframes[key] || null;
};
