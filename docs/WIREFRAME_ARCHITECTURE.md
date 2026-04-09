# Wireframe 모듈 아키텍처 보고서

본 문서는 `wireframe/` 디렉터리의 모듈 구조와 각 파일의 역할, 그리고 와이어프레임을 불러와서 적용하는 흐름을 정리한 보고서입니다.

---

## 1. 개요

Type 1~4의 포스터 레이아웃은 **수식 기반 동적 배치**로 구성됩니다.
- **데이터 소스**: [wireframeSlots.json](../react/src/modules/initPage/components/wireframe/wireframeSlots.json) — 캔버스 대비 % 좌표 (`Cx`, `Cy`, `sw`, `sh`)
- **수식 엔진**: [computeSlotStyle.js](../react/src/modules/initPage/components/wireframe/computeSlotStyle.js) — 이미지 AR 기반 슬롯 스타일 계산
- **이미지 로더**: [useImageAR.js](../react/src/modules/initPage/components/wireframe/useImageAR.js) — React hook
- **레이아웃 컴포넌트**: 타입별 4개 (`SingleLargeLayout`, `SingleCompactLayout`, `OverlapGroupLayout`, `HalfCropGroupLayout`)

공통 원칙:
1. **높이 고정 (sh 유지)**: 슬롯 높이는 고정, 너비만 이미지 AR에 따라 동적 조정
2. **중앙 앵커**: 모든 슬롯은 `(Cx, Cy)` 중심점 기준으로 배치
3. **이미지 필터링**: 이미지 없는 제품은 count에서 제외
4. **캔버스 비율 보정**: 4:5 캔버스(1000×1250)에서 너비%와 높이%의 물리 단위 차이 보정

---

## 2. 모듈 구조도

```
wireframe/
├── wireframeSlots.json        데이터: 타입별 슬롯 좌표 메타
├── computeSlotStyle.js        수식 엔진: AR 계산 + 좌표 변환
├── useImageAR.js              hook: 이미지 naturalWidth/Height 로드
├── ProductSlot.jsx            (레거시) 정적 제품 슬롯 컴포넌트
├── utils.js                   유틸: useDecorOverlays, pairProducts
├── layoutConfig.js            (레거시) 정적 좌표 상수
│
├── SingleLargeLayout.jsx      Type 1: 클래식 (개별 배치, 1~3개)
├── SingleCompactLayout.jsx    Type 2: 다이나믹 (개별 배치, 1~3개)
├── OverlapGroupLayout.jsx     Type 3: 겹침 배치 (페어 + 10% 오버랩)
├── HalfCropGroupLayout.jsx    Type 4: 반반 크롭 (페어 중앙선 정렬)
│
├── index.js                   공용 export
└── WIREFRAME_MODULE.md        (기존) 레거시 가이드
```

---

## 3. 데이터 레이어

### 3.1 [wireframeSlots.json](../react/src/modules/initPage/components/wireframe/wireframeSlots.json)

**구조:**
```json
{
  "canvas": { "width": 1000, "height": 1250, "ratio": "4:5" },
  "wireframes": {
    "{type}-{count}-{slogan}": {
      "type": "1|2|3|4",
      "productCount": number,
      "hasSlogan": boolean,
      "slots": [
        { "Cx": number, "Cy": number, "sw": number, "sh": number }
      ]
    }
  }
}
```

**키 규칙:**
- `{type}-{count}-1`: 슬로건 있음
- `{type}-{count}-2`: 슬로건 없음
- `n-1-1` / `n-1-2`: 모든 타입에서 `count=1`일 때 공유

**좌표 의미 (모두 캔버스 대비 %):**
- `Cx`, `Cy`: 슬롯 중심점 (% of canvas width/height)
- `sw`: 슬롯 가이드 너비 (% of canvas width)
- `sh`: 슬롯 가이드 높이 (% of canvas height)

### 3.2 현재 등록된 키

| Type | count=1 | count=2 | count=3 | count=4 | count=5 | count=6 |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | `n-1-*` | `1-2-*` | `1-3-*` | – | – | – |
| 2 | `n-1-*` | `2-2-*` | `2-3-*` | – | – | – |
| 3 | `n-1-*` | `3-2-*` | `3-3-*` | `3-4-*` | `3-5-*` | `3-6-*` |
| 4 | `n-1-*` | `4-2-*` | `4-3-*` | `4-4-*` | `4-5-*` | `4-6-*` |

---

## 4. 수식 엔진: [computeSlotStyle.js](../react/src/modules/initPage/components/wireframe/computeSlotStyle.js)

### 4.1 핵심 상수

```js
const CANVAS_HW_RATIO = canvas.height / canvas.width; // 1.25 (4:5)
```

**왜 필요한가?**
`sw`는 너비%, `sh`는 높이%이며 같은 `1%`라도 물리 픽셀 길이가 다름.
- `1% 너비 = 10px` (canvas.width=1000)
- `1% 높이 = 12.5px` (canvas.height=1250)

따라서 높이% 단위로 계산한 값을 CSS `width` 속성(너비%)에 쓸 때는 `× CANVAS_HW_RATIO` 변환이 필요.

### 4.2 공통 스케일링 로직 (모든 타입)

```js
AR = sh / ih                         // 높이 기준 배율
wScaled = iw × AR × CANVAS_HW_RATIO  // 너비% (동적)
hScaled = sh                          // 높이% (고정)
```

**의미:**
- 이미지 높이를 슬롯 높이에 정확히 맞춤
- 이미지 너비는 원본 AR을 보존하며 동적 조정
- 같은 종류의 이미지라면 높이가 항상 같아 시각적 정렬 유지

### 4.3 export 함수

| 함수 | 용도 | 사용처 |
|---|---|---|
| `computeSlotStyle(slotMeta, imageNaturals, side)` | Type 4 half-crop 전용 | `HalfCropGroupLayout` |
| `getFallbackStyle(slotMeta, side)` | Type 4 이미지 로드 전 폴백 | `HalfCropGroupLayout` |
| `computeType3Style(slotMeta, imageNaturals)` | 범용 높이 고정 수식 | Type 1/2/3 |
| `getWireframeKey(type, count, hasSlogan)` | 키 문자열 생성 | 내부 |
| `getWireframeSlots(type, count, hasSlogan)` | JSON에서 슬롯 조회 | 모든 레이아웃 |

### 4.4 Type 4 특수 수식 (`computeSlotStyle`)

Type 4는 **반반 크롭(Half-Crop)**을 사용하므로 별도 함수가 있습니다.

```js
W_scaled = iw × (sh/ih) × CANVAS_HW_RATIO  // 스케일링된 이미지 전체 너비
w_final = W_scaled / 2                       // 각 반쪽의 너비
// side='left':  left = Cx - w_final, objectPosition = 'left center'
// side='right': left = Cx,           objectPosition = 'right center'
// side='single': Type 3와 동일한 중앙 배치
```

반환 값: `{ containerStyle, imgStyle }`
- `containerStyle`: outer `<div>`에 적용되는 CSS 객체
- `imgStyle`: `<img>`에 적용되는 `object-fit: cover` + `object-position`

---

## 5. 이미지 로더: [useImageAR.js](../react/src/modules/initPage/components/wireframe/useImageAR.js)

**역할:** 이미지 URL로부터 `naturalWidth`/`naturalHeight`를 비동기로 가져오는 React hook.

```js
const dims = useImageAR(src);
// dims === null        이미지 로드 전 / 로드 실패 / src 없음
// dims === { naturalWidth, naturalHeight }  로드 완료
```

**주요 로직:**
- `new Image()` + `onload`/`onerror`
- `cancelled` 플래그로 언마운트 시 stale setState 방지
- `src` 변경 시 이전 리스너 정리

각 슬롯 컴포넌트는 자신이 렌더링할 이미지마다 독립적으로 이 hook을 호출합니다.

---

## 6. 레이아웃 컴포넌트 (4종)

모든 레이아웃 컴포넌트는 동일한 prop 인터페이스를 사용합니다:

```js
({ products, options, inputData, ratioStyles }) => JSX
```

### 6.1 공통 흐름

```
1. products.filter(p => p.image).slice(0, MAX_COUNT)  ← 이미지 있는 제품만
2. hasSlogan = Boolean(inputData.mainSlogan)
3. wireframe = getWireframeSlots(type, count, hasSlogan)
4. slots = wireframe.slots
5. 각 슬롯 → useImageAR → computeStyle → absolute 배치
6. 헤더(StoreTitle) / 슬로건(SloganText) 오버레이 (z-30)
```

### 6.2 공통 DOM 구조

```jsx
<div className="w-full h-full relative">
  {/* 제품 캔버스: wireframe 좌표 직접 매핑 */}
  <div className="absolute inset-0">
    {slots.map(...)}
  </div>

  {/* 헤더 (z-30 오버레이) */}
  <div className={`relative z-30 ${containerPadding}`}>
    <StoreTitle ... />
  </div>

  {/* 슬로건 (z-30 오버레이) */}
  <div className={`absolute bottom-0 w-full z-30 ${containerPadding}`}>
    <SloganText ... />
  </div>
</div>
```

`absolute inset-0` 캔버스를 사용해 `wireframeSlots.json`의 % 좌표가 그대로 매핑되도록 하고, 헤더/슬로건은 `z-30`으로 위에 오버레이합니다.

### 6.3 [SingleLargeLayout.jsx](../react/src/modules/initPage/components/wireframe/SingleLargeLayout.jsx) (Type 1)

**특징:**
- 1~3개 제품, 개별 배치 (겹침/크롭 없음)
- 각 슬롯은 독립적인 `IndividualSlot` (로컬 컴포넌트)
- 수식: `computeType3Style` (높이 고정)

**배치:**
```
[Slot 0] [Slot 1] [Slot 2]
   ↑        ↑        ↑
  Cx/Cy에 중심 배치
```

### 6.4 [SingleCompactLayout.jsx](../react/src/modules/initPage/components/wireframe/SingleCompactLayout.jsx) (Type 2)

**특징:**
- Type 1과 동일한 배치 방식 (`IndividualSlot`)
- **장식 오버레이** 추가 (그라디언트 + 회전 사각형)
- **슬로건이 헤더와 바닥 양쪽에 표시** (레거시 호환)
- isTall 반응형: `text-5xl`/`text-4xl`/`text-2xl`

### 6.5 [OverlapGroupLayout.jsx](../react/src/modules/initPage/components/wireframe/OverlapGroupLayout.jsx) (Type 3)

**특징:**
- 페어/단독 혼합 배치
- 페어: 두 이미지가 `OVERLAP_RATIO = 0.2` (20%) 겹침
- **우측 이미지가 앞(z-index 높음)**

**핵심 수식 (설계 가이드 Section 3.2):**
```js
pairCx = (leftSlot.Cx + rightSlot.Cx) / 2
Ow = (leftW + rightW) × OVERLAP_RATIO
leftLeft  = pairCx + Ow/2 - leftW
rightLeft = pairCx - Ow/2
```

**그룹화 규칙 (`groupSlots`):**
- 짝수 개수: 모두 페어 (i=0,2,4,... 각 페어의 left / i=1,3,5,... right)
- 홀수 개수: 마지막만 single, 앞은 모두 페어

**내부 컴포넌트:**
| 이름 | 역할 |
|---|---|
| `SlotContent` | 슬롯 내부의 이미지/라벨 렌더링 |
| `OverlapSingleSlot` | 단독 슬롯 (한 개의 `useImageAR`) |
| `OverlapPair` | 페어 (두 개의 `useImageAR`, 겹침 계산) |

### 6.6 [HalfCropGroupLayout.jsx](../react/src/modules/initPage/components/wireframe/HalfCropGroupLayout.jsx) (Type 4)

**특징:**
- 페어/단독 혼합 배치
- 페어: 두 이미지를 **반반 크롭**해서 중앙선에서 조립
- 왼쪽 이미지는 원본의 **좌측 절반만**, 오른쪽 이미지는 **우측 절반만** 노출

**핵심 수식 (설계 가이드 Section 3.1):**
```js
pairCx = leftSlot.Cx + leftSlot.sw/2  // 두 반쪽이 만나는 중앙선
// side='left':  left = Cx - w_final
// side='right': left = Cx
// 이미지: object-fit: cover, object-position: left/right center
```

**내부 컴포넌트:**
| 이름 | 역할 |
|---|---|
| `HalfCropSlot` | 개별 반쪽 크롭 또는 single 슬롯 |

**매핑 함수 (`mapSlotsToProducts`):**
- 짝수 인덱스 → `side: 'left'`, pairCx 계산
- 홀수 인덱스 → `side: 'right'`, pairCx 계산
- 홀수 count의 마지막 → `side: 'single'`

---

## 7. 보조 모듈

### 7.1 [utils.js](../react/src/modules/initPage/components/wireframe/utils.js)

- `useDecorOverlays(bgType)`: 배경 장식 표시 여부 hook
- `pairProducts(...)`: 레거시 제품 페어링 유틸

### 7.2 [ProductSlot.jsx](../react/src/modules/initPage/components/wireframe/ProductSlot.jsx) (레거시)

기존 고정 좌표 레이아웃에서 사용하던 범용 슬롯 컴포넌트.
현재는 index.js에서 export되지만 Type 1~4 레이아웃에서는 사용하지 않습니다.

### 7.3 [layoutConfig.js](../react/src/modules/initPage/components/wireframe/layoutConfig.js) (레거시)

`TYPE1`~`TYPE4` 정적 좌표 상수. 수식 기반 전환 이후 더 이상 레이아웃 컴포넌트에서 직접 참조하지 않습니다.

### 7.4 [index.js](../react/src/modules/initPage/components/wireframe/index.js)

모듈 공용 export:
```js
export { SingleLargeLayout, SingleCompactLayout, OverlapGroupLayout, HalfCropGroupLayout }
export { ProductSlot, useDecorOverlays, pairProducts }
export { TYPE1, TYPE2, TYPE3, TYPE4 }
```

---

## 8. 렌더링 흐름 (End-to-End)

```
DraftCard (부모)
  └─ Type별 Layout 컴포넌트 (예: HalfCropGroupLayout)
       ├─ products 필터링 (image 있는 것만)
       ├─ getWireframeSlots(type, count, hasSlogan)
       │     └─ wireframeSlots.json 조회
       │
       ├─ slots.map → 슬롯 컴포넌트
       │     ├─ useImageAR(product.image)
       │     │     └─ naturalWidth/Height 반환
       │     ├─ computeType3Style / computeSlotStyle
       │     │     └─ { wScaled, hScaled } 또는 { containerStyle, imgStyle }
       │     └─ <div style={absolute + %}> <img object-fit:cover /> </div>
       │
       └─ 헤더/슬로건 오버레이 (z-30)
```

---

## 9. 새 타입/variant 추가 시 체크리스트

1. **데이터 추가**
   - `wireframeSlots.json`에 `{type}-{count}-1` / `{type}-{count}-2` 항목 추가
   - `Cx`/`Cy`/`sw`/`sh`를 캔버스 대비 %로 지정
2. **수식 확장 (필요 시)**
   - 기존 `computeType3Style`로 충분하면 추가 작업 불필요
   - 특수 배치(겹침/크롭/변형)가 있다면 `computeSlotStyle.js`에 새 함수 추가
3. **레이아웃 컴포넌트 작성/수정**
   - 기존 타입과 유사하면 동일 패턴으로 컴포넌트 작성
   - `getWireframeSlots(newType, count, hasSlogan)` 호출
4. **index.js export**
5. **빌드 검증**: `npx vite build`

---

## 10. 레거시 파일 정리 가이드

다음 파일들은 수식 기반 전환 후 더 이상 레이아웃 컴포넌트에서 참조되지 않습니다:
- `layoutConfig.js` (TYPE1~TYPE4 정적 좌표)
- `ProductSlot.jsx` (기존 범용 슬롯)
- `WIREFRAME_MODULE.md` (레거시 가이드)

외부 모듈(예: editing page)에서 아직 참조 중일 수 있으므로 삭제 전 의존성 확인 필요.
