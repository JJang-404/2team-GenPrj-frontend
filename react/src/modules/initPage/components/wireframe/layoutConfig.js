/**
 * layoutConfig.js — 와이어프레임 레이아웃 수치 설정 (Canvas 방식)
 *
 * 모든 요소는 제품 영역(캔버스) 내에서 absolute 배치됩니다.
 * 각 요소의 { top, left, width, height } 는 캔버스 대비 % 입니다.
 * 추가 속성: zIndex (겹침 순서), transform (scale 등)
 *
 * 수정 방법: 값만 변경하면 해당 위치/크기에 즉시 반영됩니다.
 */

// ─── Type 1: SingleLargeLayout ─────────────────────────────────────────────
export const TYPE1 = {
  // 1개 제품: 중앙 대형
  count1: {
    slot: { top: '5%', left: '25%', width: '50%', height: '80%' },
  },
  // 2개 제품: 나란히
  count2: {
    slot0: { top: '5%', left: '3%', width: '45%', height: '80%' },
    slot1: { top: '5%', left: '52%', width: '45%', height: '80%' },
  },
  // 3개 제품: 중앙 강조 staggered
  count3: {
    slotLeft:   { top: '18%', left: '2%',  width: '30%', height: '65%' },
    slotCenter: { top: '0%',  left: '25%', width: '50%', height: '88%', zIndex: 10 },
    slotRight:  { top: '18%', left: '68%', width: '30%', height: '65%' },
  },
};

// ─── Type 2: SingleCompactLayout ───────────────────────────────────────────
export const TYPE2 = {
  // 1개 제품: 중앙
  count1: {
    slot: { top: '10%', left: '25%', width: '50%', height: '70%' },
  },
  // 2개 제품: 나란히
  count2: {
    slot0: { top: '10%', left: '5%', width: '42%', height: '70%' },
    slot1: { top: '10%', left: '53%', width: '42%', height: '70%' },
  },
  // 3개 제품: 중앙 강조 staggered + scale
  count3: {
    slotLeft:   { top: '18%', left: '2%',  width: '30%', height: '62%' },
    slotCenter: { top: '2%',  left: '25%', width: '50%', height: '85%', zIndex: 10, transform: 'scale(1.05)' },
    slotRight:  { top: '18%', left: '68%', width: '30%', height: '62%' },
  },
};

// ─── Type 3: OverlapGroupLayout (지그재그/역삼각형) ─────────────────────────
export const TYPE3 = {
  // 1개 제품: 중앙
  count1: {
    slot: { top: '10%', left: '25%', width: '50%', height: '70%' },
  },
  // 2개 제품: 1그룹 중앙
  count2: {
    pair: { top: '15%', left: '18%', width: '65%', height: '60%' },
  },
  // 3개 제품: 대각선 (좌상 그룹 + 우하 단독)
  count3: {
    pair:   { top: '2%',  left: '2%',  width: '55%', height: '42%' },
    single: { top: '52%', left: '58%', width: '38%', height: '42%' },
  },
  // 4개 제품: 대각선 (좌상 그룹 + 우하 그룹)
  count4: {
    pairTop:    { top: '2%',  left: '2%',  width: '55%', height: '42%' },
    pairBottom: { top: '52%', left: '43%', width: '55%', height: '42%' },
  },
  // 5개 제품: 역삼각형 (좌상+우상 그룹 + 하중앙 단독)
  count5: {
    pairTopLeft:  { top: '2%',  left: '2%',  width: '46%', height: '38%' },
    pairTopRight: { top: '2%',  left: '52%', width: '46%', height: '38%' },
    single:       { top: '48%', left: '32%', width: '36%', height: '42%' },
  },
  // 6개 제품: 역삼각형 (좌상+우상+하중앙 그룹)
  count6: {
    pairTopLeft:  { top: '2%',  left: '2%',  width: '46%', height: '38%' },
    pairTopRight: { top: '2%',  left: '52%', width: '46%', height: '38%' },
    pairBottom:   { top: '48%', left: '27%', width: '46%', height: '42%' },
  },
};

// ─── Type 4: HalfCropGroupLayout (수평/역삼각형) ───────────────────────────
export const TYPE4 = {
  // 1개 제품: 중앙
  count1: {
    slot: { top: '10%', left: '25%', width: '50%', height: '70%' },
  },
  // 2개 제품: 1 CropPair 중앙
  count2: {
    pair: { top: '15%', left: '18%', width: '65%', height: '60%' },
  },
  // 3개 제품: 같은 행 (좌 CropPair + 우 단독)
  count3: {
    pair:   { top: '15%', left: '2%',  width: '55%', height: '65%' },
    single: { top: '15%', left: '60%', width: '38%', height: '65%' },
  },
  // 4개 제품: 같은 행 (좌 CropPair + 우 CropPair)
  count4: {
    pairLeft:  { top: '15%', left: '2%',  width: '46%', height: '65%' },
    pairRight: { top: '15%', left: '52%', width: '46%', height: '65%' },
  },
  // 5개 제품: 역삼각형 (좌상+우상 CropPair + 하중앙 단독)
  count5: {
    pairTopLeft:  { top: '2%',  left: '2%',  width: '46%', height: '38%' },
    pairTopRight: { top: '2%',  left: '52%', width: '46%', height: '38%' },
    single:       { top: '48%', left: '32%', width: '36%', height: '42%' },
  },
  // 6개 제품: 역삼각형 (좌상+우상+하중앙 CropPair)
  count6: {
    pairTopLeft:  { top: '2%',  left: '2%',  width: '46%', height: '38%' },
    pairTopRight: { top: '2%',  left: '52%', width: '46%', height: '38%' },
    pairBottom:   { top: '48%', left: '27%', width: '46%', height: '42%' },
  },
};
