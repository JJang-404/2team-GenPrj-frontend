# 배경 카드 깜빡임(Flicker) 버그 수정 보고서

- **날짜**: 2026-04-19
- **브랜치**: feature/United1_8_patch
- **수정 파일**: `react/src/modules/editing/App.tsx`

---

## 증상

`그라데이션` / `다중색` 모드에서 AI 이미지 생성 프롬프트 입력란에 텍스트를 입력하면:

1. 우측 배경 선택 패널의 카드가 **4개 → 1개 → 4개**로 순간 요동침
2. `BackgroundCard`의 카드 이름이 **'initPage 배경'** 으로 순간 노출됐다가 **'사용자 그라데이션 1'** 등으로 복귀
3. `WireframeChoiceCard` 내부 레이아웃 글씨 크기가 커졌다 작아지는 **스케일 깜빡임** 발생

---

## 근본 원인 분석

### 1. 상태 초기화 충돌 (`App.tsx`)

`promptHint` 변경 시 두 개의 `useEffect`가 동시에 실행됩니다.

| useEffect | 실행 시점 | 동작 |
|---|---|---|
| 242라인 | 즉시 | `buildInitialBackgroundCandidate` 호출 → `setBackgroundCandidates([preview])` **1개로 덮어씀** |
| 252라인 | 즉시 (80ms 뒤 실행) | `setQueuedBackgroundGeneration(true)` → `handleGenerateBackgrounds` → **4개 후보 생성** |

결과적으로 **4→1→4** 사이클이 매 입력마다 반복됩니다.

### 2. 'initPage 배경' 이름 노출

`initialBackground.ts:104`에 이름이 `'initPage 배경'`으로 하드코딩되어 있어,
1개짜리 임시 후보가 화면에 노출되는 80ms 동안 해당 텍스트가 `BackgroundCard`의 `<strong>` 태그에 렌더링됩니다.

### 3. ResizeObserver scaleFactor 요동

`BackgroundCard.tsx` / `WireframeChoiceCard.tsx` 모두 동일한 패턴을 사용합니다:

```ts
const observer = new ResizeObserver(([entry]) => {
  setScaleFactor(entry.contentRect.width / REFERENCE_WIDTH); // 580px 기준
});
```

카드 수가 4→1로 줄면 그리드 레이아웃이 변해 카드 너비가 커지고,
다시 4개로 늘면 너비가 줄어 `scaleFactor`가 재계산됩니다.
이 과정에서 내부 텍스트/레이아웃 크기가 커졌다 작아지는 시각적 깜빡임이 발생합니다.

---

## 수정 내용

### `App.tsx` — 242라인 useEffect

**핵심 원칙**: gradient/pastel 모드에서 이미 후보가 존재하면 목록 구조를 건드리지 않는다.
80ms 뒤 `handleGenerateBackgrounds`가 4개 후보를 생성하면 자연스럽게 교체됩니다.

**Before**:
```ts
useEffect(() => {
  if (!projectData || backgroundMode === 'ai-image') return;
  if (suspendInitialBackgroundSyncRef.current) return;
  const preview = buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint, backgroundColorDraft);
  setBackgroundCandidates([preview]);       // ← 항상 1개로 덮어씀 (문제)
  setSelectedBackgroundId(preview.id);
}, [backgroundMode, promptHint, projectData, backgroundColorDraft]);
```

**After**:
```ts
useEffect(() => {
  if (!projectData || backgroundMode === 'ai-image') return;
  if (suspendInitialBackgroundSyncRef.current) return;
  const preview = buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint, backgroundColorDraft);

  if (backgroundMode === 'gradient' || backgroundMode === 'pastel') {
    setBackgroundCandidates(prev => {
      if (prev.length > 0) return prev;  // 후보 있으면 구조 유지
      return [preview];                  // 최초 진입 시에만 초기화
    });
  } else {
    // solid 모드: 단일 프리뷰 즉시 반영 (기존 동작 유지)
    setBackgroundCandidates([preview]);
    setSelectedBackgroundId(preview.id);
  }
}, [backgroundMode, promptHint, projectData, backgroundColorDraft]);
```

---

## 수정 효과

| 항목 | Before | After |
|---|---|---|
| 카드 수 변화 | 4→1→4 (매 입력마다) | 4→4 유지 (구조 안정) |
| 'initPage 배경' 노출 | 80ms 동안 노출 | 노출 없음 |
| scaleFactor 재계산 | 카드 너비 변화마다 발동 | 카드 너비 안정 → 발동 없음 |
| 모드 최초 진입 | 정상 초기화 | 동일하게 정상 초기화 (`prev.length === 0`) |
| solid 모드 동작 | 변경 없음 | 변경 없음 |

---

## 적용하지 않은 대안

| 방안 | 이유 |
|---|---|
| Option A: 이름만 변경 | 레이아웃 깜빡임 미해결 |
| Option C: useEffect 분리 | 효과는 동일하나 리팩터링 범위가 크고 side-effect 위험 증가 |
