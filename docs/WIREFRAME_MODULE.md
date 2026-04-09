# Wireframe Module Report

## Overview

`wireframe/` 모듈은 InitPage의 드래프트 프리뷰에서 **4가지 레이아웃 타입의 제품 배치 로직**을 담당합니다.
모든 레이아웃의 위치/크기 수치는 **`layoutConfig.js`** 한 파일에서 관리됩니다.

**배치 방식:** Canvas-style absolute positioning
- 제품 영역(캔버스): `position: relative` 컨테이너 (`flex-1 w-full relative`)
- 각 슬롯/그룹: `position: absolute` + `{ top, left, width, height }` 퍼센트 좌표
- `html2canvas`로 HTML → Canvas 캡처하므로 absolute % 배치가 가장 안정적

---

## Directory Structure

```
wireframe/
  index.js                  <- barrel export (외부 진입점)
  layoutConfig.js           <- ** 모든 위치/크기 수치 (수정 대상)
  utils.js                  <- 공유 유틸리티 (useDecorOverlays, pairProducts)
  ProductSlot.jsx           <- 제품 슬롯 컴포넌트
  SingleLargeLayout.jsx     <- Type 1: 단일 제품, 대형 슬롯
  SingleCompactLayout.jsx   <- Type 2: 단일 제품, 컴팩트 슬롯
  OverlapGroupLayout.jsx    <- Type 3: 그룹, 지그재그/역삼각형
  HalfCropGroupLayout.jsx   <- Type 4: 그룹, 수평/역삼각형, 반쪽 크롭
```

---

## 수치 설정 파일: `layoutConfig.js`

**이 파일만 수정하면 모든 레이아웃의 위치/크기가 변경됩니다.**

각 레이아웃 파일은 `import { TYPE1 as C } from './layoutConfig'` 형태로 가져와서
`style={{ position: 'absolute', ...C.count1.slot }}` 방식으로 적용합니다.

### 좌표 형식

모든 요소는 캔버스(제품 영역) 대비 퍼센트로 지정됩니다:

```js
{
  top: '10%',      // 캔버스 상단에서 거리
  left: '25%',     // 캔버스 좌측에서 거리
  width: '50%',    // 캔버스 너비 대비 크기
  height: '70%',   // 캔버스 높이 대비 크기
  zIndex: 10,      // (선택) 겹침 순서
  transform: 'scale(1.05)',  // (선택) 변환
}
```

---

### TYPE1 -- SingleLargeLayout (최대 3개)

| 변수 경로 | 현재 값 | 설명 | 적용 위치 |
|-----------|---------|------|-----------|
| `TYPE1.count1.slot` | `top:'5%' left:'25%' w:'50%' h:'80%'` | 1개 제품: 중앙 대형 | SingleLargeLayout.jsx:32 |
| `TYPE1.count2.slot0` | `top:'5%' left:'3%' w:'45%' h:'80%'` | 2개 좌측 제품 | SingleLargeLayout.jsx:38 |
| `TYPE1.count2.slot1` | `top:'5%' left:'52%' w:'45%' h:'80%'` | 2개 우측 제품 | SingleLargeLayout.jsx:41 |
| `TYPE1.count3.slotLeft` | `top:'18%' left:'2%' w:'30%' h:'65%'` | 3개 좌측 제품 | SingleLargeLayout.jsx:48 |
| `TYPE1.count3.slotCenter` | `top:'0%' left:'25%' w:'50%' h:'88%' z:10` | 3개 중앙 (강조) | SingleLargeLayout.jsx:51 |
| `TYPE1.count3.slotRight` | `top:'18%' left:'68%' w:'30%' h:'65%'` | 3개 우측 제품 | SingleLargeLayout.jsx:54 |

---

### TYPE2 -- SingleCompactLayout (최대 3개)

| 변수 경로 | 현재 값 | 설명 | 적용 위치 |
|-----------|---------|------|-----------|
| `TYPE2.count1.slot` | `top:'10%' left:'25%' w:'50%' h:'70%'` | 1개 제품: 중앙 | SingleCompactLayout.jsx:40 |
| `TYPE2.count2.slot0` | `top:'10%' left:'5%' w:'42%' h:'70%'` | 2개 좌측 제품 | SingleCompactLayout.jsx:46 |
| `TYPE2.count2.slot1` | `top:'10%' left:'53%' w:'42%' h:'70%'` | 2개 우측 제품 | SingleCompactLayout.jsx:49 |
| `TYPE2.count3.slotLeft` | `top:'18%' left:'2%' w:'30%' h:'62%'` | 3개 좌측 제품 | SingleCompactLayout.jsx:56 |
| `TYPE2.count3.slotCenter` | `top:'2%' left:'25%' w:'50%' h:'85%' z:10 scale(1.05)` | 3개 중앙 (강조+확대) | SingleCompactLayout.jsx:59 |
| `TYPE2.count3.slotRight` | `top:'18%' left:'68%' w:'30%' h:'62%'` | 3개 우측 제품 | SingleCompactLayout.jsx:62 |

---

### TYPE3 -- OverlapGroupLayout (최대 6개, 지그재그/역삼각형)

| 변수 경로 | 현재 값 | 설명 | 적용 위치 |
|-----------|---------|------|-----------|
| `TYPE3.count1.slot` | `top:'10%' left:'25%' w:'50%' h:'70%'` | 1개: 중앙 | OverlapGroupLayout.jsx:63 |
| `TYPE3.count2.pair` | `top:'15%' left:'18%' w:'65%' h:'60%'` | 2개: GridPair 중앙 | OverlapGroupLayout.jsx:70 |
| `TYPE3.count3.pair` | `top:'2%' left:'2%' w:'55%' h:'42%'` | 3개: 좌상 GridPair | OverlapGroupLayout.jsx:78 |
| `TYPE3.count3.single` | `top:'52%' left:'58%' w:'38%' h:'42%'` | 3개: 우하 단독 | OverlapGroupLayout.jsx:81 |
| `TYPE3.count4.pairTop` | `top:'2%' left:'2%' w:'55%' h:'42%'` | 4개: 좌상 GridPair | OverlapGroupLayout.jsx:90 |
| `TYPE3.count4.pairBottom` | `top:'52%' left:'43%' w:'55%' h:'42%'` | 4개: 우하 GridPair | OverlapGroupLayout.jsx:93 |
| `TYPE3.count5.pairTopLeft` | `top:'2%' left:'2%' w:'46%' h:'38%'` | 5개: 좌상 GridPair | OverlapGroupLayout.jsx:102 |
| `TYPE3.count5.pairTopRight` | `top:'2%' left:'52%' w:'46%' h:'38%'` | 5개: 우상 GridPair | OverlapGroupLayout.jsx:105 |
| `TYPE3.count5.single` | `top:'48%' left:'32%' w:'36%' h:'42%'` | 5개: 하중앙 단독 | OverlapGroupLayout.jsx:108 |
| `TYPE3.count6.pairTopLeft` | `top:'2%' left:'2%' w:'46%' h:'38%'` | 6개: 좌상 GridPair | OverlapGroupLayout.jsx:117 |
| `TYPE3.count6.pairTopRight` | `top:'2%' left:'52%' w:'46%' h:'38%'` | 6개: 우상 GridPair | OverlapGroupLayout.jsx:120 |
| `TYPE3.count6.pairBottom` | `top:'48%' left:'27%' w:'46%' h:'42%'` | 6개: 하중앙 GridPair | OverlapGroupLayout.jsx:123 |

---

### TYPE4 -- HalfCropGroupLayout (최대 6개, 수평/역삼각형)

| 변수 경로 | 현재 값 | 설명 | 적용 위치 |
|-----------|---------|------|-----------|
| `TYPE4.count1.slot` | `top:'10%' left:'25%' w:'50%' h:'70%'` | 1개: 중앙 | HalfCropGroupLayout.jsx:76 |
| `TYPE4.count2.pair` | `top:'15%' left:'18%' w:'65%' h:'60%'` | 2개: CropPair 중앙 | HalfCropGroupLayout.jsx:83 |
| `TYPE4.count3.pair` | `top:'15%' left:'2%' w:'55%' h:'65%'` | 3개: 좌측 CropPair | HalfCropGroupLayout.jsx:91 |
| `TYPE4.count3.single` | `top:'15%' left:'60%' w:'38%' h:'65%'` | 3개: 우측 단독 | HalfCropGroupLayout.jsx:94 |
| `TYPE4.count4.pairLeft` | `top:'15%' left:'2%' w:'46%' h:'65%'` | 4개: 좌측 CropPair | HalfCropGroupLayout.jsx:103 |
| `TYPE4.count4.pairRight` | `top:'15%' left:'52%' w:'46%' h:'65%'` | 4개: 우측 CropPair | HalfCropGroupLayout.jsx:106 |
| `TYPE4.count5.pairTopLeft` | `top:'2%' left:'2%' w:'46%' h:'38%'` | 5개: 좌상 CropPair | HalfCropGroupLayout.jsx:115 |
| `TYPE4.count5.pairTopRight` | `top:'2%' left:'52%' w:'46%' h:'38%'` | 5개: 우상 CropPair | HalfCropGroupLayout.jsx:118 |
| `TYPE4.count5.single` | `top:'48%' left:'32%' w:'36%' h:'42%'` | 5개: 하중앙 단독 | HalfCropGroupLayout.jsx:121 |
| `TYPE4.count6.pairTopLeft` | `top:'2%' left:'2%' w:'46%' h:'38%'` | 6개: 좌상 CropPair | HalfCropGroupLayout.jsx:130 |
| `TYPE4.count6.pairTopRight` | `top:'2%' left:'52%' w:'46%' h:'38%'` | 6개: 우상 CropPair | HalfCropGroupLayout.jsx:133 |
| `TYPE4.count6.pairBottom` | `top:'48%' left:'27%' w:'46%' h:'42%'` | 6개: 하중앙 CropPair | HalfCropGroupLayout.jsx:136 |

---

## 수정 방법

**`layoutConfig.js` 파일만 열어서 `{ top, left, width, height }` 값을 변경하면 됩니다.**

### Example 1: Type 1에서 1개 제품 슬롯을 더 크게 + 위로 이동
```js
// layoutConfig.js
export const TYPE1 = {
  count1: {
    slot: { top: '2%', left: '20%', width: '60%', height: '90%' },
    //            ^ 위로     ^ 왼쪽으로     ^ 더 넓게    ^ 더 높게
  },
  // ...
};
```

### Example 2: Type 3에서 4개 제품 대각선 간격 조정
```js
export const TYPE3 = {
  // ...
  count4: {
    pairTop:    { top: '0%',  left: '0%',  width: '58%', height: '45%' },
    pairBottom: { top: '50%', left: '42%', width: '58%', height: '45%' },
    //            ^ top/left로 위치, width/height로 크기 조절
  },
  // ...
};
```

### Example 3: Type 2에서 3개 중앙 확대 효과 강화
```js
export const TYPE2 = {
  // ...
  count3: {
    slotLeft:   { top: '18%', left: '2%',  width: '30%', height: '62%' },
    slotCenter: { top: '0%',  left: '22%', width: '56%', height: '90%', zIndex: 10, transform: 'scale(1.1)' },
    //                                      ^ 더 넓게     ^ 더 높게                    ^ 더 확대
    slotRight:  { top: '18%', left: '68%', width: '30%', height: '62%' },
  },
};
```

---

## 배치 패턴 요약

### Type 1 & 2 (SingleLarge / SingleCompact)
```
1개: [   슬롯   ]        중앙 단독
2개: [ 슬롯 ] [ 슬롯 ]   나란히
3개: [좌] [중앙] [우]     중앙 강조 staggered (겹침, zIndex)
```

### Type 3 (OverlapGroup) -- GridPair 사용
```
1개: [   슬롯   ]        중앙
2개: [  그룹  ]           중앙
3개: [그룹]               대각선
         [단독]
4개: [그룹]               대각선
         [그룹]
5개: [그룹] [그룹]        역삼각형
       [단독]
6개: [그룹] [그룹]        역삼각형
       [그룹]
```

### Type 4 (HalfCropGroup) -- CropPair 사용
```
1개: [   슬롯   ]        중앙
2개: [ 크롭쌍 ]           중앙
3개: [크롭쌍] [단독]      같은 행
4개: [크롭쌍] [크롭쌍]    같은 행
5개: [크롭쌍] [크롭쌍]    역삼각형
       [단독]
6개: [크롭쌍] [크롭쌍]    역삼각형
       [크롭쌍]
```

---

## 캔버스 구조

각 레이아웃의 JSX 구조:

```jsx
<div className="w-full h-full flex flex-col {containerPadding}">
  {/* 헤더: 로고 */}
  <div className="w-full z-30 mb-2">
    <StoreTitle ... />
  </div>

  {/* 제품 영역 (캔버스) — relative 컨테이너 */}
  <div className="flex-1 w-full relative z-10">
    {/* 각 슬롯은 absolute + % 좌표 */}
    <div style={{ position: 'absolute', ...C.countN.slotName }}>
      <ProductSlot ... className="w-full h-full" />
    </div>
  </div>

  {/* 하단 슬로건 */}
  <div className="w-full text-center z-30 py-2">
    <SloganText ... />
  </div>
</div>
```

---

## Dependency Graph

```
App.jsx
  -> DraftCard.jsx
        |-- wireframe/                    <- 레이아웃 모듈
        |     |-- layoutConfig.js         ** 수치 설정 (TYPE1~4)
        |     |-- SingleLargeLayout.jsx   <- TYPE1 참조
        |     |-- SingleCompactLayout.jsx <- TYPE2 참조
        |     |-- OverlapGroupLayout.jsx  <- TYPE3 참조 + GridPair
        |     +-- HalfCropGroupLayout.jsx <- TYPE4 참조 + CropPair
        |           |-- ProductSlot.jsx
        |           +-- utils.js
        |
        |-- draft/DraftShared   <- 공유 UI (StoreTitle, SloganText, ExtraInfoStrip)
        |-- constants/design    <- 디자인 상수 (CONCEPT_STYLES, ASPECT_CLASSES)
        |-- utils/ratioStyles   <- 비율별 스타일 계산
        +-- utils/bgStyles      <- 배경 스타일 계산
```

---

## Notes

- 모든 요소는 `position: absolute` + `{ top, left, width, height }` 퍼센트로 배치
- 퍼센트는 캔버스(제품 영역) 대비 — 헤더/슬로건 영역 제외
- 선택적 속성: `zIndex` (겹침 순서), `transform` (scale 등)
- 레이아웃 파일에는 하드코딩된 위치/크기 수치가 없음 — 전부 `layoutConfig.js` 참조
- `style={{ }}` 인라인 스타일로 적용 — Tailwind JIT 스캔 이슈 없음
- `html2canvas` 캡처 호환: absolute % 배치가 캡처 시 정확히 재현됨
- `GridPair` (Type 3)와 `CropPair` (Type 4)는 각 레이아웃 파일의 로컬 컴포넌트
- `ProductSlot`은 `className="w-full h-full"`로 부모(absolute div)를 꽉 채움
