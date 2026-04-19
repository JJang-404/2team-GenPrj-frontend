# 배경색 동기화 버그 수정 보고서

> 작성일: 2026-04-19  
> 브랜치: feature/United1_8_patch  
> 수정자: JJANG

---

## 1. 문제 요약

사이드바에서 단색 / 그라데이션 / 다중색 컬러 피커를 조작해도 캔버스 배경에 반영되지 않던 문제.

---

## 2. 근본 원인

`App.tsx` → `Sidebar.tsx` → `BackgroundOptionsSection.tsx` 데이터 흐름에서 **`BackgroundOptionsSection.tsx` 단계에서 Props가 무시**되는 단절 발생.

| 단계 | 상태 |
|------|------|
| `App.tsx` | ✅ `backgroundColorDraft` 상태 + 전용 핸들러(`handleSolidColorChange` 등) 정상 보유 |
| `Sidebar.tsx` (114-123줄) | ✅ `solidColor`, `gradientColors`, `multiColors`, `onSolidColorChange` 등 정상 전달 중 |
| `BackgroundOptionsSection.tsx` | ❌ Props 인터페이스에 6개 미선언 → 전달받은 값 전부 무시 |

**파생 문제 2가지:**

1. 컴포넌트 내부에서 `promptHint` 토큰 파싱으로 색상 읽음  
   → `App.tsx` 413줄에서 토큰을 strip하여 저장하므로 토큰 없음 → **항상 하드코딩 기본값만 표시**

2. 색상 변경 시 `onPromptHintChange(토큰 삽입 문자열)` 호출  
   → 캔버스 동기화 effect(`App.tsx` 250줄)는 `backgroundColorDraft`를 감시  
   → **캔버스 미반영**

---

## 3. 수정 내용

### [MODIFIED] `react/src/modules/editing/components/sidebar/BackgroundOptionsSection.tsx`

#### 3-1. 불필요한 import 제거

```diff
- import { extractHexColor, parseBackgroundToken, stripBackgroundTokens, withBackgroundToken } from './backgroundTokens';
```

#### 3-2. Props 인터페이스 확장 (+6개)

```diff
  interface BackgroundOptionsSectionProps {
    expanded: boolean;
    promptHint: string;
    backgroundMode: BackgroundMode;
+   solidColor: string;
+   gradientColors: [string, string];
+   multiColors: [string, string];
    onPromptHintChange: (value: string) => void;
    onBackgroundModeChange: (mode: BackgroundMode) => void;
+   onSolidColorChange: (color: string) => void;
+   onGradientColorsChange: (colors: [string, string]) => void;
+   onMultiColorsChange: (colors: [string, string]) => void;
    onGenerateBackgrounds: () => void;
    onBackToBackgrounds: () => void;
  }
```

#### 3-3. 내부 토큰 파싱 로직 전면 제거

```diff
- const freePrompt = stripBackgroundTokens(promptHint);
- const solidColor = extractHexColor(parseBackgroundToken(promptHint, 'SOLID')?.[0] ?? '', '#60a5fa');
- const gradientColors = (parseBackgroundToken(promptHint, 'GRADIENT') ?? [...]).slice(0, 2).map(...);
- const multiColors = (parseBackgroundToken(promptHint, 'MULTI') ?? [...]).slice(0, 2).map(...);
- const buildPromptForMode = (...) => { ... };
- const setPromptWithToken = (...) => { ... };
```

#### 3-4. 컬러 피커 onChange → 전용 핸들러 호출로 교체

```diff
- <input type="color" value={solidColor} onChange={(e) => setPromptWithToken('solid', freePrompt, [e.target.value])} />
+ <input type="color" value={solidColor} onChange={(e) => onSolidColorChange(e.target.value)} />

- const next = [...gradientColors]; next[index] = e.target.value; setPromptWithToken('gradient', freePrompt, next);
+ const next = [...gradientColors] as [string, string]; next[index] = e.target.value; onGradientColorsChange(next);

- const next = [...multiColors]; next[index] = e.target.value; setPromptWithToken('pastel', freePrompt, next);
+ const next = [...multiColors] as [string, string]; next[index] = e.target.value; onMultiColorsChange(next);
```

#### 3-5. textarea → 순수 텍스트 직접 바인딩

```diff
- <textarea value={freePrompt} onChange={(e) => setPromptWithToken(backgroundMode, e.target.value)} />
+ <textarea value={promptHint} onChange={(e) => onPromptHintChange(e.target.value)} />
```

#### 3-6. 모드 전환 핸들러 단순화

```diff
  const handleModeSelect = (mode: BackgroundMode) => {
    onBackgroundModeChange(mode);
-   setPromptWithToken(mode, freePrompt);  // 토큰 삽입 제거
  };
```

---

## 4. 수정 후 데이터 흐름

```
사용자 컬러 피커 조작
  ↓
BackgroundOptionsSection.tsx
  onSolidColorChange(color) 호출
  ↓
App.tsx: handleSolidColorChange(color)
  suspendInitialBackgroundSyncRef.current = false
  setBackgroundColorDraft(prev => ({ ...prev, solid: [color] }))
  ↓
useEffect [backgroundMode, promptHint, projectData, backgroundColorDraft]
  buildInitialBackgroundCandidate(..., backgroundColorDraft)
  setBackgroundCandidates([preview])
  setSelectedBackgroundId(preview.id)
  ↓
EditorCanvas: background={selectedBackground}  ✅ 즉시 반영
```

---

## 5. 팀원 기존 수정 현황 (색상 기본값)

아래 파일들은 팀원이 이미 수정 완료. 추가 변경 불필요.

| 파일 | 변경 내용 | 상태 |
|------|-----------|------|
| `backgroundGeneration.ts` (142줄) | gradient 기본값 `#93c5fd,#1d4ed8` → `#ffffff,#2f2f2f` | ✅ 적용됨 |
| `backgroundGeneration.ts` (182줄) | multi 기본값 `#c4b5fd,#93c5fd` → `#ffffff,#1f1f1f` | ✅ 적용됨 |
| `backgroundStyle.ts` (19-20줄) | fallback `#FF4757,#4A90E2` → `#ffffff,#2f2f2f` | ✅ 적용됨 |
| `initPage/constants/design.js` (47-48줄) | `startColor,endColor` 기본값 동일 변경 | ✅ 적용됨 |
| `initialBackground.ts` (79-86줄) | endColor fallback `#2f2f2f` | ✅ 적용됨 |

---

## 6. 검증 체크리스트

- [ ] 단색 모드: 컬러 피커 조작 시 캔버스 즉시 반영
- [ ] 그라데이션 모드: 2색 피커 조작 시 캔버스 즉시 반영
- [ ] 다중색 모드: 2색 피커 조작 시 캔버스 즉시 반영
- [ ] 모드 전환 시 각 모드의 색상 유지
- [ ] 프롬프트 textarea 한글 입력 정상 (공백 손실 없음)
- [ ] AI 배경 생성 정상 동작
