# Wireframe 좌표 데이터 구조 분석

> 작성일: 2026-04-14  
> 목적: 백엔드 레이아웃 데이터 변경 대비 — 현재 JSON 구조 및 좌표값 수신 방식 기록

---

## 1. 관련 JSON 파일

| 구분 | 경로 |
|------|------|
| **사용 중** | `react/src/modules/initPage/components/wireframe/wireframeSlots.json` |
| 미사용(백업) | `src_NotUse/modules/initPage/components/wireframe/wireframeSlots.json` |

현재 좌표 데이터는 **API 호출 없이 정적 JSON import** 방식으로 로드됩니다.

```js
// computeSlotStyle.js
import wireframeSlots from './wireframeSlots.json';
```

---

## 2. JSON 구조

### 최상위 구조

```json
{
  "canvas": {
    "width": 1000,
    "height": 1250,
    "ratio": "4:5"
  },
  "wireframes": {
    "<key>": { ... }
  }
}
```

- 캔버스 기준 크기: **1000 × 1250 px (4:5 비율)** — 하드코딩
- 모든 좌표값은 **캔버스 대비 백분율(%)**

### 와이어프레임 키 형식

```
{type}-{productCount}-{hasSlogan}
```

| 파트 | 설명 |
|------|------|
| `type` | 레이아웃 타입 (1~4, n) |
| `productCount` | 상품 개수 (1~3 등) |
| `hasSlogan` | 슬로건 포함 여부 (`1` = 있음, `2` = 없음) |

예시 키: `"1-2-1"` → 타입1, 상품2개, 슬로건 있음

### slots 배열 내 좌표 필드

```json
{
  "slots": [
    {
      "Cx": 27.0,
      "Cy": 28.0,
      "sw": 40.0,
      "sh": 48.0
    },
    {
      "Cx": 73.0,
      "Cy": 28.0,
      "sw": 40.0,
      "sh": 48.0
    }
  ]
}
```

| 필드 | 의미 | 단위 |
|------|------|------|
| **`Cx`** | 슬롯 **중심** X 좌표 | 캔버스 너비 % |
| **`Cy`** | 슬롯 **중심** Y 좌표 | 캔버스 높이 % |
| **`sw`** | 슬롯 너비 | 캔버스 너비 % |
| **`sh`** | 슬롯 높이 | 캔버스 높이 % |

> ⚠️ JSON의 키 이름은 **`Cx`, `Cy`** (대문자 C) 입니다. `x`, `y`, `cx`, `cy` (소문자)가 아닙니다.

---

## 3. 데이터 흐름 (JSON → 컴포넌트)

```
wireframeSlots.json
       ↓  정적 import
computeSlotStyle.js / getWireframeSlots()
       ↓  키 조회
Layout 컴포넌트 (SingleLargeLayout, SingleCompactLayout 등)
       ↓  slotToRect() 변환
CSS 인라인 스타일 (position: absolute, left/top/width/height)
```

### 3-1. 키 조회

```js
// 키 형식: "{type}-{productCount}-{hasSlogan ? '1' : '2'}"
const key = `${type}-${productCount}-${hasSlogan ? '1' : '2'}`;
const wireframe = wireframeSlots.wireframes[key] || null;
```

### 3-2. 좌표 변환 (중심 → 좌상단)

`Cx/Cy` (center) → `x/y` (left/top) 변환:

```js
const slotToRect = (slot) => ({
  x: slot.Cx - slot.sw / 2,   // 좌상단 X = 중심X - 너비/2
  y: slot.Cy - slot.sh / 2,   // 좌상단 Y = 중심Y - 높이/2
  width: slot.sw,
  height: slot.sh,
});
```

### 3-3. CSS 적용

```jsx
style={{
  position: 'absolute',
  left:   `${slot.Cx - wScaled / 2}%`,
  top:    `${slot.Cy - hScaled / 2}%`,
  width:  `${wScaled}%`,
  height: `${hScaled}%`,
}}
```

- `wScaled`, `hScaled`는 이미지 aspect ratio(`useImageAR`)를 반영하여 동적으로 보정된 값

---

## 4. 레이아웃 타입별 컴포넌트

| 타입 | 컴포넌트 파일 | 설명 |
|------|--------------|------|
| Type 1 | `SingleLargeLayout.jsx` | 클래식 Large |
| Type 2 | `SingleCompactLayout.jsx` | Compact |
| Type 3 | `OverlapGroupLayout.jsx` | Overlap (20% 겹침) |
| Type 4 | `HalfCropGroupLayout.jsx` | Half-Crop |

---

## 5. 에디팅 모듈에서의 활용

`react/src/modules/editing/utils/wireframeLayout.ts`

- `getWireframeSlots()`를 통해 동일 JSON 데이터 사용
- `Cx/Cy/sw/sh` → `x/y/width/height` 변환 후 에디터 요소 배치에 활용
- API 없이 순수 정적 계산

---

## 6. 백엔드 연동 시 변경 포인트

현재는 **정적 JSON**이지만, 백엔드에서 레이아웃 데이터를 제공할 경우:

| 항목 | 현재 | 변경 필요 시 |
|------|------|------------|
| 데이터 소스 | `wireframeSlots.json` (정적) | API 응답 (동적) |
| 좌표 키 이름 | `Cx`, `Cy`, `sw`, `sh` | 백엔드 스펙에 맞춰 매핑 필요 |
| 로딩 위치 | `computeSlotStyle.js` import | fetch/axios 호출로 교체 또는 래핑 |
| 영향 범위 | 모든 Layout 컴포넌트 + `wireframeLayout.ts` | 동일 |

---

## 7. 요약

- JSON 좌표 키: **`Cx`, `Cy`** (중심 좌표, 캔버스 %)
- 슬롯 크기 키: **`sw`** (너비), **`sh`** (높이)
- 변환 공식: `left = Cx - sw/2`, `top = Cy - sh/2`
- 현재 API 호출 없음 — 전부 정적 번들
