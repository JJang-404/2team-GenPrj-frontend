# Wireframe 수식 기반 레이아웃 생성 가능성 검토 보고서

## 1. 검토 개요

**목적:** 「이미지 레이아웃 시스템 설계 가이드 (Content-Driven & Center-Anchored)」의 수식 체계가 28개 전체 wireframe 변형을 생성할 수 있는지 검증

**검토 기준:**
- 설계 가이드의 3가지 원칙: (1) 콘텐츠 주도형 슬롯, (2) 중앙선 고정 정렬, (3) 여백 없는 조립
- 구현 방식: React HTML (개별 DOM 요소) + CSS 동적 스타일 + html2canvas 캡처
- 제약: editing page에서 이미지 개별 이동 가능해야 함

**결론: 전체 28개 wireframe 생성 가능 (조건부)**

---

## 2. 수식 체계 적용 가능성 요약

| Type | 제품 수 | 적용 수식 | 생성 가능 | 비고 |
|------|--------|---------|---------|------|
| 1 | 1개 | 2.1 Standard | O | 단일 슬롯, Cx 중심 배치 |
| 1 | 2개 | 2.1 Standard | O | 각각 독립 Cx, 나란히 |
| 1 | 3개 | 2.1 Standard | O | 3개 독립 Cx, 중앙 zIndex |
| 2 | 1개 | 2.1 Standard | O | Type 1과 동일 구조, 다른 Cx/Cy |
| 2 | 2개 | 2.1 Standard | O | Type 1-2와 동일 |
| 2 | 3개 | 2.1 Standard | O | 중앙 transform: scale 추가 |
| 3 | 1개 | 2.1 Standard | O | 단일 슬롯 |
| 3 | 2개 | 3.2 Overlapping | **△** | 현재 GridPair(grid)→겹침 배치로 변경 필요 |
| 3 | 3개 | 3.2 + 2.1 | **△** | 그룹=겹침 배치, 단독=Standard |
| 3 | 4개 | 3.2 Overlapping | **△** | 2그룹 각각 겹침 배치 |
| 3 | 5개 | 3.2 + 2.1 | **△** | 2그룹 겹침 + 1 단독 |
| 3 | 6개 | 3.2 Overlapping | **△** | 3그룹 각각 겹침 배치 |
| 4 | 1개 | 2.1 Standard | O | 단일 슬롯 |
| 4 | 2개 | 3.1 Half-Crop | O | 수식 직접 적용 가능 |
| 4 | 3개 | 3.1 + 2.1 | O | CropPair + 단독 |
| 4 | 4개 | 3.1 Half-Crop | O | 2 CropPair |
| 4 | 5개 | 3.1 + 2.1 | O | 2 CropPair + 단독 |
| 4 | 6개 | 3.1 Half-Crop | O | 3 CropPair |

**O** = 수식 직접 적용 가능 | **△** = 구조 변경 필요 (GridPair → Overlapping Pair)

---

## 3. 타입별 상세 분석

### 3.1 Type 1 & 2 (SingleLarge / SingleCompact) — Standard Scaling

**적용 수식:** Section 2.1 (S_target = sw)

```
AR = max(sw / iw, sh / ih)
W_scaled = iw × AR
H_scaled = ih × AR
```

**배치 방식:** 각 슬롯이 독립적인 Cx, Cy를 가지고 중앙 정렬

```
dx = Cx - W_scaled/2    (슬롯 중심에서 좌측으로 반만큼)
dy = Cy - H_scaled/2    (슬롯 중심에서 위쪽으로 반만큼)
```

**CSS 매핑:**
```css
.slot {
  position: absolute;
  left: calc(Cx% - W_scaled/2 %);
  top:  calc(Cy% - H_scaled/2 %);
  width: W_scaled%;
  height: H_scaled%;
  overflow: hidden;
}
.slot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

**필요 메타데이터 (Wireframe별):**

| Wireframe | 요소 | Cx (%) | Cy (%) | sw (%) | sh (%) |
|-----------|------|--------|--------|--------|--------|
| 기본-1 (1개) | slot | 50 | 45 | 40 | 65 |
| 1-2 (2개) | slot0 | 27 | 45 | 42 | 65 |
| | slot1 | 73 | 45 | 42 | 65 |
| 1-3 (3개) | slotLeft | 20 | 48 | 28 | 55 |
| | slotCenter | 50 | 42 | 36 | 72 |
| | slotRight | 80 | 48 | 28 | 55 |

> Type 2는 동일 구조에 Cy 오프셋과 slotCenter의 transform: scale(1.05) 추가

**판정: O (완전 적용 가능)**
- 모든 슬롯이 독립적인 Cx 기반 배치
- AR 계산으로 이미지 비율 보존 + Cover 모드
- CSS object-fit: cover로 No-Gap 보장
- zIndex로 3개 제품 중앙 강조 구현

---

### 3.2 Type 4 (HalfCropGroup) — Half-Crop Assembly

**적용 수식:** Section 3.1

```
S_target = sw × 2    (두 조각 합산 기준)
AR = max(S_target / iw, sh / ih)
W_scaled = iw × AR
w_final = W_scaled / 2

좌측: dx = Cx - w_final,  dw = w_final
우측: dx = Cx,            dw = w_final
```

**CSS 매핑:**
```css
/* 좌측 조각 (이미지 오른쪽 절반 보이기) */
.crop-left {
  position: absolute;
  left: calc(Cx% - w_final%);
  width: w_final%;
  height: sh%;
  overflow: hidden;
}
.crop-left img {
  width: 200%;        /* 전체 이미지의 2배 → 절반만 보임 */
  height: 100%;
  object-fit: cover;
  object-position: right center;  /* 오른쪽 정렬 → 왼쪽 절반 표시 */
}

/* 우측 조각 (이미지 왼쪽 절반 보이기) */
.crop-right {
  position: absolute;
  left: Cx%;
  width: w_final%;
  overflow: hidden;
}
.crop-right img {
  width: 200%;
  height: 100%;
  object-fit: cover;
  object-position: left center;
}
```

**필요 메타데이터:**

| Wireframe | 그룹 | Cx (%) | Cy (%) | sw (%) | sh (%) |
|-----------|------|--------|--------|--------|--------|
| 4-2 (2개) | pair | 50 | 45 | 28 | 55 |
| 4-3 (3개) | pairLeft | 28 | 45 | 24 | 55 |
| | single | 75 | 45 | 28 | 55 |
| 4-4 (4개) | pairLeft | 28 | 45 | 22 | 55 |
| | pairRight | 72 | 45 | 22 | 55 |
| 4-5 (5개) | pairTopL | 25 | 28 | 22 | 32 |
| | pairTopR | 75 | 28 | 22 | 32 |
| | single | 50 | 68 | 26 | 35 |
| 4-6 (6개) | pairTopL | 25 | 25 | 20 | 28 |
| | pairTopR | 75 | 25 | 20 | 28 |
| | pairBot | 50 | 65 | 22 | 35 |

**판정: O (완전 적용 가능)**
- 설계 가이드가 Type 4를 가장 상세히 기술
- CSS overflow:hidden + object-position으로 source crop 재현 가능
- 각 CropPair의 두 이미지가 개별 DOM 요소 → editing page 이동 가능

**주의점:**
- 현재 CropPair 컴포넌트는 grid-cols-2로 내부 배치 → 개별 absolute 요소로 변경 필요
- 각 반쪽 이미지가 독립적인 `<div>` + `<img>`여야 이동 가능

---

### 3.3 Type 3 (OverlapGroup) — Overlapping Assembly

**적용 수식:** Section 3.2

```
AR = max(sw / iw, sh / ih)     (각 이미지별)
W_scaled_1 = iw1 × AR1
W_scaled_2 = iw2 × AR2

Ow = (W_scaled_1 + W_scaled_2) × 0.1    (10% 겹침)

좌측: dx = Cx + Ow/2 - W_scaled_1
우측: dx = Cx - Ow/2
```

**현재 구현과의 차이 (핵심 이슈):**

| 항목 | 현재 (GridPair) | 설계 가이드 (Overlapping) |
|------|----------------|------------------------|
| 배치 | grid-cols-2 (나란히) | 10% 겹침, 중앙선 기준 |
| 이미지 표시 | h-full w-auto (원본비율) | Cover 모드 (슬롯 채움) |
| 구조 | 하나의 카드 안 2열 | 개별 슬롯 2개가 겹침 |
| 이동성 | 카드 단위 이동만 가능 | 각 이미지 독립 이동 가능 |

**CSS 매핑:**
```css
.overlap-left {
  position: absolute;
  left: calc(Cx% + Ow/2% - W1%);
  width: W1%;
  height: sh%;
  overflow: hidden;
  z-index: 1;
}
.overlap-right {
  position: absolute;
  left: calc(Cx% - Ow/2%);
  width: W2%;
  height: sh%;
  overflow: hidden;
  z-index: 2;    /* 항상 우측이 앞 */
}
```

**필요 메타데이터:**

| Wireframe | 그룹 | Cx (%) | Cy (%) | sw (%) | sh (%) | overlapRatio |
|-----------|------|--------|--------|--------|--------|-------------|
| 3-2 (2개) | pair | 50 | 45 | 28 | 55 | 0.1 |
| 3-3 (3개) | pair | 28 | 30 | 24 | 35 | 0.1 |
| | single | 72 | 65 | 28 | 35 | - |
| 3-4 (4개) | pairTop | 28 | 28 | 24 | 35 | 0.1 |
| | pairBot | 72 | 65 | 24 | 35 | 0.1 |
| 3-5 (5개) | pairTopL | 25 | 28 | 22 | 32 | 0.1 |
| | pairTopR | 75 | 28 | 22 | 32 | 0.1 |
| | single | 50 | 68 | 26 | 35 | - |
| 3-6 (6개) | pairTopL | 25 | 25 | 20 | 28 | 0.1 |
| | pairTopR | 75 | 25 | 20 | 28 | 0.1 |
| | pairBot | 50 | 65 | 22 | 35 | 0.1 |

**판정: △ (구조 변경 필요)**
- 수식 자체는 적용 가능
- **GridPair 컴포넌트를 폐기하고 OverlapPair로 교체 필요**
- 현재 grid 기반 → 개별 absolute 배치 + z-index 겹침으로 전환
- CSS object-fit:cover + overflow:hidden으로 No-Gap 구현 가능

---

## 4. 구현 시 필요한 변경 사항

### 4.1 신규 필요 모듈

| 모듈 | 역할 |
|------|------|
| `useImageAR(src)` | 이미지 로드 후 naturalWidth/Height → AR 반환하는 React Hook |
| `computeSlot(type, iw, ih, metadata)` | 설계 가이드 수식 엔진. AR, W_scaled, dx, dy 계산 |
| `layoutMetadata.js` | 모든 wireframe의 Cx, Cy, sw, sh, overlapRatio 정의 |

### 4.2 기존 모듈 변경

| 파일 | 변경 내용 |
|------|---------|
| `layoutConfig.js` | 고정 좌표 → `layoutMetadata.js`의 Cx/Cy/sw/sh 기반 동적 계산으로 대체 |
| `ProductSlot.jsx` | `object-fit: cover` 적용, AR 기반 동적 크기 수용 |
| `HalfCropGroupLayout.jsx` | CropPair 내부를 grid → 개별 absolute 배치로 변경 |
| `OverlapGroupLayout.jsx` | GridPair → OverlapPair (겹침 배치)로 전면 교체 |
| `SingleLargeLayout.jsx` | 고정 좌표 → Cx 중심 동적 배치 |
| `SingleCompactLayout.jsx` | 동일 |

### 4.3 데이터 흐름 변경

```
현재:
  layoutConfig.js (고정 %) → Layout JSX → style={{ ...C.countN.slot }}

변경 후:
  layoutMetadata.js (Cx, Cy, sw, sh)
    ↓
  useImageAR(product.image) → AR
    ↓
  computeSlot(type, AR, metadata) → { left, top, width, height }
    ↓
  Layout JSX → style={{ position:'absolute', ...computed }}
```

---

## 5. 주요 리스크 및 고려사항

### 5.1 이미지 로딩 타이밍
- **문제:** AR 계산에 이미지 naturalWidth/Height가 필요 → 이미지 로드 완료 후에야 레이아웃 확정
- **영향:** 초기 렌더링 시 레이아웃 깜빡임(Layout Shift) 가능
- **대안:** (A) skeleton placeholder → 로드 후 전환, (B) 서버에서 이미지 크기 사전 제공, (C) 기본 AR (예: 3:4) fallback 후 로드 시 갱신

### 5.2 Type 3 겹침 배치의 wireframe 불일치
- **문제:** wireframe 이미지(3-2-1.png 등)는 grid 형태(나란히)로 보이나, 설계 가이드는 "겹침"을 명시
- **결정 필요:** wireframe을 따를지, 설계 가이드를 따를지?
- 만약 wireframe을 우선한다면, Type 3도 Standard 배치로 처리 가능 (수식 단순화)

### 5.3 라벨(이름+가격) 배치
- **문제:** 설계 가이드는 이미지 배치 수식만 다루며, 라벨 위치는 정의하지 않음
- **현재:** 이미지 아래에 고정 배치 (ProductSlot 내부, CropPair/GridPair 하단 영역)
- **영향:** 이미지 크기가 AR에 따라 동적으로 변하면 라벨 공간도 유동적으로 조정 필요

### 5.4 editing page 호환성
- **요구:** 각 이미지가 개별 DOM 요소로 이동 가능
- **영향:** CropPair, GridPair 등 그룹 컴포넌트를 해체하고 개별 슬롯으로 전환 필요
- **추가 작업:** 드래그 시 Cx 재계산 or 자유 배치 모드 전환 로직

### 5.5 다중 이미지의 AR 차이
- **문제:** Type 3/4에서 같은 그룹의 두 이미지가 서로 다른 AR을 가질 때, 겹침/반반 조립의 중앙선이 비대칭
- **설계 가이드:** 이미지별로 독립 AR 계산 → w_final이 다를 수 있음
- **Type 4:** 한 이미지를 반으로 나누므로 좌/우 w_final 동일 (문제 없음)
- **Type 3:** 두 독립 이미지 → w1 ≠ w2 가능 → 중앙선은 유지되지만 좌우 비대칭

---

## 6. 결론

### 생성 가능성 판정

| 분류 | 결과 |
|------|------|
| **완전 적용 가능 (O)** | Type 1 전체(3), Type 2 전체(3), Type 4 전체(6) = **12개** |
| **구조 변경 후 적용 가능 (△)** | Type 3의 2~6개(5) = **5개** |
| **공통 (1개 제품)** | 기본 이미지 = Type 1~4 공유 = **1개** |
| **슬로건 변형** | 각 wireframe의 -1/-2 변형 = 구조 동일, slogan 유무만 차이 |

### 핵심 결론

1. **수학적으로 전체 28개 wireframe 생성 가능** — 설계 가이드의 수식 체계가 모든 레이아웃 패턴을 커버
2. **Type 3의 GridPair → OverlapPair 전환이 가장 큰 변경** — 현재 grid 구조를 겹침 배치로 교체 필요
3. **HTML/CSS로 수식 구현 가능** — object-fit:cover, overflow:hidden, 동적 %, z-index로 Canvas API의 drawImage 동작 재현 가능
4. **이미지 AR 취득이 선행 조건** — useImageAR 훅 개발 필요, Layout Shift 대응 전략 필요
5. **layoutConfig.js → layoutMetadata.js + computeSlot() 으로 전환** — 고정 좌표에서 동적 계산 체계로 아키텍처 변경
