# 저장 동작 분석

## 1. 지금 "전체 저장"이 실제로 동작하는 코드

- 저장 버튼 클릭:
  - `react/src/modules/editing/App.tsx:797`
  - `onClick={() => void handleFullSave()}`

- 실제 저장 함수:
  - `react/src/modules/editing/App.tsx:722`
  - `handleFullSave()` 내부에서 `mainPreviewRef.current`를 캡처함

```ts
const handleFullSave = async () => {
  if (!mainPreviewRef.current) return;
  setSaving(true);
  try {
    const dataUrl = await captureElementAsDataUrl(mainPreviewRef.current, 3);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${projectData?.storeName ?? 'design'}_full.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (saveError) {
    setError(saveError instanceof Error ? saveError.message : '이미지 저장에 실패했습니다.');
  } finally {
    setSaving(false);
  }
};
```

- 저장 대상 ref 연결:
  - `react/src/modules/editing/App.tsx:828`

```tsx
<div className="workspace__main-preview" ref={mainPreviewRef}>
  <EditorCanvas ... />
</div>
```

- 즉, 현재 저장은 `EditorCanvas` 자체가 아니라 바깥 래퍼인 `.workspace__main-preview` 전체를 캡처합니다.

## 2. 실제 캡처를 수행하는 코드

- 파일:
  - `react/src/modules/editing/utils/canvas.ts:22`

```ts
export async function captureElementAsDataUrl(root: HTMLElement, scale = 1.5) {
  await waitForImages(root);
  await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));

  const canvas = await html2canvas(root, {
    backgroundColor: null,
    scale,
    useCORS: true,
  });

  return canvas.toDataURL('image/png');
}
```

- 여기서는 전달받은 `root` DOM 전체를 `html2canvas`로 이미지화합니다.
- 따라서 어떤 DOM을 넘기느냐가 저장 결과를 결정합니다.

## 3. 왜 지금 흰 배경까지 같이 저장되는가

현재 `mainPreviewRef`는 아래 박스를 가리킵니다.

- `react/src/modules/editing/App.tsx:828`
- 대상: `.workspace__main-preview`

이 요소는 포스터 카드만 감싸는 순수 캔버스가 아니라, 흰 배경과 테두리를 가진 카드형 래퍼입니다.

- 공통 카드 스타일:
  - `react/src/modules/editing/styles/global.css:1313`

```css
.workspace__main-preview,
.workspace__choices,
.choice-card,
.empty-panel,
.callout {
  border: 1px solid #e2e8f0;
  border-radius: 28px;
  background: #ffffff;
}
```

- 추가 그림자:
  - `react/src/modules/editing/styles/global.css:1426`

```css
.workspace__main-preview {
  box-shadow: 0 30px 80px -40px rgba(15, 23, 42, 0.35);
}
```

또한 포스터 본체는 `EditorCanvas` 내부 구조입니다.

- `react/src/modules/editing/components/EditorCanvas.tsx:145`

```tsx
<div className={`editor-stage ${captureMode ? 'editor-stage--capture' : ''}`}>
  <div className="editor-stage__canvas" ...>
```

- 해당 본체 스타일:
  - `react/src/modules/editing/styles/global.css:1402`

```css
.editor-stage {
  padding: 18px;
}

.editor-stage__canvas {
  position: relative;
  width: min(100%, 580px);
  aspect-ratio: 3 / 4;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 26px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
  background: #f4f5f7;
}
```

정리하면:

- 저장 대상은 `.workspace__main-preview`
- 이 요소 자체가 `background: #ffffff`를 가짐
- 내부에 `.editor-stage`의 `padding: 18px`도 있음
- 그래서 포스터 바깥 여백/흰 카드 영역까지 함께 캡처됨

즉, 지금 저장 결과가 "포스터만"이 아니라 "포스터가 들어있는 흰색 카드 전체"로 나오는 것이 정상 동작입니다.

## 4. 포스터 부분만 저장하려면 어디를 저장 대상으로 바꿔야 하는가

핵심은 `mainPreviewRef`가 아니라 실제 포스터 본체인 `.editor-stage__canvas`를 캡처해야 한다는 점입니다.

현재 구조상 저장 대상 후보는 2가지입니다.

### 방법 A. `EditorCanvas` 내부의 `.editor-stage__canvas`에 ref를 직접 연결해서 저장

가장 직접적인 방법입니다.

- `EditorCanvas`에서 포스터 본체 div:
  - `react/src/modules/editing/components/EditorCanvas.tsx:146`

```tsx
<div
  className="editor-stage__canvas"
  ...
  ref={canvasRef}
>
```

하지만 지금 `canvasRef`는 내부 드래그/크기 계산용으로만 쓰고 있고, 부모 `App.tsx`에서 접근할 수 없습니다.

따라서 실제 수정 시에는 보통 아래 둘 중 하나가 필요합니다.

- `forwardRef` 또는 별도 prop으로 부모에서 `.editor-stage__canvas` DOM을 받기
- 저장 전용 ref를 하나 더 만들어 `.editor-stage__canvas`에 연결하기

그 다음 저장 코드를

```ts
captureElementAsDataUrl(mainPreviewRef.current, 3)
```

에서

```ts
captureElementAsDataUrl(posterCanvasRef.current, 3)
```

처럼 바꾸면 됩니다.

이렇게 하면 흰색 카드 바깥 영역은 빠지고 포스터 본체만 저장됩니다.

### 방법 B. 이미 숨겨둔 capture 전용 DOM을 저장 대상으로 사용

현재 파일 안에는 화면 밖에 숨겨둔 캡처용 DOM이 이미 있습니다.

- 선언:
  - `react/src/modules/editing/App.tsx:137`
- 렌더:
  - `react/src/modules/editing/App.tsx:810`

```tsx
<div className="capture-surface" aria-hidden="true">
  <div ref={captureRef}>
    <EditorCanvas
      elements={renderElements}
      background={null}
      selectedElementIds={[]}
      onSelect={() => {}}
      onChangeElement={(_id, _patch) => {}}
      captureMode
    />
  </div>
</div>
```

그리고 capture mode에서는 바깥 패딩과 캔버스 배경 일부를 제거합니다.

- `react/src/modules/editing/styles/global.css:1406`

```css
.editor-stage--capture {
  padding: 0;
}

.editor-stage--capture .editor-stage__canvas {
  box-shadow: none;
  background: transparent;
}
```

이 구조는 원래 "저장용 별도 렌더"에 더 가깝습니다.  
그런데 현재 `handleFullSave()`는 이 `captureRef`를 전혀 쓰지 않고 있습니다.

- 사용 현황:
  - `react/src/modules/editing/App.tsx:726`
  - 실제로는 `mainPreviewRef.current`만 캡처함

즉, 포스터만 저장하려면 이 숨겨진 캡처 전용 DOM을 제대로 활용하는 방향도 가능합니다.

다만 현재 상태 그대로는 `background={null}`이라 실제 선택한 배경까지 빠질 수 있으므로, 포스터 최종 결과를 그대로 저장하려면:

- `captureRef.current`를 캡처 대상으로 사용하고
- `EditorCanvas`에 실제 저장하고 싶은 배경(`selectedBackground`)을 넣을지 검토해야 합니다.

## 5. 가장 현실적인 수정 방향

현재 코드 기준으로는 아래 방향이 가장 명확합니다.

1. 저장 대상 DOM을 `.workspace__main-preview`에서 `.editor-stage__canvas`로 변경
2. 부모 `App.tsx`가 그 DOM ref를 받을 수 있게 `EditorCanvas` 쪽 ref 구조를 정리
3. `handleFullSave()`는 그 ref만 `captureElementAsDataUrl()`에 넘기기

이유:

- 지금 문제의 직접 원인이 저장 대상 DOM 선택이기 때문
- `html2canvas` 자체 문제라기보다 "무엇을 캡처하느냐" 문제에 가깝기 때문
- 포스터 외부 흰 카드 영역 제거 목적에는 가장 정확한 해결책이기 때문

## 6. 한 줄 결론

현재 흰 배경까지 저장되는 이유는 `handleFullSave()`가 포스터 본체가 아니라 흰색 카드 래퍼인 `.workspace__main-preview` 전체를 캡처하기 때문입니다.  
포스터 부분만 저장하려면 캡처 대상을 `.editor-stage__canvas` 같은 실제 포스터 본체 DOM으로 바꿔야 합니다.

## 수정사항

- 수정 파일:
  - `react/src/modules/editing/App.tsx`

- 변경 내용:
  - `handleFullSave()`에서 기존처럼 `mainPreviewRef.current` 전체를 캡처하지 않고,
    `mainPreviewRef.current` 내부의 `.editor-stage__canvas`만 찾아서 저장하도록 변경함
  - 이로 인해 흰색 카드 래퍼 배경과 바깥 여백은 저장 대상에서 제외됨

- 원복 가능하도록 남겨둔 코드:

```ts
// 기존 전체 래퍼 캡처 방식. 필요 시 이 줄로 원복 가능.
// const dataUrl = await captureElementAsDataUrl(mainPreviewRef.current, 3);
const posterCanvas = mainPreviewRef.current.querySelector('.editor-stage__canvas');
if (!(posterCanvas instanceof HTMLElement)) {
  throw new Error('포스터 저장 대상을 찾을 수 없습니다.');
}
const dataUrl = await captureElementAsDataUrl(posterCanvas, 3);
```

- 수정 의도:
  - 저장 로직은 그대로 `html2canvas` 기반을 유지
  - 저장 대상 DOM만 포스터 본체로 좁혀서, 포스터 외부 흰 배경이 함께 저장되지 않도록 조정

## 색상유지

### 지금 왜 색상이 초기화되는가

현재 배경 색상 상태는 모드별로 따로 저장되지 않고, `promptHint` 문자열 안에 들어가는 토큰으로만 관리됩니다.

- 관련 파일:
  - `react/src/modules/editing/components/sidebar/BackgroundOptionsSection.tsx`
  - `react/src/modules/editing/components/sidebar/backgroundTokens.ts`

현재 구조는 대략 아래 흐름입니다.

1. 현재 모드의 색상을 `promptHint`에서 읽음
2. 모드를 바꿀 때 `setPromptWithToken(mode, freePrompt)` 실행
3. 이때 `freePrompt = stripBackgroundTokens(promptHint)` 이므로 기존 `BG_SOLID`, `BG_GRADIENT`, `BG_MULTI` 토큰이 전부 제거됨
4. 새 모드 토큰만 다시 붙음

즉 예를 들어:

- 다중색에서 `BG_MULTI(#ffffff,#000000)` 설정
- 단색으로 이동
- `handleModeSelect('solid')`가 실행되면서 기존 `BG_MULTI(...)` 토큰이 제거됨
- 단색 기본 토큰만 남음
- 다시 다중색으로 돌아오면 `BG_MULTI(...)`가 이미 사라졌기 때문에 기본값으로 보이게 됨

핵심 원인 코드는 아래입니다.

```ts
const freePrompt = stripBackgroundTokens(promptHint);

const handleModeSelect = (mode: BackgroundMode) => {
  onBackgroundModeChange(mode);
  setPromptWithToken(mode, freePrompt);
};
```

그리고 토큰 제거 함수는 아래처럼 동작합니다.

```ts
export function stripBackgroundTokens(value: string) {
  return value.replace(/\s*BG_(?:SOLID|GRADIENT|MULTI)\([^)]*\)/g, '').trim();
}
```

### 유지하려면 어떻게 바꿔야 하는가

결론부터 말하면, 색상은 `promptHint` 문자열 하나에 의존하지 말고 모드별 상태로 분리해서 들고 있어야 합니다.

추천 구조는 아래와 같습니다.

```ts
const [backgroundDraft, setBackgroundDraft] = useState({
  solid: ['#60a5fa'],
  gradient: ['#93c5fd', '#1d4ed8'],
  pastel: ['#c4b5fd', '#93c5fd'],
});
```

이렇게 해두면:

- 단색에서 고른 색은 `backgroundDraft.solid`에 유지
- 그라데이션 색은 `backgroundDraft.gradient`에 유지
- 다중색 색은 `backgroundDraft.pastel`에 유지
- 모드를 왔다 갔다 해도 각 모드의 마지막 값이 살아 있음

### 실제 수정 방향

#### 1. `promptHint`는 프롬프트 텍스트 용도로만 두고, 색상은 별도 state로 분리

현재는 `BackgroundOptionsSection`이 `promptHint`에서 직접 색을 파싱합니다.

```ts
const solidColor = extractHexColor(parseBackgroundToken(promptHint, 'SOLID')?.[0] ?? '', '#60a5fa');
const gradientColors = (parseBackgroundToken(promptHint, 'GRADIENT') ?? ['#93c5fd', '#1d4ed8']) ...
const multiColors = (parseBackgroundToken(promptHint, 'MULTI') ?? ['#c4b5fd', '#93c5fd']) ...
```

이 부분을 바꾸려면:

- `App.tsx`에서 모드별 색상 state를 관리
- `BackgroundOptionsSection`에는 `solidColor`, `gradientColors`, `multiColors`를 prop으로 넘김
- 색상 변경 시 `promptHint`를 직접 덮어쓰지 말고 해당 모드 state만 갱신

#### 2. 모드 전환 시 다른 모드 색상은 절대 지우지 않기

현재 문제는 `stripBackgroundTokens()`가 모든 모드 토큰을 한 번에 지우기 때문에 발생합니다.

따라서 수정 시에는 아래 중 하나로 가야 합니다.

- 가장 권장:
  - 아예 색상 토큰 방식을 그만두고 state 분리
- 차선책:
  - `BG_SOLID`, `BG_GRADIENT`, `BG_MULTI`를 모두 유지하는 문자열 구조로 바꾸고, 현재 모드 토큰만 업데이트

하지만 차선책은 문자열 파싱이 더 복잡해지고 버그가 다시 생기기 쉬워서, state 분리가 더 안전합니다.

#### 3. 미리보기 생성 시에는 현재 모드 + 해당 모드 색상 state를 사용

현재 미리보기는 아래 effect로 갱신됩니다.

```ts
const preview = buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint);
setBackgroundCandidates([preview]);
```

여기서 `buildInitialBackgroundCandidate()`가 `promptHint`에서 색상 토큰을 읽지 않고, 별도 색상 state를 직접 받도록 바꾸면 됩니다.

예시 방향:

```ts
const preview = buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint, {
  solid: backgroundDraft.solid,
  gradient: backgroundDraft.gradient,
  pastel: backgroundDraft.pastel,
});
```

그리고 `buildInitialBackgroundCandidate()` 내부에서도

- `promptHint` 토큰 파싱 대신
- 전달받은 색상 state를 우선 사용하도록 바꾸면

모드 전환 후에도 이전에 고른 색이 유지됩니다.

### 가장 현실적인 수정 요약

이 문제를 제대로 해결하려면 아래처럼 수정하는 것이 가장 안정적입니다.

1. `App.tsx`에 모드별 색상 state 추가
2. `BackgroundOptionsSection`이 `promptHint`에서 색을 파싱하지 않도록 변경
3. 색상 input 변경 시 `promptHint`가 아니라 모드별 색상 state를 갱신
4. 모드 전환 시 색상 state는 건드리지 않고 `backgroundMode`만 변경
5. 배경 미리보기 생성 함수가 현재 모드의 색상 state를 사용하도록 변경

### 한 줄 결론

지금은 색상이 `promptHint` 문자열 안의 토큰으로만 관리되고, 모드 전환 시 다른 모드 토큰이 지워지기 때문에 초기화됩니다.  
유지하려면 단색/그라데이션/다중색 색상을 각각 별도 state로 분리해서 저장하도록 바꿔야 합니다.

## 수정사항_색

- 수정 파일:
  - `react/src/modules/editing/App.tsx`
  - `react/src/modules/editing/components/Sidebar.tsx`
  - `react/src/modules/editing/components/sidebar/BackgroundOptionsSection.tsx`
  - `react/src/modules/editing/utils/initialBackground.ts`

- 적용 내용:
  - `App.tsx`에 모드별 색상 state `backgroundColorDraft`를 추가했습니다.
  - `BackgroundOptionsSection`은 더 이상 `promptHint`에서 `BG_SOLID`, `BG_GRADIENT`, `BG_MULTI`를 파싱하지 않고, 부모에서 받은 색상 state를 그대로 사용합니다.
  - 색상 input 변경 시 `promptHint`가 아니라 `backgroundColorDraft`만 갱신하도록 바꿨습니다.
  - 모드 전환 시 색상 state는 유지되고, `backgroundMode`와 자유 프롬프트만 바뀌도록 조정했습니다.
  - 배경 미리보기 생성 함수 `buildInitialBackgroundCandidate()`가 현재 모드의 색상 state를 우선 사용하도록 바꿨습니다.
  - 단색/그라데이션/다중색 후보 생성 시에는 현재 색상 state를 임시 토큰 문자열로 합성해서 기존 `generateBackgrounds()` 흐름은 그대로 유지했습니다.

- 원복 가능하도록 남겨둔 기존 코드:
  - `App.tsx`

```ts
// 기존 토큰 기반 초기화 방식. 필요 시 이 줄로 원복 가능.
// setPromptHint(initPromptHint);

// 기존 promptHint 직접 사용 방식. 필요 시 아래 줄로 원복 가능.
// promptKo: buildBackgroundPrompt(projectData, selectedTemplate, promptKo, promptHint),
```

  - `BackgroundOptionsSection.tsx`

```ts
// 기존 promptHint 토큰 파싱/주입 방식. 필요 시 아래 로직으로 원복 가능.
// const solidColor = extractHexColor(parseBackgroundToken(promptHint, 'SOLID')?.[0] ?? '', '#60a5fa');
// const gradientColors = (parseBackgroundToken(promptHint, 'GRADIENT') ?? ['#93c5fd', '#1d4ed8'])
//   .slice(0, 2)
//   .map((color) => extractHexColor(color, '#93c5fd'));
// const multiColors = (parseBackgroundToken(promptHint, 'MULTI') ?? ['#c4b5fd', '#93c5fd'])
//   .slice(0, 2)
//   .map((color) => extractHexColor(color, '#93c5fd'));
// const buildPromptForMode = (mode: BackgroundMode, basePrompt: string, overrides?: string[]) => {
//   if (mode === 'solid') {
//     return withBackgroundToken(basePrompt, `BG_SOLID(${overrides?.[0] ?? solidColor})`);
//   }
//   if (mode === 'gradient') {
//     const colors = overrides?.length ? overrides : gradientColors;
//     return withBackgroundToken(basePrompt, `BG_GRADIENT(${colors.join(',')})`);
//   }
//   if (mode === 'pastel') {
//     const colors = overrides?.length ? overrides : multiColors;
//     return withBackgroundToken(basePrompt, `BG_MULTI(${colors.join(',')})`);
//   }
//   return basePrompt;
// };
// const setPromptWithToken = (mode: BackgroundMode, basePrompt: string, colors?: string[]) => {
//   onPromptHintChange(buildPromptForMode(mode, basePrompt, colors));
// };
```

  - `initialBackground.ts`

```ts
// 기존 promptHint 토큰 파싱 방식. 필요 시 이 값들을 다시 우선 사용하도록 원복 가능.
const tokenSolid = extractBackgroundToken(promptHint, 'SOLID')?.[0];
const tokenGradient = extractBackgroundToken(promptHint, 'GRADIENT') ?? [];
const tokenMulti = extractBackgroundToken(promptHint, 'MULTI') ?? [];
```

- 기대 결과:
  - 다중색에서 `#ffffff`, `#000000`을 고른 뒤 단색으로 갔다가 다시 다중색으로 돌아와도 기존 다중색 값이 유지됩니다.
  - 그라데이션과 단색도 각각 마지막으로 선택한 색을 독립적으로 유지합니다.

- 보완 수정:
  - 색상 input 첫 조작 시 바로 미리보기가 안 움직이던 문제는, 색상 변경 콜백에서 `suspendInitialBackgroundSyncRef.current = false`를 먼저 내려서 해결했습니다.
  - 그라데이션/다중색에 처음 붉은빛이 섞이던 문제는, 초기 fallback 색상을 `#FF4757 / #4A90E2`가 아니라 기존 UI 기본색
    `gradient: ['#93c5fd', '#1d4ed8']`, `pastel: ['#c4b5fd', '#93c5fd']`, `solid: ['#60a5fa']`
    기준으로 바꿔서 해결했습니다.
