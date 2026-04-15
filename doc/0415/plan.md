# [Plan] 메인 프리뷰와 구도 선택 카드 간 텍스트/이미지 매칭 및 동기화

작성일: 2026-04-15
목표: 'editing' 페이지에서 'Main Preview'와 'WireframeChoiceCard'의 텍스트/이미지 위치 및 비율을 완벽하게 매칭하고, 초기 상태 및 타입 변경 시 동기화가 제대로 이루어지도록 수정합니다.

## 1. 현재 문제 분석

1. **좌표 불일치**: `Main Preview`는 `EditorElement[]` 기반의 절대 % 좌표를 사용하는 반면, `WireframeChoiceCard`는 `initPage`의 Tailwind 기반 레이아웃(`SingleLargeLayout` 등)을 사용합니다. `WIREFRAME_TEXT_PLACEMENTS`에 정의된 % 좌표가 실제 Tailwind 레이아웃의 위치와 정확히 일치하지 않습니다.
2. **초기 동기화 미흡**: `App.tsx` 초기 로딩 시 `draftIndex`에 따른 레이아웃 변형이 완벽하게 적용되지 않거나, 템플릿 기본값과 혼선이 있을 수 있습니다.
3. **비율 불일치**: `doc/0413/font-scale-sync.md`에서 분석된 바와 같이, 캔버스 너비 차이(580px vs 310px)로 인해 폰트 크기가 시각적으로 다르게 보입니다.

## 2. 해결 방안

### 2-1. 좌표 및 배치 정밀 매칭
- `react/src/modules/editing/utils/wireframeTextPlacements.ts`의 좌표를 `initPage` 레이아웃 컴포넌트(`SingleLargeLayout`, `SingleCompactLayout` 등)의 실제 렌더링 위치와 일치하도록 수정합니다.
- 특히 `Type 1`(draftIndex 0)의 가게명과 슬로건 위치를 `initPage` 레이아웃과 동일하게 조정합니다.

### 2-2. 초기 상태 매칭 (Type 1 우선)
- `App.tsx`의 `handleStartFromHome`에서 `draftIndex: 0` (Type 1)이 전달될 때, `applyDraftLayoutVariant`와 `applyDraftTypographyVariant`가 올바르게 실행되어 초기 `Main Preview`가 Type 1의 구도를 가지도록 보장합니다.

### 2-3. 타입 변경 동기화 강화
- 사용자가 `WireframeChoiceCard`를 클릭하여 타입을 변경할 때, `handleSelectWireframeType`이 `projectData.options.draftIndex`를 갱신하고 `setElements`를 통해 `Main Preview`를 즉시 업데이트하도록 유지 및 검증합니다.

### 2-4. 텍스트 스케일링 적용 (비율 최적화)
- `doc/0413`의 가이드를 따라 `WireframeChoiceCard` 내에서의 텍스트 렌더링 시 `scaleFactor`를 고려하여 시각적 크기가 `Main Preview`와 동일하게 보이도록 합니다.

## 3. 수정 파일 및 범위

| 파일 | 수정 내용 |
|---|---|
| `react/src/modules/editing/utils/wireframeTextPlacements.ts` | 각 Type별 `storeName`, `mainSlogan` 등의 % 좌표를 `initPage` 레이아웃과 일치하도록 정밀 수정 |
| `react/src/modules/editing/utils/editorFlow.ts` | `applyDraftLayoutVariant` 내의 `LEGACY_TEXT_PLACEMENTS` 및 레이아웃 적용 로직 점검 및 보완 |
| `react/src/modules/editing/App.tsx` | 초기 로딩 및 타입 변경 시의 상태 업데이트 로직 검증 |
| `react/src/modules/editing/components/WireframeChoiceCard.tsx` | (필요 시) `scaleFactor` 적용 로직 확인 및 `projectData` 기반 렌더링 최적화 |

## 4. 검증 계획
1. `editing` 진입 시 초기 `Main Preview`가 `WireframeChoiceCard`의 Type 1과 동일한 위치에 텍스트와 이미지가 배치되는지 확인.
2. Type 2, 3, 4로 변경 시 `Main Preview`가 각 카드에 표시된 구도와 일치하게 변경되는지 확인.
3. 텍스트 크기가 `Main Preview`와 카드 간에 시각적으로 동일한 비율을 유지하는지 확인.
