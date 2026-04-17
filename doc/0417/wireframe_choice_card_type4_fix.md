# WireframeChoiceCard Type 4 버그 수정 보고서

- 작성일: 2026-04-17
- 대상: `WireframeChoiceCard`가 렌더하는 **Type 4 (half-crop group)** 레이아웃
- 참조 스펙: `.omc/specs/deep-interview-wireframe-choice-card-type4.md`
  (Deep Interview 1라운드, Ambiguity 18.1% / PASSED)
- 수정 방식: Option 2 — **예외 격리**. 공유 util `computeSlotStyle.js`는 건드리지
  않고 Type 4 전용 경로인 `HalfCropGroupLayout.jsx` 내부에 동적 hwRatio 로직을
  인라인 추가.

---

## 1. 문제 요약

`initPage` 의 `WireframeChoiceCard` 에서 Type 4 를 선택했을 때, 렌더 결과가 다음과
같이 참조 뷰(main preview / BackgroundCard) 와 일치하지 않았다.

1. **홀수 마지막 이미지 오크롭.** 이미지 수가 홀수(1, 3, 5 개) 일 때, 페어로 묶이지
   않는 마지막 1장이 pair 와 동일한 폭 공식으로 계산돼서 너비가 반토막 나고 상·하가
   잘린 "중간만 보이는" 상태가 되었다.
2. **전체 이미지 폭이 과대.** pair/single 모두 main preview 보다 폭이 더 넓게 출력.

두 증상 모두 **WireframeChoiceCard 경로에서만** 발생했고, main preview 및
BackgroundCard 는 정상이었다. 즉 레이아웃 스펙 자체는 정답이 있는 상태에서
WireframeChoiceCard 쪽 스케일링이 어긋난 문제였다.

---

## 2. 렌더 경로 비교 (핵심 단서)

Type 4 는 서로 다른 두 경로로 그려진다.

| 경로 | 엔진 | 핵심 함수 | hwRatio 근거 |
|------|------|-----------|--------------|
| 참조 (main preview, BackgroundCard) | `EditorElement[]` 기반 | `computeWireframeProductPlacements` → `computeType4HalfCropLayout` | **동적**: `hwRatio = mainZone.h * ratioToCanvasAR(ratio) / 100` |
| 버그 (WireframeChoiceCard) | JSX 기반 | `HalfCropGroupLayout` → `computeSlotStyle` | **하드코딩**: `CANVAS_HW_RATIO = MAIN_ZONE_HW_RATIO = 0.85` |

- `mainZone.h`: 현재 캔버스에서 제품 영역이 차지하는 세로 비율 (%).
- `ratioToCanvasAR(ratio)`: 캔버스 세로/가로 비. 4:5 → 1.25, 9:16 → 16/9, 1:1 → 1.
- 4:5 기본 `MAIN_ZONE_4x5.h = 68` 기준으로 참조 식을 풀면
  `68 * 1.25 / 100 = 0.85` 로 우연히 상수와 일치한다. 그래서 기본 zone 에선 증상이
  약했지만, **zonePositions 로 productZone 이 재계산되거나 캔버스 비율이 달라지면**
  즉시 어긋나기 시작한다. WireframeChoiceCard 는 zonePositions 를 받아
  `computeMainZoneDynamic` 으로 productZone 을 다시 잡으므로 이 어긋남이 항상
  드러난다.

---

## 3. 근본 원인 (확정)

초기 진단은 "홀수 마지막 이미지가 pair 분기에 잘못 들어간 것" 이었으나, 코드를
읽어보면 `HalfCropGroupLayout.jsx:111` 의 `mapSlotsToProducts` 가 `isLastAndOdd`
조건으로 이미 `side: 'single'` 을 정확히 디스패치하고 있었다. 디스패치는 정상이고,
문제는 `computeSlotStyle` 이 사용하는 **scaling factor** 하나뿐이었다.

```js
// react/src/modules/initPage/components/wireframe/computeSlotStyle.js (수정 전)
const CANVAS_HW_RATIO = MAIN_ZONE_HW_RATIO; // 0.85 고정
...
const wScaled = iw * AR * CANVAS_HW_RATIO;
```

- `wScaled` 는 container 의 CSS width% 를 만든다.
- container AR 이 실제 naturalAR 과 벗어나면, 내부 `objectFit: cover` 가 모자란
  축 방향을 잘라낸다. 폭이 과대하면 container 가 가로로 부풀고, 세로 방향이 상대적
  으로 모자라져 상·하가 잘리는 모양이 된다 → **두 증상이 단일 원인으로 환원**.

즉:

- **Bug 1 (오크롭)** = single 분기의 `wScaled` 가 잘못된 hwRatio 로 과대 계산됨
  → AR 미스매치 → cover 가 상·하를 자름.
- **Bug 2 (두께 과대)** = 같은 `wScaled` 오차가 pair/single 모두에서 폭을 키움.

참조 경로 (`computeType4HalfCropLayout`) 는 같은 공식을 쓰되 hwRatio 를 productZone
에서 매번 다시 계산하므로 어떤 zone/ratio 조합에서도 올바르게 맞춘다.

---

## 4. 수정 범위와 격리 원칙

사용자 지시에 따라 "예외사항이니 분리" 원칙을 지켰다. 변경한 파일은 **딱 하나**.

### 변경됨
- `react/src/modules/initPage/components/wireframe/HalfCropGroupLayout.jsx`

### 변경하지 않음 (의도적)
- `react/src/modules/initPage/components/wireframe/computeSlotStyle.js`
  - 여기의 `CANVAS_HW_RATIO`, `computeSlotStyle`, `computeType3Style`,
    `getFallbackStyle` 은 Type 3 레이아웃, 1 개 single wireframe (n-1-x),
    fallback 스타일 등 **여러 경로가 공유**한다. 한 상수를 인자로 바꾸면 다른
    Layout 에도 동시 영향이 가므로 Type 4 버그 수정 목적과 범위가 맞지 않는다.
- `react/src/modules/editing/utils/wireframeLayout.ts`
  - 이미 정답 경로. 참조용으로만 사용.
- `react/src/modules/editing/utils/editorFlow.ts`
  - 독립 경로, 이번 수정과 무관.
- 기타 Type 1/2/3 레이아웃, WireframeChoiceCard 의 `scaleFactor` 래퍼 구조.

---

## 5. 구체적 변경 내용

### 5.1 import 정리

공유 util 의 `computeSlotStyle` 대신, 새 파일 내 인라인 계산 함수를 쓰고 ratio 변환
함수만 `editing/utils/ratio` 에서 가져온다.

```diff
- import { computeSlotStyle, getFallbackStyle, getWireframeSlots, centerSlotsVertically } from './computeSlotStyle';
+ import { getFallbackStyle, getWireframeSlots, centerSlotsVertically } from './computeSlotStyle';
  import { MAIN_ZONE_4x5, computeMainZone916, computeMainZoneFromZones, computeMainZoneDynamic } from './outerFrameZones';
+ import { ratioToCanvasAR } from '../../../editing/utils/ratio';
```

- `getFallbackStyle` 은 이미지 로드 전 용도로 그대로 유지 (hwRatio 와 무관,
  `sw` 만 사용).
- `getWireframeSlots`, `centerSlotsVertically` 는 슬롯 좌표 가져오는 부분이라
  그대로 공유.
- `computeSlotStyle` 만 더는 호출하지 않는다.

### 5.2 Type 4 전용 인라인 스타일 함수

파일 상단에 `computeSlotStyleDynamic` 을 추가. 기존 `computeSlotStyle` 과 수식은
같지만, `CANVAS_HW_RATIO` 상수 대신 **인자로 받는 `hwRatio`** 를 곱한다.

```jsx
// HalfCropGroupLayout.jsx (신규)
const computeSlotStyleDynamic = (slotMeta, imageNaturals, side, hwRatio) => {
  const { naturalWidth: iw, naturalHeight: ih } = imageNaturals;
  if (!iw || !ih) return getFallbackStyle(slotMeta, side);

  const { Cx, Cy, sh } = slotMeta;
  const AR = sh / ih;

  if (side === 'single') {
    const wScaled = iw * AR * hwRatio;
    return {
      containerStyle: {
        left: (Cx - wScaled / 2) + '%',
        top: (Cy - sh / 2) + '%',
        width: wScaled + '%',
        height: sh + '%',
      },
      imgStyle: {
        width: '100%', height: '100%',
        objectFit: 'cover',
        objectPosition: 'center center',
        display: 'block',
      },
    };
  }

  const W_scaled = iw * AR * hwRatio;
  const w_final = W_scaled / 2;
  return {
    containerStyle: {
      left: (side === 'left' ? Cx - w_final : Cx) + '%',
      top: (Cy - sh / 2) + '%',
      width: w_final + '%',
      height: sh + '%',
    },
    imgStyle: {
      width: '100%', height: '100%',
      objectFit: 'cover',
      objectPosition: side === 'left' ? 'left center' : 'right center',
      display: 'block',
    },
  };
};
```

설계 포인트:
- **완전 동일한 대수식.** 버그는 식이 아니라 factor 값이었으므로 식을 건드리지 않는다.
- **single / left / right 모든 분기가 동일한 hwRatio 를 받는다.** main preview 참조
  경로와 일치.
- `getFallbackStyle` 은 이미지 로딩 전 짧은 순간만 쓰이고, `sw` (wireframeSlots.json
  의 명시 폭) 를 그대로 쓰므로 hwRatio 와 무관 → 그대로 재사용.

### 5.3 `HalfCropSlot` 시그니처 확장

```diff
- const HalfCropSlot = ({ product, slotMeta, side, isSquare }) => {
+ const HalfCropSlot = ({ product, slotMeta, side, isSquare, hwRatio }) => {
    const dims = useImageAR(product?.image);
    const { containerStyle, imgStyle } = dims
-     ? computeSlotStyle(slotMeta, dims, side)
+     ? computeSlotStyleDynamic(slotMeta, dims, side, hwRatio)
      : getFallbackStyle(slotMeta, side);
```

`hwRatio` 만 prop 으로 추가, 나머지 라벨 / 이미지 / overflow 처리는 그대로.

### 5.4 `HalfCropGroupLayout` 에서 hwRatio 산출

productZone 계산 **직후**에 참조 식과 동일한 형태로 hwRatio 를 만든다.

```jsx
const productZone = zonePositions
  ? computeMainZoneDynamic(zonePositions)
  : (isTall ? computeMainZone916() : MAIN_ZONE_4x5);

// main preview(wireframeLayout.ts)와 동일한 공식으로 Type 4 폭을 계산.
// productZone이 고정 MAIN_ZONE_HW_RATIO(0.85)와 다를 수 있어 매 렌더 재계산.
const hwRatio = productZone.h * ratioToCanvasAR(options.ratio) / 100;
```

이후 `.map()` 에서 `hwRatio` 를 각 `HalfCropSlot` 으로 전달한다.

```diff
  {mapped.map(({ product, slotMeta, side }, idx) => (
    <HalfCropSlot
      key={product.id || idx}
      product={product}
      slotMeta={slotMeta}
      side={side}
      isSquare={isSquare}
+     hwRatio={hwRatio}
    />
  ))}
```

---

## 6. 왜 이 변경이 두 버그를 모두 고치는가

- `hwRatio` 가 productZone / ratio 변경에 따라 **매 렌더 재계산**되므로,
  WireframeChoiceCard 가 어떤 zone / ratio 를 받아도 참조 경로와 동일한 container
  폭이 나온다 → **Bug 2 해결** (thickness).
- single 분기에서 `wScaled` 가 올바른 폭으로 계산되면 container AR 이 이미지
  naturalAR 과 근접해져 `objectFit: cover` 가 상·하를 잘라낼 여지가 사라진다 →
  **Bug 1 해결** (odd-last crop).
- pair 분기의 `w_final = W_scaled / 2` 도 동일한 보정된 `W_scaled` 를 쓰므로
  좌/우 half-crop 이 기존 의도대로 절반만 보이는 상태를 유지한다.

---

## 7. 회귀 리스크 검토

| 항목 | 리스크 | 결론 |
|------|--------|------|
| Type 1/2/3 | `computeSlotStyle.js` 미수정 | 영향 없음 |
| `computeType3Style` 사용처 (SingleLargeLayout 등) | 동일 파일의 `CANVAS_HW_RATIO` 참조, 미변경 | 영향 없음 |
| DraftCard, BackgroundCard | 각자 독립 경로, 미변경 | 영향 없음 |
| main preview (`wireframeLayout.ts`) | 원래 정답, 미수정 | 영향 없음 |
| scaleFactor 래퍼 | 상수 transform scale 은 상대 폭만 영향 | 본 수정과 독립 |
| fallback(로딩 전) 렌더 | `getFallbackStyle` 그대로 사용 | 기존 동작 유지 |

`HalfCropGroupLayout.jsx` 의 유일한 소비자는 `WireframeChoiceCard.tsx` 이므로
Type 4 파급 범위도 자연히 그 한 컴포넌트로 국한된다.

---

## 8. 검증

1. **타입체크:** `npx tsc --noEmit` → 에러 없음 (exit 0).
2. **정적 검토:**
   - `mapSlotsToProducts` 가 pair/single 분기를 올바르게 내린다는 사실을 재확인.
   - 참조 식 (`mainZone.h * ratioToCanvasAR / 100`) 이 WireframeChoiceCard 쪽
     `productZone.h * ratioToCanvasAR(options.ratio) / 100` 과 의미적으로 동일함을 확인.
3. **육안 검증 (권장 체크리스트):**
   - 제품 1 개 선택 → 단독 이미지가 슬롯 전체 폭, 원본 비율로 렌더되는가.
   - 제품 3 개 선택 → 앞 2 개 pair (좌/우 half-crop) + 마지막 1 개 single.
   - 제품 4 개 선택 → pair × 2.
   - main preview / BackgroundCard 와 나란히 세워 폭과 크롭이 일치하는가.
   - 4:5 뿐 아니라 9:16, 1:1 캔버스에서도 동일한지 스팟 체크.

---

## 9. 후속 고려 사항 (스코프 외)

- 장기적으로는 WireframeChoiceCard 를 `EditorElement[]` 기반으로 통일하면 두
  경로의 중복이 사라지지만, 이번 수정의 스코프(예외 격리) 를 넘기 때문에 별도
  리팩터 주제로 남긴다.
- `computeSlotStyle.js` 의 `CANVAS_HW_RATIO` 를 인자화해 Type 3 경로까지 동적 zone
  지원하도록 일반화하는 리팩터도 가능하지만, 현재 Type 3 은 고정 zone 으로 충분하
  므로 필요 시점에 별도 작업.

---

## 10. 변경 파일 요약

| 파일 | 성격 | 변경 유형 |
|------|------|-----------|
| `react/src/modules/initPage/components/wireframe/HalfCropGroupLayout.jsx` | Type 4 전용 JSX | **수정** — 동적 hwRatio 도입, 인라인 스타일 계산 함수 추가 |
| `react/src/modules/initPage/components/wireframe/computeSlotStyle.js` | 공유 스타일 util | **유지** — 의도적 미수정 |
| `react/src/modules/editing/utils/ratio.ts` | 공유 ratio 매핑 | **유지** — import 만 추가 |
| `react/src/modules/editing/utils/wireframeLayout.ts` | 참조 main preview 엔진 | **유지** — 정답 경로 |
| `.omc/specs/deep-interview-wireframe-choice-card-type4.md` | Deep Interview 스펙 | **갱신** — 진단 정정, Option 2 확정 반영 |
