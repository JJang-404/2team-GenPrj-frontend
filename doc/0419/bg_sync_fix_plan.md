# 배경색 동기화 버그 수정 계획

> 작성일: 2026-04-19  
> 브랜치: feature/United1_8_patch

---

## 1. 버그 원인 (Root Cause)

코드 검증 결과, 사용자 계획의 방향은 맞으나 **수정 대상이 단 1개 파일**로 좁혀집니다.

### 데이터 흐름 단절 위치

```
App.tsx
  │  backgroundColorDraft 상태 보유
  │  handleSolidColorChange / handleGradientColorsChange / handleMultiColorsChange 핸들러 보유
  │  promptHint = 토큰 없는 순수 텍스트 (413줄: 토큰 strip 후 저장)
  ▼
Sidebar.tsx  ✅ 올바르게 전달 중 (114-123줄)
  │  solidColor={backgroundColorDraft.solid[0]}
  │  gradientColors={backgroundColorDraft.gradient}
  │  multiColors={backgroundColorDraft.pastel}
  │  onSolidColorChange={onSolidColorChange}
  │  onGradientColorsChange={onGradientColorsChange}
  │  onMultiColorsChange={onMultiColorsChange}
  ▼
BackgroundOptionsSection.tsx  ❌ Props 인터페이스에 미선언 → 모두 무시됨
  │  내부에서 promptHint 토큰 파싱으로 색상 읽음
  │  promptHint에 토큰이 없으므로 항상 하드코딩 기본값 사용
  │  색상 변경 시 onPromptHintChange(토큰 삽입 문자열) 호출
  │  → App.tsx의 캔버스 동기화 effect는 backgroundColorDraft를 감시하므로 미반영
  ▼
EditorCanvas  ❌ 색상 변경이 도달하지 않음
```

### 핵심 문제 2가지

| # | 문제 | 위치 |
|---|------|------|
| 1 | `BackgroundOptionsSectionProps` 인터페이스에 색상 props 6개 미선언 → Sidebar에서 전달해도 무시됨 | `BackgroundOptionsSection.tsx` 13-21줄 |
| 2 | 색상 변경 시 `onPromptHintChange`에 토큰 삽입 → App.tsx 캔버스 동기화 effect(`backgroundColorDraft` 감시)에 도달 불가 | `BackgroundOptionsSection.tsx` 60-67줄 |

---

## 2. 수정 범위

> **Sidebar.tsx, App.tsx는 수정 불필요.** 두 파일은 이미 올바르게 구성되어 있습니다.

### [MODIFY] `BackgroundOptionsSection.tsx` (유일한 수정 파일)

#### 2-1. Props 인터페이스 확장

```typescript
// Before
interface BackgroundOptionsSectionProps {
  expanded: boolean;
  promptHint: string;
  backgroundMode: BackgroundMode;
  onPromptHintChange: (value: string) => void;
  onBackgroundModeChange: (mode: BackgroundMode) => void;
  onGenerateBackgrounds: () => void;
  onBackToBackgrounds: () => void;
}

// After
interface BackgroundOptionsSectionProps {
  expanded: boolean;
  promptHint: string;
  backgroundMode: BackgroundMode;
  solidColor: string;                          // 추가
  gradientColors: [string, string];            // 추가
  multiColors: [string, string];               // 추가
  onPromptHintChange: (value: string) => void;
  onBackgroundModeChange: (mode: BackgroundMode) => void;
  onSolidColorChange: (color: string) => void;           // 추가
  onGradientColorsChange: (colors: [string, string]) => void; // 추가
  onMultiColorsChange: (colors: [string, string]) => void;    // 추가
  onGenerateBackgrounds: () => void;
  onBackToBackgrounds: () => void;
}
```

#### 2-2. 내부 토큰 파싱 로직 제거 → Props 직접 사용

```typescript
// Before (제거 대상 - promptHint에서 파싱)
const solidColor = extractHexColor(parseBackgroundToken(promptHint, 'SOLID')?.[0] ?? '', '#60a5fa');
const gradientColors = (parseBackgroundToken(promptHint, 'GRADIENT') ?? [...])...
const multiColors = (parseBackgroundToken(promptHint, 'MULTI') ?? [...])...
const buildPromptForMode = (...) => { ... }   // 토큰 생성 함수
const setPromptWithToken = (...) => { ... }   // 토큰 삽입 함수

// After (Props 값을 그대로 사용)
// 위 변수들 모두 제거. props에서 받은 solidColor, gradientColors, multiColors 직접 사용.
```

#### 2-3. 이벤트 핸들러 교체

```typescript
// Before (토큰 삽입 방식)
onChange={(event) => setPromptWithToken('solid', freePrompt, [event.target.value])}

// After (전용 핸들러 호출)
onChange={(event) => onSolidColorChange(event.target.value)}
```

```typescript
// gradient onChange
const next = [...gradientColors] as [string, string];
next[index] = event.target.value;
onGradientColorsChange(next);
```

```typescript
// pastel(multi) onChange
const next = [...multiColors] as [string, string];
next[index] = event.target.value;
onMultiColorsChange(next);
```

#### 2-4. 모드 전환 핸들러 단순화

```typescript
// Before
const handleModeSelect = (mode: BackgroundMode) => {
  onBackgroundModeChange(mode);
  setPromptWithToken(mode, freePrompt);  // 토큰 삽입 — 불필요
};

// After
const handleModeSelect = (mode: BackgroundMode) => {
  onBackgroundModeChange(mode);
  // 토큰 삽입 제거 (색상은 backgroundColorDraft가 관리)
};
```

#### 2-5. textarea 정리

```typescript
// Before
<textarea value={freePrompt} onChange={(event) => setPromptWithToken(backgroundMode, event.target.value)} />

// After (순수 텍스트만 관리)
const freePrompt = promptHint; // stripBackgroundTokens 불필요 (이미 토큰 없음)
<textarea value={freePrompt} onChange={(event) => onPromptHintChange(event.target.value)} />
```

---

## 3. 삭제 가능한 코드

수정 후 `BackgroundOptionsSection.tsx` 내 아래 import/함수가 불필요해집니다:

```typescript
// 삭제
import { extractHexColor, parseBackgroundToken, stripBackgroundTokens, withBackgroundToken } from './backgroundTokens';

// 삭제 (토큰 관련 내부 함수)
const buildPromptForMode = ...
const setPromptWithToken = ...
```

`backgroundTokens.ts` 파일 자체는 다른 곳에서 사용하지 않는다면 삭제 가능하나, 먼저 참조 여부 확인 필요.

---

## 4. 데이터 흐름 (수정 후)

```
사용자가 컬러 피커 조작
  ▼
BackgroundOptionsSection.tsx
  onSolidColorChange(color) 호출
  ▼
App.tsx: handleSolidColorChange(color)
  suspendInitialBackgroundSyncRef.current = false
  setBackgroundColorDraft(prev => ({ ...prev, solid: [color] }))
  ▼
useEffect [backgroundMode, promptHint, projectData, backgroundColorDraft] (250줄)
  buildInitialBackgroundCandidate(..., backgroundColorDraft) 실행
  setBackgroundCandidates([preview])
  setSelectedBackgroundId(preview.id)
  ▼
EditorCanvas: background={selectedBackground}  ✅ 즉시 반영
```

---

## 5. 검증 계획

### 기능 검증
- [ ] 단색 모드: 컬러 피커 조작 시 캔버스 배경이 즉시 단색으로 변경됨
- [ ] 그라데이션 모드: 2개 색상 피커 조작 시 캔버스 배경 즉시 반영됨
- [ ] 다중색 모드: 2개 색상 피커 조작 시 캔버스 배경 즉시 반영됨
- [ ] 모드 전환 (solid → gradient → pastel → ai-image): 각 모드의 마지막 색상이 유지됨
- [ ] `promptHint` textarea 입력 시 공백/한글 유지됨 (토큰 파싱 제거로 인한 공백 손실 없음)
- [ ] AI 배경 생성 버튼 클릭 시 업종 정보 포함되어 백엔드 전달됨

### 회귀 검증
- [ ] `suspendInitialBackgroundSyncRef` 플래그 동작 유지 (handleStartFromHome에서 초기 배경 중복 생성 방지)
- [ ] `useAiDesignSystem` 훅의 텍스트 색상 자동 변경 기능 유지
- [ ] AI 이미지 모드에서 배경 생성 및 후보 선택 정상 동작

---

## 6. 수정 요약

| 항목 | 내용 |
|------|------|
| 수정 파일 | `BackgroundOptionsSection.tsx` (1개) |
| 수정 불필요 | `Sidebar.tsx`, `App.tsx`, `initialBackground.ts` |
| 핵심 변경 | Props 인터페이스 확장 + 토큰 파싱 → Props 직접 사용으로 교체 |
| 예상 라인 변경 | 약 -20줄 / +10줄 (단순화) |
