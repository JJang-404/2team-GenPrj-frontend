# [Plan] 메인 프리뷰와 구도 선택 카드 간 가로 정렬 동기화 표준 수립

작성일: 2026-04-15 (업데이트: 2026-04-17)
목표: 'editing' 페이지에서 'Main Preview'와 'WireframeChoiceCard'의 **가로(Horizontal) 위치 및 중앙 정렬**을 완벽하게 일치시켜 시각적 연속성을 확보합니다.

## 1. 현재 문제 분석

1. **가로 정렬 방식 차이**:
   - `Main Preview`는 `%` 너비를 기준으로 내부 `textAlign: center`를 사용하여 중앙을 잡습니다.
   - `WireframeChoiceCard`는 데이터의 `x` 좌표와 `width` 값을 바탕으로 절대 위치를 잡으려다 보니, 소수점 계산이나 스케일링(`scaleFactor`) 과정에서 미세한 차이가 발생합니다.
2. **좌표 데이터 불일치**: `LEGACY_TEXT_PLACEMENTS`와 `WIREFRAME_TEXT_PLACEMENTS`의 `x`, `width` 값이 서로 달라 카드와 프리뷰의 가로 배치가 눈에 띄게 어긋납니다.

## 2. 해결 및 표준화 방안

### 2-1. 가로 좌표 표준 확립 (Horizontal Standard)
- **중앙 정렬(Centered) 요소**: 반드시 `x: 0`, `width: 100`, `align: 'center'`를 사용하는 것을 원칙으로 합니다. 이렇게 하면 컨테이너 너비와 상관없이 항상 기하학적 중앙에 위치하게 됩니다.
- **측면 정렬(Side) 요소**: 고정된 `%` 여백(예: `x: 5`, `width: 90`)을 사용하여 라운드 테두리 등 베젤 영역을 침범하지 않도록 합니다.

### 2-2. 데이터 파일 단일화/동기화
- `react/src/modules/editing/utils/wireframeTextPlacements.ts`의 `x` 및 `width` 수치를 `editorFlow.ts`의 기준값과 100% 동기화합니다.
- **주의**: 사용자의 피드백에 따라 Type 2의 수직 위치(`y`)는 현재 상태(가게명 68, 슬로건 80)를 유지하며 변경하지 않습니다.

### 2-3. 텍스트 스케일링 유지
- 카드 내에서 `REFERENCE_CANVAS_WIDTH (580px)` 대비 비율인 `scaleFactor`를 정확히 적용하여, 메인 프리뷰를 그대로 축소한 것과 같은 시각적 크기를 유지합니다.

## 3. 수정 범위 및 우선순위

| 우선순위 | 파일 | 작업 내용 |
|---|---|---|
| **1** | `doc/0415/plan.md` | 현 계획서 최신화 및 가로 정렬 표준 명시 (완료) |
| **2** | `editorFlow.ts` | 중앙 정렬 요소에 대해 `x: 0, width: 100` 표준 적용 여부 재점검 |
| **3** | `wireframeTextPlacements.ts` | `editorFlow.ts`와 가로 좌표(`x`, `width`) 동기화 |

## 4. 검증 기준
1. 배경 선택 카드에 표시된 텍스트의 **좌우 중앙 정렬**과 메인 프리뷰의 중앙 정렬 위치가 눈으로 보기에 선상에 일치하는가?
2. `x: 0, width: 100` 원칙이 적용되어 텍스트 박스가 캔버스를 꽉 채우고 있는가?
