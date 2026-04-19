# 04. 와이어프레임 레이아웃 엔진 보고서

- 대상:
  - `react/src/modules/initPage/components/wireframe/**`
  - `react/src/modules/editing/utils/wireframeLayout.ts`
  - `react/src/modules/editing/utils/wireframeTextPlacements.ts`
  - `react/src/modules/editing/utils/wireframeBridge.ts`
  - `react/src/modules/editing/utils/ratio.ts`
- 역할: 제품 N 장을 Type 1-4 구도 중 하나로 캔버스 위에 배치하는 두 개의 병렬
  엔진을 소개한다. 한쪽은 InitPage 의 JSX 렌더러, 한쪽은 EditingModule 의
  EditorElement 공급자.
- 상위 문서: `02_initPage_module.md § 5`, `03_editing_module.md § 5`

이 엔진은 프로젝트에서 **가장 수학적인 모듈**이다. 같은 결과(동일 좌표/폭)를
두 경로로 내놓기 위해 수식이 정교하게 일치되어야 한다. 2026-04-17 의 Type 4
버그는 바로 이 일치가 깨진 사례였다 — 자세한 복구 이력은
[../0417/wireframe_choice_card_type4_fix.md](../0417/wireframe_choice_card_type4_fix.md).

---

## 1. 두 개의 엔진

| 엔진 | 위치 | 결과물 | 호출처 |
|------|------|--------|--------|
| **JSX 엔진** | `initPage/components/wireframe/*.jsx` + `computeSlotStyle.js` | `<div>` + `<img>` DOM 트리 | InitPage `WireframeChoiceCard` (init 측), editing `WireframeChoiceCard.tsx` (공유), `BackgroundCard.tsx` (재사용) |
| **Element 엔진** | `editing/utils/wireframeLayout.ts` + `wireframeTextPlacements.ts` | `WireframeProductPlacement[]` / `WireframeDerivedLayout` → `EditorElement[]` | editing `editorFlow.createElementsFromWireframe` → `EditorCanvas` main preview |

두 엔진은 같은 slot 원본(`wireframeSlots.json`) 을 참조하지만:

- JSX 엔진은 `useImageAR` 로 이미지 naturalSize 를 async 로 측정한 후
  최종 DOM 스타일을 내놓는다.
- Element 엔진은 measurement 를 **async 하게 기다리지 않고**, `HomeProductInput`
  에 미리 주입된 `imageNaturalWidth/Height` 를 써서 한 번에 계산한다
  (prebake 가 선행되어야 하는 이유).

---

## 2. 공통 원시 데이터: `wireframeSlots.json`

```
wireframes[key] = { slots: [{ Cx, Cy, sw, sh }, ...] }
```

- 좌표계: **제품 존(main zone) 내부 기준 0-100%**. 전체 캔버스가 아님.
- `Cx/Cy` : 슬롯 중심 (%), `sw/sh` : 슬롯 폭·높이 (%).
- key 규약: `"{type}-{productCount}-{hasSlogan?1:0}"`
  예: `"4-3-1"` = Type 4, 제품 3장, 슬로건 있음.
- 1장 케이스는 공용키 `"n-1-1"` / `"n-1-2"` (type 무관).

### 2.1 Main zone 정의

`computeSlotStyle.js` 와 `outerFrameZones.ts` 에 선언:

- `MAIN_ZONE_4x5 = { x: 0, y: 12, w: 100, h: 68 }` — 4:5 캔버스의 제품 존.
- `MAIN_ZONE_HW_RATIO = 0.85` — `h(68%) * 캔버스AR(1.25) / 100 = 0.85`
  (이미지폭을 높이% → 폭% 로 바꾸는 비례 상수).
- `computeMainZoneDynamic(zonePositions)` — 사용자가 zone 을 움직였을 때 쓰는
  동적 버전.

> **중요**: `MAIN_ZONE_HW_RATIO = 0.85` 는 "mainZone.h=68% AND canvas=4:5" 에서만
> 정확하다. zone 이 움직이거나 canvas 비율이 바뀌면 `hwRatio` 를 매 렌더
> 재계산해야 한다 — `productZone.h * ratioToCanvasAR(ratio) / 100`.

---

## 3. JSX 엔진 — InitPage wireframe 폴더

```
wireframe/
├── index.js                      ─ barrel
├── wireframeSlots.json           ─ slot geometry (원시)
├── layoutConfig.js               ─ Type1/2 고정 %좌표 (컨테이너 레벨)
├── outerFrameZones.ts            ─ MAIN_ZONE_4x5, 9:16, dynamic, MAIN_ZONE_HW_RATIO
├── computeSlotStyle.js           ─ AR 기반 슬롯 스타일 계산 (핵심 수식 엔진)
├── useImageAR.js                 ─ <img> naturalSize async 측정 훅
├── ProductSlot.jsx               ─ 단일 제품 슬롯 기본 렌더러
├── utils.js                      ─ useDecorOverlays 등
├── SingleLargeLayout.jsx         ─ Type 1 (단독 대형)
├── SingleCompactLayout.jsx       ─ Type 2 (단독 컴팩트)
├── OverlapGroupLayout.jsx        ─ Type 3 (페어 오버랩)
└── HalfCropGroupLayout.jsx       ─ Type 4 (반크롭 페어)
```

### 3.1 computeSlotStyle.js — 수식의 심장

세 개의 공식 API:

- `computeSlotStyle(slotMeta, imageNaturals, side)`
  Type 4 용. `side ∈ {'left', 'right', 'single'}`.
  반환: `{ containerStyle, imgStyle }`.
- `computeType3Style(slotMeta, imageNaturals)`
  Type 3 용. 반환: `{ wScaled, hScaled }` 만.
- `getFallbackStyle(slotMeta, side)`
  이미지 로드 전 placeholder — 1:1 비율 가정.

수식 요약:

```
AR      = sh / ih                            # height-anchored
wScaled = iw * AR * CANVAS_HW_RATIO          # (%)
w_final = wScaled / 2                        # half-crop 각 반쪽의 CSS 폭
```

주의: **CANVAS_HW_RATIO 는 상수 0.85** 로 박혀 있다. 이는 다른 Type(1/2/3) 과의
일관성 을 위해 유지되며, Type 4 의 동적 productZone 케이스는
`HalfCropGroupLayout.jsx` 내부의 인라인 `computeSlotStyleDynamic` 이 담당 (§ 6).

### 3.2 useImageAR.js

짧은 훅 (19 L):

```js
export const useImageAR = (src) => {
  const [dims, setDims] = useState(null);
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => setDims({ naturalWidth: img.width, naturalHeight: img.height });
    img.src = src;
  }, [src]);
  return dims;
};
```

첫 렌더엔 `null` → fallback, onload 후엔 실측치로 재계산. 편집 중엔 src 가
바뀔 때마다 재요청.

### 3.3 Layout 컴포넌트 4종

| 파일 | 전략 | 핵심 |
|------|------|------|
| `SingleLargeLayout.jsx` (167 L) | `layoutConfig.TYPE1` 의 고정 %좌표로 N=1-3 배치. 3장일 때 중앙 강조 staggered. | container-level 배치 (slot metadata 미사용) |
| `SingleCompactLayout.jsx` (212 L) | 동일하게 `TYPE2` 사용. 3장일 때 `transform: scale(1.05)` 로 중앙 약간 확대. | 주로 제품 텍스트(이름/가격)를 함께 렌더 |
| `OverlapGroupLayout.jsx` (267 L) | `wireframeSlots.json` 의 슬롯 좌표 + `computeType3Style` 로 pair 오버랩. `OVERLAP_RATIO = 0.2`. 홀수 마지막은 single. | `groupPairs` 로 좌/우 묶고 `pairCx = (leftCx + rightCx)/2` 중앙 기준으로 wL/wR 를 대칭 배치 |
| `HalfCropGroupLayout.jsx` (256 L) | 슬롯 좌표 + `computeSlotStyleDynamic` (인라인, Type 4 전용 동적 hwRatio). 페어 중앙선이 두 슬롯이 맞닿는 모서리. | `mapSlotsToProducts` 가 짝수 i → left, 홀수 i → right, 홀수 끝 → single 분기 |

Layout 4종은 모두 동일한 props 계약:
`{ products, options, inputData, ratioStyles, zonePositions, textStyles }`.

### 3.4 layoutConfig.js — Type 1 / Type 2 고정 프리셋

Type 1 / Type 2 는 이미지 AR 에 따라 폭이 변하지 않고, **고정 container %** 로만
배치한다 (count 별 object 리터럴). 이 때문에 편집 쪽 Element 엔진도
§ 5.2 의 "Individual AR scaling" 으로 맞춰 두었다.

---

## 4. Element 엔진 — `editing/utils/wireframeLayout.ts`

편집 모듈은 EditorElement 를 drag/resize 하기 때문에, JSX 를 직접 마운트하는
대신 **좌표와 이미지URL 을 배열로** 돌려받는 함수를 쓴다.

### 4.1 API 요약

```ts
export function deriveWireframeLayout(
  draftIndex: 0 | 1 | 2 | 3,
  productCount: number,
  hasSlogan: boolean,
): WireframeDerivedLayout

export function computeWireframeProductPlacements(
  draftIndex: 0 | 1 | 2 | 3,
  productCount: number,
  hasSlogan: boolean,
  products: HomeProductInput[],
  hwRatio?: number,
): WireframeProductPlacement[]

export function computeType3PairLayout(slots, products, hwRatio?): WireframeProductPlacement[]
export function computeType4HalfCropLayout(slots, products, hwRatio?): WireframeProductPlacement[]
```

`WireframeProductPlacement`:

```ts
{
  rect: { x, y, width, height },          // % (캔버스 기준)
  imageUrlOverride?: string,              // Type 4 반크롭 dataURL
  halfSide?: 'left' | 'right' | 'single', // 디버그/테스트
  zIndex?: number,                        // Type 3 오버랩 순서
}
```

### 4.2 Type 별 분기

```
computeWireframeProductPlacements(draftIndex, count, hasSlogan, products, hwRatio)
├─ draftIndex === 2 → computeType3PairLayout(slots, products, hwRatio)
├─ draftIndex === 3 → computeType4HalfCropLayout(slots, products, hwRatio)
└─ draftIndex === 0|1 → Individual AR scaling
       slots.map((slot, i) => ({
         rect: {
           x: slot.Cx - wScaled/2,
           y: slot.Cy - slot.sh/2,
           width: wScaled,  // scaledWidthOrFallback(slot, products[i], hwRatio)
           height: slot.sh,
         }
       }))
```

### 4.3 Type 3 수식 (OverlapGroup)

```
wL = iwL * (sh / ihL) * hwRatio
wR = iwR * (sh / ihR) * hwRatio
Ow = (wL + wR) * 0.2           # OVERLAP_RATIO
pairCx = (leftSlot.Cx + rightSlot.Cx) / 2
leftRect  = { x: pairCx + Ow/2 - wL, y: Cy - sh/2, width: wL, height: sh, zIndex: 1 }
rightRect = { x: pairCx - Ow/2,      y: Cy - sh/2, width: wR, height: sh, zIndex: 2 }
```

홀수 마지막은 `side: 'single'` → `wScaled` 를 그대로 써서 slot 중앙.

### 4.4 Type 4 수식 (HalfCrop)

```
W_scaled = iw * (sh / ih) * hwRatio
w_final  = W_scaled / 2
left:  pairCx = slot.Cx + slot.sw/2  # 왼쪽 슬롯의 오른쪽 변
right: pairCx = slot.Cx - slot.sw/2  # 오른쪽 슬롯의 왼쪽 변
left rect:  { x: pairCx - w_final, y: Cy - sh/2, width: w_final, height: sh, imageUrlOverride: imageLeftHalf }
right rect: { x: pairCx,           y: Cy - sh/2, width: w_final, height: sh, imageUrlOverride: imageRightHalf }
```

홀수 마지막은 `wScaled` 폭 + 원본 이미지 (single).

### 4.5 fallback: `scaledWidthOrFallback`

```ts
function scaledWidthOrFallback(slot, product, hwRatio) {
  const iw = product.imageNaturalWidth;
  const ih = product.imageNaturalHeight;
  if (!iw || !ih) return slot.sw;    // prebake 미완료 시 안전망
  const AR = slot.sh / ih;
  return iw * AR * hwRatio;
}
```

---

## 5. 두 엔진이 일치해야 하는 이유

editing 의 **main preview (EditorCanvas)**, **BackgroundCard** 는 Element 엔진.
**WireframeChoiceCard (Type 선택 카드)** 는 JSX 엔진. 사용자는 화면에서 이
셋을 나란히 본다. 폭이 어긋나면 "선택한 모양과 다른 결과물" 이라는 버그.

두 엔진의 일치를 위해 지켜야 하는 규약:

1. **같은 slot 원본** — `wireframeSlots.json`. (Element 엔진은
   `wireframeBridge.ts` 가 이를 얇게 재수출)
2. **같은 hwRatio** — Type 3/4 는 모두 `productZone.h * ratioToCanvasAR / 100`.
   (Element 엔진 기본값 `DEFAULT_HW_RATIO = MAIN_ZONE_HW_RATIO = 0.85` 도 동일
   상수를 공유)
3. **같은 OVERLAP_RATIO** — 0.2. 두 파일에 동일값이 박혀 있음.
4. **같은 홀수 single 분기** — `i === n-1 && isOdd → single`.
5. **같은 pair 중앙선** — Type 4 는 슬롯의 모서리, Type 3 는 두 슬롯 Cx 의 중점.

---

## 6. 2026-04-17 Type 4 버그 — 왜 깨졌고 어떻게 격리했나

### 6.1 증상

- Type 4 선택 후 이미지 개수 홀수(1/3/5) 일 때 마지막 1장이 half-crop 처리됨.
- pair/single 모두 main preview 보다 **눈에 띄게 두꺼워짐**.

### 6.2 원인 (단일 근본 원인)

`computeSlotStyle.js` 의 `CANVAS_HW_RATIO = 0.85` 상수 하드코딩.
WireframeChoiceCard 의 productZone 이 `MAIN_ZONE_4x5` 와 다른 경우에도 0.85 가
고정 사용되어 `wScaled` 가 실제 productZone.h 와 어긋난다. AR 이 비대칭으로
확대되어 `object-fit:cover` 가 상/하를 잘라내고, 폭도 과대.

### 6.3 수정 (Option 2 — 예외 격리)

공유 `computeSlotStyle.js` 는 건드리지 않고, `HalfCropGroupLayout.jsx` 내부에
인라인 `computeSlotStyleDynamic(slotMeta, imageNaturals, side, hwRatio)` 를 신설.
Type 4 전용이므로 다른 Layout 회귀 없음.

```jsx
const hwRatio = productZone.h * ratioToCanvasAR(options.ratio) / 100;

<HalfCropSlot ... hwRatio={hwRatio} />
```

상세 내용은 [../0417/wireframe_choice_card_type4_fix.md](../0417/wireframe_choice_card_type4_fix.md)
와 [../../../.omc/specs/deep-interview-wireframe-choice-card-type4.md](../../../.omc/specs/deep-interview-wireframe-choice-card-type4.md).

---

## 7. `wireframeTextPlacements.ts`

Store / Slogan 의 (x, y, width, height) 을 Type 별로 하드코딩한 사전:

```ts
WIREFRAME_TEXT_PLACEMENTS: Record<0|1|2|3, WireframeTypeTextPlacement>
```

이 사전은 **Element 엔진 전용**이다. JSX 엔진은 `StoreTitle` / `SloganText` 를
zonePositions 나 기본 CSS 로 직접 렌더한다. 그래서 Type 별 텍스트 placement 을
바꾸려면 두 쪽 모두 수정 필요.

---

## 8. `wireframeBridge.ts`

33 줄짜리 재수출 파일. editing 모듈이 init 측 상수/함수를 직접 import 하는 것을
피하기 위한 경계 레이어:

```ts
export {
  getWireframeSlots, centerSlotsVertically, MAIN_ZONE_HW_RATIO,
} from '../../initPage/components/wireframe/computeSlotStyle';
export { ... } from '../../initPage/components/wireframe/outerFrameZones';
export type { FrameZone } from '../../initPage/components/wireframe/outerFrameZones';
```

editing 쪽 코드는 이 bridge 를 import 해서 "InitPage 디렉터리 구조" 에 직접
커플링되지 않는다. 파일 이동 시 bridge 만 고치면 된다.

---

## 9. `ratio.ts` — 단위 변환 유틸

24 줄:

```ts
export function ratioToAspectValue(ratio?: string): number {
  // '4:5' → 4/5 = 0.8 등. CSS aspect-ratio 용
}
export function ratioToCanvasAR(ratio?: string): number {
  // '4:5' → 1.25 (H/W), '9:16' → 16/9, '1:1' → 1.0
  // hwRatio 계산의 핵심 — 캔버스 높이를 폭 %로 환산하는 배수
}
```

- `ratioToCanvasAR('4:5') = 1.25` → mainZone.h(68%) * 1.25 / 100 = 0.85
- `ratioToCanvasAR('9:16') = 16/9 ≈ 1.778` → 9:16 세로 캔버스는 hwRatio ≈ 1.21
- `ratioToCanvasAR('1:1') = 1.0` → square 는 mainZone.h / 100

---

## 10. Type 별 요약 표

| Type | 컴포넌트 (JSX) | Element 공식 | 이미지 처리 | 홀수 처리 |
|------|----------------|--------------|-------------|-----------|
| 1 SingleLarge | `SingleLargeLayout` | Individual AR scaling (§ 4.2) | 원본, center | N/A (각 슬롯 독립) |
| 2 SingleCompact | `SingleCompactLayout` | 동일 | 원본, center | N/A |
| 3 OverlapGroup | `OverlapGroupLayout` | `computeType3PairLayout` | 원본, overlap pair | 마지막 single |
| 4 HalfCropGroup | `HalfCropGroupLayout` | `computeType4HalfCropLayout` | `imageLeftHalf/Right` 프리베이크 dataURL | 마지막 single (원본) |

---

## 11. 변경 포인트 가이드

| 변경 목적 | 수정 위치 | 동반 수정 |
|-----------|-----------|-----------|
| 새 count 케이스 추가 (e.g. Type 4 count 7) | `wireframeSlots.json` 에 `"4-7-1"`/`"4-7-2"` 추가 | JSX 엔진은 자동으로 집음. Element 엔진도 자동. |
| Type 2 고정 좌표 변경 | `layoutConfig.TYPE2.countN` | Element 엔진 Individual AR scaling 도 원본 slot 을 쓰므로 일치 확인. |
| Type 3 OVERLAP_RATIO 조정 | `wireframeLayout.ts` const + `OverlapGroupLayout.jsx` 내부 같은 값 | 두 곳 동시 변경. |
| 새 Type 5 추가 | Layout jsx 신설 + `WireframeChoiceCard` 에 카드 추가 + `wireframeLayout.ts` 에 dispatch 분기 추가 + `wireframeTextPlacements.ts` 사전 확장 + `editorFlow.applyDraftLayoutVariant` 분기 | 최소 5 파일 수정 |
| Type 4 hwRatio 공식 변경 | `HalfCropGroupLayout.jsx.hwRatio` 계산 + `wireframeLayout.ts.computeType4HalfCropLayout(hwRatio 기본값/호출자)` | 두 엔진 동기 필수. `computeSlotStyle.js` 는 건드리지 않는 것이 관례(0417 격리). |
| 9:16 캔버스 정상화 | `ratioToCanvasAR` 및 `computeMainZone916` | `hwRatio` 자동 반영되지만 text placement 는 별도 확인 |

---

## 12. 테스트 관점 체크리스트

- [ ] Type 4, product count = 1/3/5 에서 마지막 이미지가 slot 전체 폭 +
      원본 비율로 렌더되는가. (홀수 single 분기 검증)
- [ ] Type 4 에서 WireframeChoiceCard 폭과 main preview 폭이 동일한가.
- [ ] Type 3, product count = 4 에서 두 pair 의 overlap 폭이 `OVERLAP_RATIO = 0.2`
      기준과 일치하는가.
- [ ] 이미지 prebake 실패 시 `scaledWidthOrFallback` 이 `slot.sw` 로 graceful
      fallback 되는가.
- [ ] `zonePositions` 를 편집 모듈에서 변경해도 (예: 로고 이동) 제품 존
      `productZone` 이 `computeMainZoneDynamic` 으로 재계산되는가.
- [ ] `ratio` 를 4:5 → 9:16 으로 바꾸었을 때 `hwRatio` 가 `productZone.h * 16/9 / 100`
      으로 반영되고 이미지 폭이 자연스럽게 넓어지는가.
- [ ] StrictMode 에서 `useImageAR` 이 중복 onload 되어도 스타일이 깜빡이지 않는가.

---

## 13. 관련 경로

### JSX 엔진
- [wireframe/](../../react/src/modules/initPage/components/wireframe/)
- [computeSlotStyle.js](../../react/src/modules/initPage/components/wireframe/computeSlotStyle.js)
- [layoutConfig.js](../../react/src/modules/initPage/components/wireframe/layoutConfig.js)
- [HalfCropGroupLayout.jsx](../../react/src/modules/initPage/components/wireframe/HalfCropGroupLayout.jsx)
- [OverlapGroupLayout.jsx](../../react/src/modules/initPage/components/wireframe/OverlapGroupLayout.jsx)
- [SingleLargeLayout.jsx](../../react/src/modules/initPage/components/wireframe/SingleLargeLayout.jsx)
- [SingleCompactLayout.jsx](../../react/src/modules/initPage/components/wireframe/SingleCompactLayout.jsx)

### Element 엔진
- [wireframeLayout.ts](../../react/src/modules/editing/utils/wireframeLayout.ts)
- [wireframeTextPlacements.ts](../../react/src/modules/editing/utils/wireframeTextPlacements.ts)
- [wireframeBridge.ts](../../react/src/modules/editing/utils/wireframeBridge.ts)
- [ratio.ts](../../react/src/modules/editing/utils/ratio.ts)

### 기록
- [../0417/wireframe_choice_card_type4_fix.md](../0417/wireframe_choice_card_type4_fix.md) — 2026-04-17 Type 4 격리 패치
- [../../../.omc/specs/deep-interview-wireframe-choice-card-type4.md](../../../.omc/specs/deep-interview-wireframe-choice-card-type4.md) — 딥 인터뷰 스펙
