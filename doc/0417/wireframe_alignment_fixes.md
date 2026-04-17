# Wireframe 정렬 및 Zone 배치 수정 보고서

작성일: 2026-04-17

## 1. 개요

WireframeChoiceCard, Main Preview(EditorCanvas), BackgroundCard 간의 텍스트 정렬(text-align) 불일치 및 store/slogan zone 배치 관련 수정을 진행함.

## 2. 수정 사항

### 2.1 BackgroundCard 텍스트 정렬 수정

**파일:** `react/src/modules/editing/components/BackgroundCard.tsx`

**문제:** EditorCanvas는 텍스트 요소의 `width`를 `element.width%`로 고정하도록 이미 수정되었으나, BackgroundCard는 여전히 `width: fit-content`를 사용하고 있었음. `fit-content`는 텍스트 박스를 콘텐츠 크기로 축소시켜 `textAlign: center`가 시각적으로 무시되는 현상 발생.

**증상:** Type 3(OverlapGroupLayout)의 store(`align: center`)가 Main Preview와 BackgroundCard에서 서로 다른 위치에 표시됨.

**수정 내용:**
```diff
- width: element.kind === 'text' ? 'fit-content' : `${element.width}%`,
- maxWidth: element.kind === 'text' ? `${element.width}%` : undefined,
- height: element.kind === 'text' ? 'auto' : `${element.height}%`,
+ width: `${element.width}%`,
+ height: element.kind === 'text' ? 'auto' : `${element.height}%`,
```

**검증:** 수정 후 세 렌더링 경로 모두 동일한 방식으로 텍스트 정렬 처리:
| 렌더링 경로 | width 처리 | textAlign | 상태 |
|---|---|---|---|
| EditorCanvas (Main Preview) | `element.width%` | `element.align` | 기존 수정 완료 |
| BackgroundCard | `element.width%` | `element.align` | 이번 수정 |
| WireframeChoiceCard (Layout) | zonePositions 기반 | `zonePositions.store.align` | 정상 |

### 2.2 Type 2 LEGACY_TEXT_PLACEMENTS 좌표 수정

**파일:** `react/src/modules/editing/utils/editorFlow.ts`

**문제:** Type 2(SingleCompactLayout)의 store/slogan 좌표가 설계 보고서(doc/0416/hierarchical_wireframe_spec.md Section 3.3)와 불일치.

**수정 내용:**
| 필드 | 수정 전 | 수정 후 | 비고 |
|---|---|---|---|
| store | `(10, 68, 48, left, -3°)` | `(10, 10, 48, left, -3°)` | y: 68→10, 상단 배치 |
| slogan | `(0, 80, 100, center)` | `(12, 21, 42, left)` | 보고서 기준 복원 |

```diff
  // draftIndex 1 (Type2)
  {
-   store: { x: 10, y: 68, width: 48, align: 'left', rotation: -3, zIndex: 30 },
-   /* [ORIGINAL] slogan: ... */
-   /* [MODIFIED] Footer 공간 확보를 위해 y 좌표 상향 조정 (백업 기준) */
-   slogan: { x: 0, y: 80, width: 100, align: 'center', rotation: 0, zIndex: 29 },
+   store: { x: 10, y: 10, width: 48, align: 'left', rotation: -3, zIndex: 30 },
+   slogan: { x: 12, y: 21, width: 42, align: 'left', rotation: 0, zIndex: 29 },
```

**영향:** `computeMainZoneFromZones(10, 21)` → store/slogan이 상단(y < 50)이므로 mainZone이 아래쪽에 배치됨 (y=28%, h=69%).

### 2.3 WireframeChoiceCard store-above-slogan 겹침 방지

**파일:** `react/src/modules/editing/components/WireframeChoiceCard.tsx`

**목적:** WireframeChoiceCard 내에서 store가 항상 slogan 위에 위치하도록 보장. 향후 zone 위치 변경 시에도 겹침을 자동 방지.

**추가된 코드:**
```typescript
const MIN_ZONE_GAP = 7;

function ensureStoreAboveSlogan(
  zones: ZonePositions,
): ZonePositions {
  if (zones.slogan.y >= zones.store.y + MIN_ZONE_GAP) return zones;
  return {
    ...zones,
    slogan: { ...zones.slogan, y: zones.store.y + MIN_ZONE_GAP },
  };
}
```

**적용 위치:**
```diff
- zonePositions={getDefaultZonePositions(typeIndex)}
+ zonePositions={ensureStoreAboveSlogan(getDefaultZonePositions(typeIndex))}
```

**현재 기본값 검증 (모두 gap >= 7%):**
| Type | store.y | slogan.y | gap | 조정 필요 |
|---|---|---|---|---|
| Type 1 | 7 | 16 | 9% | 없음 |
| Type 2 | 10 | 21 | 11% | 없음 |
| Type 3 | 83 | 90 | 7% | 없음 |
| Type 4 | 11 | 23 | 12% | 없음 |

**기법:** `computeMainZoneFromZones`에서 사용하는 7% 갭과 동일한 값 적용. WireframeChoiceCard에 한정된 변경으로, main preview/BackgroundCard 경로에는 영향 없음.

## 3. 수정 파일 요약

| 파일 | 변경 유형 | 설명 |
|---|---|---|
| `editing/components/BackgroundCard.tsx` | 버그 수정 | 텍스트 width `fit-content` → `element.width%` |
| `editing/utils/editorFlow.ts` | 좌표 수정 | Type 2 store/slogan 보고서 기준 복원 |
| `editing/components/WireframeChoiceCard.tsx` | 기능 추가 | `ensureStoreAboveSlogan` 겹침 방지 |
| `editing/utils/editorFlow.ts` | 표준 적용 | center 요소 `x:0, w:100` 가로 정렬 표준 (§2.4) |
| `editing/utils/editorFlow.ts` | 좌표 조정 | Type 2 store y:68→65 회전 겹침 방지 (§2.5) |
| `initPage/components/draft/DraftCard.jsx` | 구조 변경 | Type 1 고정, zonePositions 적용 (§2.6) |
| `editing/utils/editorFlow.ts` | 방어적 수정 | fallback 생성 시 zonePositions 참조 (§2.7) |

### 2.4 가로 정렬 표준 적용 (x:0, w:100)

**파일:** `react/src/modules/editing/utils/editorFlow.ts`

**기준:** `doc/0415/plan.md` Section 2-1 — 중앙 정렬 요소는 `x: 0`, `width: 100`, `align: 'center'`를 원칙으로 함.

**수정 내용:** `LEGACY_TEXT_PLACEMENTS`의 모든 center 요소에 표준 적용.

| Type | 필드 | 수정 전 | 수정 후 |
|---|---|---|---|
| Type 1 | 전체 | 이미 표준 준수 | 변경 없음 |
| Type 2 | slogan | `(0, 80, 100, center)` | 변경 없음 (이미 표준) |
| Type 3 | store, slogan, details, summary | 개별 x/width 값 | `x:0, w:100, align:'center'` |
| Type 4 | store, slogan, details, summary | 개별 x/width 값 | `x:0, w:100, align:'center'` |

Type 2의 side 요소(store, details, summary)는 의도적으로 좌/우 정렬이므로 표준 적용 대상에서 제외.

### 2.5 Type 2 store y좌표 조정 (회전 겹침 방지)

**파일:** `react/src/modules/editing/utils/editorFlow.ts`

**문제:** Type 2의 store(`rotation: -3°`)가 y:68에 위치할 때 slogan(y:80)과 시각적으로 겹침 발생.

**수정 내용:**
| 필드 | 수정 전 | 수정 후 | 비고 |
|---|---|---|---|
| store | `y: 68` | `y: 65` | 3% 상향으로 회전 겹침 해소 |

### 2.6 initPage DraftCard Type 1 고정

**파일:** `react/src/modules/initPage/components/draft/DraftCard.jsx`

**문제:** initPage의 DraftCard가 editing의 WireframeChoiceCard Type 1과 동일한 구조를 사용해야 하나, zonePositions 없이 렌더링되고 있었음.

**수정 내용:**
- Layout을 `SingleLargeLayout`으로 고정
- `TYPE1_ZONE_POSITIONS`를 `LEGACY_TEXT_PLACEMENTS[0]`과 동일한 값으로 정의하여 전달

```jsx
const TYPE1_ZONE_POSITIONS = {
  store: { x: 0, y: 7, width: 100, align: 'center', rotation: 0, zIndex: 30 },
  slogan: { x: 0, y: 16, width: 100, align: 'center', rotation: 0, zIndex: 29 },
  details: { x: 0, y: 74, width: 100, align: 'center', rotation: 0, zIndex: 28 },
  summary: { x: 0, y: 86, width: 100, align: 'center', rotation: 0, zIndex: 28 },
};
const Layout = SingleLargeLayout;
```

### 2.7 updateProjectTextElements fallback 정렬 수정

**파일:** `react/src/modules/editing/utils/editorFlow.ts`

**문제:** `updateProjectTextElements`에서 store/slogan 요소가 존재하지 않을 때 생성하는 fallback이 하드코딩된 좌측 정렬(`x:8, align:'left'`)을 사용하고 있었음.

**수정 내용:** fallback 생성 시 `zonePositions` 또는 `getDefaultZonePositions(draftIndex)`에서 좌표 및 정렬 값을 참조하도록 변경.

```diff
  // Store fallback
- x: 8, y: 8, width: 44, align: 'left'
+ x: storeZone.x, y: storeZone.y, width: storeZone.width, align: storeZone.align ?? 'center'

  // Slogan fallback
- x: 8, y: 18, width: 58, align: 'left'
+ x: sloganZone.x, y: sloganZone.y, width: sloganZone.width, align: sloganZone.align ?? 'center'
```

**비고:** 실제 운용에서는 slogan이 항상 initPage에서 생성되어 전달되므로 이 fallback 경로가 실행되지 않음을 확인. 방어적 수정.

## 4. 미수정 사항 (검토 완료, 변경 불필요)

- **doc/0416/hierarchical_wireframe_spec.md Section 3.3:** Type 2 좌표가 보고서 기준으로 정확함을 확인. 코드 쪽을 보고서에 맞춰 수정함.
- **`wireframeTextPlacements.ts`의 `storeName`/`mainSlogan`:** `deriveWireframeLayout`에서 반환되지만, `applyDraftLayoutVariant`에서 실제로 사용되지 않음 (dead code). 실제 store/slogan 위치는 `LEGACY_TEXT_PLACEMENTS` → `getDefaultZonePositions`에서만 결정됨.
- **`applyDraftLayoutVariant`의 mainZone 계산:** Types 1-3은 고정 `MAIN_ZONE_4x5`, Type 4만 동적 계산. Layout 컴포넌트와의 정합성 검토 필요 (추후 과제).
- **Slogan 텍스트 fallback 경로 조사:** slogan 텍스트 내용이 항상 `createAutoSlogan`(`${store}에서 만나는 오늘의 ${product}`)으로 생성되어 initPage에서 넘어오므로, `updateProjectTextElements`(line 1025-1051)의 fallback 생성 경로는 실행되지 않음을 확인. slogan 텍스트를 생성/수정하는 코드 경로는 `createElementsFromWireframe`(line 122)과 `updateProjectTextElements`(line 973, 기존 요소 업데이트) 두 가지뿐이며, 별도의 텍스트 fallback은 존재하지 않음.

## 5. 검증

- TypeScript 컴파일: 에러 0개
- `fit-content` 잔존 확인: EditorCanvas 주석(백업 코드) 내에만 존재, 실제 사용 없음
