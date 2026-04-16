# 계층형 Wireframe 구조 스펙

- 작성일: 2026-04-16
- 최종 갱신: 2026-04-16
- 대상 브랜치: `feature/United1_8`
- 상태: 구현 완료 (빌드 통과)

---

## 1. 개요

기존 wireframe 시스템은 제품 슬롯이 캔버스 전체(1000×1250, 4:5)를 기준으로 배치되었다. 이를 **계층 구조**로 전환하여, `기본 이미지 1.png`(draw.io)의 outer frame 안에 inner wireframe이 중첩되는 구조를 만든다.

### 핵심 원칙

- **wireframe 시스템은 main zone(제품 슬롯)만 관리**
- 로고/소개 문구/footer는 **구조적으로 분리된 독립 요소**
- WireframeChoiceCard 선택 시 **전체(main zone + 독립 요소) 모두 반영**
- zone 위치는 **React state**(HomeProjectData.zonePositions)로 관리 — 상수가 아닌 상태
- 추후 '...' 메뉴로 각 zone의 위치를 독립적으로 조정하는 기능 예정 → state 기반 설계의 이유
- editing 페이지(EditorCanvas)에서는 모든 요소가 자유롭게 드래그/리사이즈/회전 가능 (기존과 동일)

## 2. Outer Frame Zone 좌표

`기본 이미지 1.png` draw.io XML에서 추출한 정확 좌표 (캔버스 1000×1250 기준):

| Zone | x (px) | y (px) | w (px) | h (px) | percent (x, y, w, h) | 매핑 대상 |
|---|---|---|---|---|---|---|
| 로고 | 0 | 0 | 250 | 100 | (0, 0, 25, 8) | storeName (독립 요소) |
| main zone | 0 | 100 | 1000 | 850 | (0, 8, 100, 68) | wireframe 제품 슬롯 |
| 소개 문구 | 0 | 950 | 1000 | 200 | (0, 76, 100, 16) | mainSlogan (독립 요소) |
| footer | 0 | 1150 | 1000 | 100 | (0, 92, 100, 8) | 주소/연락처/아이콘 (독립 요소) |
| '...' | 900 | 20 | 60 | 30 | — | 무시 (추후 메뉴 트리거용 예약) |

## 3. State 기반 Zone 위치 관리

### 3.1 ZonePositions 타입 (`types/home.ts`)

```typescript
interface ZonePosition {
  x: number;      // 캔버스 대비 % (left)
  y: number;      // 캔버스 대비 % (top)
  width: number;  // 캔버스 대비 % (width)
  align?: 'left' | 'center' | 'right';
  rotation?: number;
  zIndex?: number;
}

interface ZonePositions {
  store: ZonePosition;    // 로고
  slogan: ZonePosition;   // 소개 문구
  details: ZonePosition;  // 하단 설명
  summary: ZonePosition;  // 가격/요약
}
```

`HomeProjectData.zonePositions?: ZonePositions` 필드로 관리.

### 3.2 초기값 생성 (`editorFlow.ts`)

```typescript
function getDefaultZonePositions(draftIndex: number): ZonePositions
```

- `LEGACY_TEXT_PLACEMENTS[typeIndex]`에서 type별 기본 좌표를 복사하여 ZonePositions 객체 생성
- 각 Type의 고유 위치가 보존됨 (예: Type 3 store는 y:83 하단, Type 2 store는 -3° 회전)

### 3.3 Type별 기본 Zone 위치 (LEGACY_TEXT_PLACEMENTS 출처)

| Type | store (로고) | slogan (소개 문구) | details | summary |
|---|---|---|---|---|
| **Type 1** | (18, 7, 64, center, 0°) | (16, 16, 68, center) | (14, 74, 72, center) | (18, 86, 64, center) |
| **Type 2** | (10, 10, 48, left, **-3°**) | (12, 21, 42, left) | (66, 74, 24, right) | (64, 86, 26, right) |
| **Type 3** | (22, **83**, 56, center) | (24, **90**, 52, center) | (18, 12, 64, center) | (26, 74, 48, center, 90°) |
| **Type 4** | (14, 11, 72, center) | (20, 23, 60, center) | (16, 77, 68, center) | (24, 88, 52, center) |

### 3.4 데이터 흐름

```
handleStartFromHome / handleSelectWireframeType
  → getDefaultZonePositions(typeIndex)
  → projectData.zonePositions에 저장 (React state)
  → createElementsFromWireframe(projectData) → EditorElement[] 직접 생성
  → setElements() → EditorCanvas에 요소 배치
```

WireframeChoiceCard에서도 동일한 `getDefaultZonePositions(typeIndex)`로 Layout 컴포넌트에 zonePositions prop 전달 → 카드 프리뷰와 main-preview 일치.

## 4. Inner Wireframe (제품 슬롯)

### 4.1 사용 파일

- **a-b-1.png 변형만 사용** (hasSlogan=true 변형)
- 키 네이밍: `{type}-{productCount}-1` (예: `1-2-1`, `3-4-1`, `4-6-1`)

### 4.2 좌표 체계

- `wireframeSlots.json`의 Cx/Cy/sw/sh 값은 **수정하지 않음** (기존 0~100% 범위 유지)
- **렌더 시점에 선형 변환**: slot 좌표를 main zone 컨테이너 내부 상대값으로 해석

```
canvas_x = mainZone.x + mainZone.w × (slot.Cx / 100)
canvas_y = mainZone.y + mainZone.h × (slot.Cy / 100)
canvas_w = mainZone.w × (slot.sw / 100)
canvas_h = mainZone.h × (slot.sh / 100)
```

### 4.3 main zone 결정 로직

| Type | main zone 계산 | 이유 |
|---|---|---|
| **Type 1~3** | `MAIN_ZONE_4x5` (y:8%, h:68%) 또는 `computeMainZone916()` | store/slogan이 상단 또는 하단에 위치, main zone은 고정 |
| **Type 4** | 동적 계산: `sloganBottom = max(store.y, slogan.y) + 7`, h = `100 - sloganBottom - 3` | store/slogan이 모두 상단(y:11, y:23)이므로 그 아래에 제품 배치 |

### 4.4 구현: Layout 컴포넌트 (WireframeChoiceCard용)

```jsx
// Type 1~3: 고정 mainZone
<div style={{ position:'absolute', left:'0%', top:'8%', width:'100%', height:'68%' }}>
  {/* wireframeSlots 기반 제품 슬롯 */}
</div>

// Type 4: 동적 productZone (store/slogan 아래)
const sloganBottom = Math.max(zonePositions.store.y, zonePositions.slogan.y) + 7;
<div style={{ position:'absolute', left:'0%', top: sloganBottom+'%', width:'100%', height:(100-sloganBottom-3)+'%' }}>
```

### 4.5 구현: EditorCanvas용 (`createElementsFromWireframe`)

`createElementsFromWireframe(projectData)`가 wireframe zone 좌표 + 제품 슬롯에서 직접 `EditorElement[]`를 생성한다. 템플릿 시스템(`mapProjectDataToTemplate → applyDraftLayoutVariant → applyDraftTypographyVariant`)을 거치지 않는다.

제품 이미지는 `computeWireframeProductPlacements`가 반환하는 wireframe 상대좌표(0-100%)를 mainZone 캔버스 좌표로 리매핑:

```typescript
const rect = {
  x: mainZone.x + (p.rect.x / 100) * mainZone.w,
  y: mainZone.y + (p.rect.y / 100) * mainZone.h,
  width: (p.rect.width / 100) * mainZone.w,
  height: (p.rect.height / 100) * mainZone.h,
};
```

텍스트 요소(store, slogan, details)는 `zones` 좌표 + `getDraftTypography` 타이포그래피를 직접 사용하여 생성.

## 5. 독립 요소 배치

### 5.1 Layout 컴포넌트 (WireframeChoiceCard)

각 Layout 컴포넌트는 `zonePositions` prop(optional)을 받음:
- **있을 때**: store/slogan을 absolute % 좌표로 배치 (zonePositions 값 사용)
- **없을 때**: 기존 Tailwind 클래스 기반 배치 (initPage 호환)

```jsx
{zonePositions ? (
  <div style={{
    position: 'absolute',
    left: zonePositions.store.x + '%',
    top: zonePositions.store.y + '%',
    width: zonePositions.store.width + '%',
    textAlign: zonePositions.store.align || 'center',
    transform: zonePositions.store.rotation ? `rotate(${rotation}deg)` : undefined,
    zIndex: zonePositions.store.zIndex || 30,
  }}>
    <StoreTitle ... />
  </div>
) : (
  <div className="relative z-30 ...">
    <StoreTitle ... />
  </div>
)}
```

### 5.2 EditorCanvas (`createElementsFromWireframe`)

`createElementsFromWireframe`에서 텍스트 요소를 zone 좌표로 직접 생성:

```typescript
const zones = projectData.zonePositions ?? getDefaultZonePositions(draftIndex);
const typography = getDraftTypography(draftIndex, ratio);

// 'fallback-store-name'  → zones.store  + typography.storeSize
// 'fallback-main-slogan' → zones.slogan + typography.sloganSize
// 'fallback-details'     → zones.details + typography.detailsSize
```

## 6. 9:16 Reflow

캔버스 크기: 1000×1778 (폭 고정, 9:16 비율). 내부적으로 % 기준 동작.

### 6.1 규칙

- **절대 px 유지**: 로고/소개 문구/footer의 높이는 4:5에서의 px 값 그대로
- main zone은 **남는 세로 공간의 중앙**에 배치

### 6.2 계산

4:5 기준 (1000×1250):
```
로고:       h = 100px
소개 문구:  h = 200px
footer:    h = 100px
main zone: h = 850px
```

9:16 기준 (1000×1778):
```
로고:       (0, 0, 1000, 100)           ← 상단 고정
footer:    (0, 1678, 1000, 100)         ← 하단 앵커
소개 문구:  (0, 1478, 1000, 200)         ← footer 위
남는 세로:  1478 - 100 = 1378px
main zone: (0, 100 + (1378-850)/2, 1000, 850)
         = (0, 364, 1000, 850)          ← 세로 중앙
```

percent 변환 (1778px 기준):
```
로고:       (0%, 0%, 100%, 5.62%)
main zone: (0%, 20.47%, 100%, 47.81%)
소개 문구:  (0%, 83.13%, 100%, 11.25%)
footer:    (0%, 94.37%, 100%, 5.62%)
```

## 7. 변경된 파일 (구현 완료)

| 파일 | 변경 내용 |
|---|---|
| `wireframeSlots.json` | 변경 없음 (기존 좌표 유지) |
| `computeSlotStyle.js` | `CANVAS_HW_RATIO`를 `MAIN_ZONE_HW_RATIO`(0.85)로 변경 |
| `outerFrameZones.ts` (신규) | `MAIN_ZONE_4x5`, `computeMainZone916()`, `FrameZone` 타입 |
| `SingleLargeLayout.jsx` | mainZone 컨테이너 + zonePositions/textStyles prop 지원 |
| `SingleCompactLayout.jsx` | 동일 |
| `OverlapGroupLayout.jsx` | 동일 |
| `HalfCropGroupLayout.jsx` | 동적 productZone + zonePositions/textStyles prop 지원 + DOM 순서 (store→slogan→products) |
| `types/home.ts` | `ZonePosition`, `ZonePositions` 인터페이스, `HomeProjectData.zonePositions` 추가 |
| `editorFlow.ts` | `getDefaultZonePositions()` + `createElementsFromWireframe()` 추가 — wireframe zone 좌표에서 직접 EditorElement[] 생성 |
| `wireframeBridge.ts` | `MAIN_ZONE_4x5`, `computeMainZone916`, `FrameZone`, `MAIN_ZONE_HW_RATIO` re-export 추가 |
| `wireframeLayout.ts` | `CANVAS_HW_RATIO`를 `MAIN_ZONE_HW_RATIO`(0.85)로 변경 — editing 모듈의 제품 배치 계산(`computeType4HalfCropLayout` 등)이 main zone 기준 좌표계와 일치하도록 수정 |
| `WireframeChoiceCard.tsx` | `LayoutComponent` 타입에 zonePositions/textStyles 추가, `getDraftTypography` 기반 텍스트 스타일 계산 및 Layout에 전달 |
| `App.tsx` | `handleStartFromHome`, `handleSelectWireframeType`에서 템플릿 체인 대신 `createElementsFromWireframe` 사용 |
| `types/editor-core.ts` | `yOffsetPx` 속성 제거 (subcopy 관련 revert) |
| `EditorCanvas.tsx` | `calc()`/`yOffsetPx` 제거 → 단순 `top: ${element.y}%` 복원 |
| `BackgroundCard.tsx` | 동일 |

## 8. 검증 기준

- [x] `npm run build` 성공, TypeScript 에러 0개
- [ ] 4:5에서 wireframe 선택 시 제품 슬롯이 main zone 내부에만 배치됨
- [ ] WireframeChoiceCard 프리뷰와 main-preview(EditorCanvas) 레이아웃 일치
- [ ] Type별 고유 zone 위치 반영 (Type 3: store 하단 y:83, Type 2: store 좌측 -3°)
- [ ] Type 4: store → slogan → main zone 세로 순서 배치
- [ ] 9:16 전환 시 로고 상단 고정, footer/소개 문구 하단 앵커, main zone 세로 중앙
- [ ] editing 페이지에서 모든 요소의 자유 드래그/리사이즈/회전 기존대로 동작

## 9. 추후 작업: Zone 독립 이동 기능

### 9.1 목표

각 zone(로고, 소개 문구, details, summary)의 위치를 **WireframeChoiceCard 또는 EditorCanvas에서 독립적으로 조정** 가능하게 한다. 현재 wireframe type 선택 시 zone 위치가 일괄 초기화되는데, 추후 '...' 메뉴를 통해 개별 zone만 이동할 수 있어야 한다.

### 9.2 현재 구조가 이를 지원하는 이유

| 설계 요소 | 독립 이동 지원 근거 |
|---|---|
| **ZonePositions가 React state** | 개별 zone만 업데이트 가능 (`setProjectData(prev => ({ ...prev, zonePositions: { ...prev.zonePositions, store: newStorePos } }))`) |
| **각 zone이 별도 ZonePosition 객체** | store/slogan/details/summary를 독립적으로 변경 가능 |
| **Layout 컴포넌트가 zonePositions prop 사용** | prop 값만 바꾸면 즉시 반영 |
| **createElementsFromWireframe가 zones 객체 사용** | EditorCanvas도 state 변경 즉시 반영 |
| **main zone은 zone 좌표에서 동적 계산** | zone 이동 시 main zone도 자동 재계산 (Type 4) |

### 9.3 구현 계획

#### Phase 1: '...' 메뉴 UI

```
WireframeChoiceCard 또는 main-preview 상단
  └─ '...' 버튼 (900, 20 영역 — draw.io에 예약됨)
      └─ 드롭다운 메뉴
          ├─ 로고 위치 조정
          ├─ 소개 문구 위치 조정
          ├─ 상세 설명 위치 조정
          └─ 가격/요약 위치 조정
```

#### Phase 2: Zone 이동 인터랙션

**방법 A: 프리셋 기반 (권장)**

각 zone에 대해 미리 정의된 위치 옵션을 제공:

```typescript
const STORE_PRESETS: Record<string, ZonePosition> = {
  '좌상단': { x: 10, y: 7, width: 48, align: 'left' },
  '중앙 상단': { x: 18, y: 7, width: 64, align: 'center' },
  '하단': { x: 22, y: 83, width: 56, align: 'center' },
};
```

- 장점: UI 단순, 디자인 가이드라인 내 제한 가능
- 단점: 자유도 제한

**방법 B: 드래그 기반**

zone 요소에 드래그 핸들을 추가하여 자유 이동:

```typescript
const handleZoneDrag = (zoneName: keyof ZonePositions, newX: number, newY: number) => {
  setProjectData(prev => ({
    ...prev,
    zonePositions: {
      ...prev.zonePositions,
      [zoneName]: { ...prev.zonePositions[zoneName], x: newX, y: newY },
    },
  }));
};
```

- 장점: 완전한 자유도
- 단점: EditorCanvas의 기존 드래그 로직과 충돌 가능 → WireframeChoiceCard에서만 zone 드래그, EditorCanvas에서는 개별 요소 드래그로 분리

#### Phase 3: Zone 이동 시 main zone 자동 재계산

zone 위치가 변경되면 main zone(제품 영역)이 자동으로 재계산되어야 한다:

```typescript
function computeMainZoneFromZones(zones: ZonePositions, ratio: string): FrameZone {
  const topZones = [zones.store, zones.slogan].filter(z => z.y < 50);
  const bottomZones = [zones.details, zones.summary].filter(z => z.y >= 50);
  
  const topEnd = topZones.length > 0
    ? Math.max(...topZones.map(z => z.y)) + 7   // 최하단 상단 zone + 여백
    : 8;                                          // 기본값
  const bottomStart = bottomZones.length > 0
    ? Math.min(...bottomZones.map(z => z.y)) - 3 // 최상단 하단 zone - 여백
    : 92;                                         // 기본값
    
  return { x: 0, y: topEnd, w: 100, h: bottomStart - topEnd };
}
```

이 함수를 `applyDraftLayoutVariant`와 Layout 컴포넌트 양쪽에서 사용하면, zone 이동 시 제품 영역이 자동으로 리사이즈/리포지셔닝된다.

#### Phase 4: 이동 범위 제한

zone 간 겹침 방지 및 최소 main zone 크기 보장:

```typescript
const ZONE_CONSTRAINTS = {
  store:   { yMin: 0,  yMax: 40 },   // 상단 40% 이내
  slogan:  { yMin: 0,  yMax: 50 },   // 상단 50% 이내
  details: { yMin: 50, yMax: 95 },   // 하단 50% 이후
  summary: { yMin: 60, yMax: 95 },   // 하단 40% 이후
  mainZoneMinHeight: 30,              // 제품 영역 최소 30%
};
```

### 9.4 데이터 흐름 (Zone 독립 이동 시)

```
사용자: '...' 메뉴 → 로고 위치 → '하단' 프리셋 선택
  ↓
setProjectData({
  ...projectData,
  zonePositions: {
    ...projectData.zonePositions,
    store: STORE_PRESETS['하단'],   // y:83으로 변경
  },
})
  ↓
WireframeChoiceCard: Layout 컴포넌트 re-render (zonePositions prop 반영)
  ↓
createElementsFromWireframe: zones.store 변경 반영 → elements 재생성
  ↓
EditorCanvas: re-render (main-preview 갱신)
```

**wireframe type 변경과의 관계:**
- wireframe type 선택 → `getDefaultZonePositions(typeIndex)`로 **전체 초기화**
- zone 독립 이동 → 해당 zone만 **부분 업데이트** (다른 zone/wireframe 유지)

## 10. 기타 추후 작업

- `기본 이미지 2.png` 변형 적용
- a-b-2 (hasSlogan=false) 변형의 계층 구조 처리
