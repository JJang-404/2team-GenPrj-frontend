# 슬롯 수직 중앙 정렬 보고서

## 1. 문제

wireframeSlots.json의 슬롯 좌표(Cy)가 mainZone 상단에 치우쳐 설계되어 있어,
모든 type(1~4)에서 제품 이미지가 mainZone 중앙이 아닌 위쪽에 배치되는 문제 발생.

### 1.1 원인 분석

| 와이어프레임 | Cy | sh | 슬롯 범위 (top~bottom) | 비고 |
|---|---|---|---|---|
| n-1-1 (1개, 슬로건O) | 28.0 | 48.0 | 4% ~ 52% | 중앙(50%)보다 위 |
| 1-2-1 (2개, 슬로건O) | 28.0 | 48.0 | 4% ~ 52% | 동일 |
| 3-3-1 (3개, 슬로건O) | 18/18/40.4 | 24/24/28.8 | 6% ~ 54.8% | 상단 편향 |
| 4-2-1 (2개, 슬로건O) | 29.2 | 38.4 | 10% ~ 48.4% | 상단 편향 |

슬롯 좌표가 mainZone(0~100%) 내부 기준임에도, 전체 bounding box의 중심이
항상 50%보다 위에 위치하여 시각적으로 상단 편향이 발생.

### 1.2 영향 범위

- **WireframeChoiceCard**: 4개 Layout 컴포넌트 (SingleLargeLayout, SingleCompactLayout, OverlapGroupLayout, HalfCropGroupLayout)
- **EditorCanvas / BackgroundCard**: wireframeLayout.ts를 통한 편집 프리뷰
- 모든 type(1~4), 모든 제품 수(1~6), 슬로건 유무 모두 해당

## 2. 해결 방법

### 2.1 `centerSlotsVertically()` 함수 추가

`computeSlotStyle.js`에 슬롯 그룹 수직 중앙 정렬 함수를 추가.

```javascript
export const centerSlotsVertically = (slots) => {
  if (!slots || slots.length === 0) return slots;

  let topMost = Infinity;
  let bottomMost = -Infinity;

  for (const slot of slots) {
    const top = slot.Cy - slot.sh / 2;
    const bottom = slot.Cy + slot.sh / 2;
    if (top < topMost) topMost = top;
    if (bottom > bottomMost) bottomMost = bottom;
  }

  const contentHeight = bottomMost - topMost;
  const yOffset = (100 - contentHeight) / 2 - topMost;

  if (Math.abs(yOffset) < 0.5) return slots; // 이미 중앙

  return slots.map(slot => ({
    ...slot,
    Cy: slot.Cy + yOffset,
  }));
};
```

**동작 원리:**
1. 전체 슬롯의 bounding box (topMost ~ bottomMost) 계산
2. mainZone(0~100%) 내에서 수직 중앙에 오도록 단일 yOffset 산출
3. 모든 슬롯의 Cy에 동일한 offset 적용

**핵심 특성:**
- 슬롯 간 상대 위치(페어 간격, 지그재그 패턴 등) 완전 보존
- Cx는 변경하지 않으므로 수평 배치(Type 3 겹침 등)에 영향 없음
- offset < 0.5일 경우 원본 반환 (불필요한 객체 생성 방지)

### 2.2 적용 검증 예시

**n-1-1 (1개 제품, 슬로건 있음):**
- 보정 전: Cy=28, 범위 4%~52% (중심=28%)
- yOffset = (100-48)/2 - 4 = 22
- 보정 후: Cy=50, 범위 26%~74% (중심=50%)

**3-3-1 (3개 제품, 슬로건 있음):**
- 보정 전: 전체 범위 6%~54.8% (중심=30.4%)
- yOffset = (100-48.8)/2 - 6 = 19.6
- 보정 후: 전체 범위 25.6%~74.4% (중심=50%)

## 3. 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `initPage/.../computeSlotStyle.js` | `centerSlotsVertically()` 함수 추가 |
| `initPage/.../SingleLargeLayout.jsx` | import + 슬롯 센터링 적용 |
| `initPage/.../SingleCompactLayout.jsx` | import + 슬롯 센터링 적용 |
| `initPage/.../OverlapGroupLayout.jsx` | import + 슬롯 센터링 적용 |
| `initPage/.../HalfCropGroupLayout.jsx` | import + 슬롯 센터링 적용 |
| `editing/utils/wireframeBridge.ts` | `centerSlotsVertically` re-export 추가 |
| `editing/utils/wireframeLayout.ts` | import + 2곳 슬롯 센터링 적용 |

## 4. 슬롯 너비 동적 HW ratio 보정

### 4.1 문제

`centerSlotsVertically()` 적용 후, 편집 화면(Main Preview / BackgroundCard)에서
Type 4 반크롭 페어 이미지 사이에 공백이 발생하는 문제 확인.
WireframeChoiceCard(Layout 컴포넌트)에서는 정상 표시.

### 4.2 원인 분석

슬롯의 너비를 이미지 종횡비에 맞게 계산하는 `scaledWidthOrFallback()` 함수가
`CANVAS_HW_RATIO = 0.85`를 하드코딩으로 사용하고 있었음.

```typescript
// 기존 (하드코딩)
const CANVAS_HW_RATIO = 0.85; // mainZone.h=68% + 4:5 캔버스 전용
return iw * AR * CANVAS_HW_RATIO;
```

이 값은 `MAIN_ZONE_H_PX(850) / CANVAS_W(1000) = 0.85`에서 유래하며,
mainZone.h가 68%이고 캔버스가 4:5일 때만 정확함.

그러나 `computeMainZoneDynamic(zones)`는 4개 텍스트 zone(store, slogan, details, summary)의
y 좌표에 따라 mainZone.h를 동적으로 계산하므로, Type별로 mainZone.h가 달라짐:

| Type | store.y | slogan.y | details.y | summary.y | mainZone.h | 필요 ratio | 기존 ratio |
|------|---------|----------|-----------|-----------|------------|------------|------------|
| Type 1 | 7 | 16 | 74 | 86 | 57% | 0.7125 | 0.85 |
| Type 2 | 10 | 65 | 74 | 86 | 고정 68% | 0.85 | 0.85 |
| Type 3 | 83 | 90 | 12 | 74 | 61% | 0.7625 | 0.85 |
| Type 4 | 11 | 23 | 77 | 88 | 53% | 0.6625 | 0.85 |

mainZone.h ≠ 68%인 경우, 이미지 너비가 실제보다 넓게 계산되어
`object-fit: contain` 렌더링 시 이미지와 슬롯 컨테이너 사이에 공백이 발생.

### 4.3 해결 방법

하드코딩된 `CANVAS_HW_RATIO`를 동적 `hwRatio` 파라미터로 교체.

**공식:** `hwRatio = mainZone.h × canvasAR / 100`

여기서 `canvasAR = canvasHeight / canvasWidth` (4:5 → 1.25, 9:16 → 1.778, 1:1 → 1.0)

```typescript
// ratio.ts — 캔버스 종횡비 헬퍼 추가
export function ratioToCanvasAR(ratio?: string): number {
  switch (ratio) {
    case '1:1':  return 1.0;
    case '9:16': return 16 / 9;
    case '4:5':
    default:     return 5 / 4;
  }
}
```

```typescript
// editorFlow.ts — 호출 지점에서 동적 ratio 계산
const mainZone = computeMainZoneDynamic(zones);
const hwRatio = mainZone.h * ratioToCanvasAR(ratio) / 100;

computeWireframeProductPlacements(typeIndex, productCount, hasSlogan, activeProducts, hwRatio);
```

```typescript
// wireframeLayout.ts — 함수 체인 전체에 hwRatio 전달
function scaledWidthOrFallback(slot, product, hwRatio) {
  return iw * AR * hwRatio; // 기존: iw * AR * 0.85
}
```

### 4.4 검증

**Type 4 (mainZone.h ≈ 53%, 4:5 캔버스):**
- 기존: `hwRatio = 0.85` → 너비 과대 계산 → 페어 이미지 사이 공백 발생
- 수정: `hwRatio = 53 × 1.25 / 100 = 0.6625` → 정확한 너비 → 공백 해소

**Type 1 (mainZone.h = 68%, 4:5 캔버스):**
- `hwRatio = 68 × 1.25 / 100 = 0.85` → 기존과 동일 (회귀 없음)

### 4.5 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `editing/utils/ratio.ts` | `ratioToCanvasAR()` 헬퍼 함수 추가 |
| `editing/utils/wireframeLayout.ts` | `scaledWidthOrFallback`, `computeType3PairLayout`, `computeType4HalfCropLayout`, `computeWireframeProductPlacements`에 `hwRatio` 파라미터 추가 |
| `editing/utils/editorFlow.ts` | `createElementsFromWireframe`, `applyDraftLayoutVariant` 두 호출 지점에서 동적 `hwRatio` 계산 후 전달 |

## 5. wireframeSlots.json 미수정

JSON 원본 좌표는 변경하지 않음. 런타임에서 `centerSlotsVertically()`로 동적 보정하는 방식 채택.

**이유:**
- JSON 수정 시 다른 소비자(있을 경우)에 영향
- 향후 mainZone 높이가 변경되어도 자동 대응
- 원본 좌표 보존으로 롤백 용이
