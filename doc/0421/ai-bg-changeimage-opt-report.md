# AI 배경 생성 `_opt` 비동기 병렬 전환 — 구현 보고서

- 작성일: 2026-04-21
- 브랜치: `feature/United1_9_patch`
- 연관 스펙: `.omc/specs/deep-interview-ai-bg-changeimage-opt.md`
- Deep Interview ID: `ai-bg-opt-2026-04-21`

---

## 1. 목적

editing 모듈의 **AI 배경 생성** 플로우를 기존 단일 `/model/changeimage` 호출에서,
`POST /addhelper/model/changeimagecomfyui_opt/jobs` 비동기 API를 `opt=0/1/2` 세 값으로 **병렬 호출**하는 구조로 전환한다.

- 한 번의 사용자 클릭으로 **3개의 배경 샘플을 동시 생성**해 후보 카드로 제공
- 생성 동안 editing 화면 전역에 **클릭 차단 오버레이**를 띄워 중복 클릭 방지
- 응답 포맷이 blob → **JSON(`image_base64` + `content_type`)** 으로 바뀐 점에 맞춰 data URL로 복원

---

## 2. 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `react/src/server/api/modelApi.js` | `changeImageComfyUIOptAsync({...})` 신규 함수 추가 (JSON 결과 → data URL 변환) |
| `react/src/server/api/callApi.js` | `generateBackground(options)`에 `opt` 파라미터 추가 및 새 API 사용으로 변경 |
| `react/src/modules/editing/App.tsx` | `isGeneratingAiBackground` 상태 추가, `handleGenerateBackgrounds` Case B를 `Promise.allSettled` 3병렬로 재작성, editing 전역 차단 오버레이 JSX 추가 |

검증: `npx tsc --noEmit` **EXIT=0** (타입 에러 없음).

---

## 3. `modelApi.changeImageComfyUIOptAsync`

### 시그니처

```js
async changeImageComfyUIOptAsync({
  opt,
  prompt = '',
  positive_prompt = '',
  negative_prompt = '',
  image_base64,
  strength = 0.9,
} = {})
```

### 요청 바디

```json
{
  "opt": 0 | 1 | 2,
  "prompt": "...",
  "positive_prompt": "",
  "negative_prompt": "...",
  "image_base64": "<prefix 제거된 base64>",
  "strength": 0.9
}
```

- `stripBase64Prefix`로 `data:image/xxx;base64,` 프리픽스 제거 후 전송
- `strength=0.9` — 백엔드 `changeimage.json:18 denoise=0.9` 기본값과 일치

### 플로우

1. `POST /model/changeimagecomfyui_opt/jobs` (createJob timeout 2분) → `job_id`
2. `pollJobStatus('/model/changeimagecomfyui_opt/jobs/{id}', 10분)` — 기존 공용 유틸 재사용
3. `GET /model/changeimagecomfyui_opt/jobs/{id}/result` **JSON 응답**
4. `const dataUrl = \`data:${content_type};base64,${image_base64}\`` 형태로 data URL 조합
5. UI 호환을 위해 data URL을 **`blobUrl` 필드에 담아 반환** (기존 `buildAiCandidate`가 `blobUrl`을 그대로 `<img src>`에 사용)

### 반환값

```ts
// 성공
{ ok: true, apiUrl, blobUrl, positivePrompt, negativePrompt, contentType }
// 실패
{ ok: false, apiUrl, error }
```

### 에러 처리

- `job_id` 누락 / 폴링 실패 / 409(진행 중) / 500(서버 오류, `statusMsg` 우선) / 기타 네트워크 오류 모두 `{ ok:false, error }`로 정규화
- 기존 `fetchJobResult`(blob 전용)를 **우회**하고 result 조회를 이 함수 내부에서 직접 수행

### 기존 `changeImageComfyuiOpt`

기존에 있던 `changeImageComfyuiOpt` (blob 반환 버전)는 호출부가 없으므로 그대로 남겨 두었습니다. 필요 시 정리 대상.

---

## 4. `callApi.generateBackground` 변경

### Before

```js
const result = imageBase64
  ? await modelApi.changeImage(prompt, imageBase64, 0.9, '', negativePrompt)
  : await modelApi.generateImage(prompt, '', negativePrompt);
```

### After

```js
const { customPrompt = '', imageBase64 = '', industry = '', opt = 0 } = options;
...
const result = imageBase64
  ? await modelApi.changeImageComfyUIOptAsync({
      opt,
      prompt,
      positive_prompt: '',
      negative_prompt: negativePrompt,
      image_base64: imageBase64,
      strength: 0.9,
    })
  : await modelApi.generateImage(prompt, '', negativePrompt);
```

- JSDoc `@param`에 `opt?: number` 추가, `@returns` 타입 명시 (TS 추론이 호출부에서 `blobUrl`을 인지하도록)
- 로그에 `opt=` 값 포함해 병렬 3개의 성공/실패를 분리 추적

---

## 5. `App.tsx` 변경

### 5.1 상태 추가

```tsx
const [isGeneratingAiBackground, setIsGeneratingAiBackground] = useState(false);
```

### 5.2 `handleGenerateBackgrounds` Case B 재작성

- 캡처 루트를 `captureRef` → **`mainPreviewRef`** 로 변경 (스펙: `workspace__main-preview` div를 html2canvas)
- 캡처는 **1회만** 수행하고 동일 base64를 3개 job에 공유
- `Promise.allSettled([opt=0, opt=1, opt=2])` — 모두 완료될 때까지 대기

```tsx
setIsGeneratingAiBackground(true);
try {
  const captureRoot = mainPreviewRef.current;
  if (!captureRoot) throw new Error('캡처 대상 캔버스를 찾을 수 없습니다.');
  const imageBase64 = await captureElementAsDataUrl(captureRoot);

  const optValues = [0, 1, 2] as const;
  const settled = await Promise.allSettled(
    optValues.map((opt) =>
      callApi.generateBackground({ customPrompt: promptKo, imageBase64, opt }),
    ),
  );

  const succeeded: BackgroundCandidate[] = [];
  const errors: string[] = [];
  settled.forEach((entry, idx) => {
    if (entry.status === 'fulfilled' && entry.value?.ok && entry.value.blobUrl) {
      succeeded.push(buildAiCandidate(entry.value, idx));
    } else {
      const reason = entry.status === 'fulfilled'
        ? entry.value?.error ?? '알 수 없는 오류'
        : entry.reason instanceof Error ? entry.reason.message : String(entry.reason);
      errors.push(`opt=${optValues[idx]}: ${reason}`);
    }
  });

  if (succeeded.length === 0) {
    window.alert(`AI 배경 생성 실패 (3개 모두 실패):\n${errors.join('\n')}`);
    return;
  }

  setBackgroundCandidates(succeeded);
  setSelectedBackgroundId(succeeded[0].id);
} finally {
  setIsGeneratingAiBackground(false);
}
```

#### 결과 처리 규칙 (AC 반영)

| 상황 | 처리 |
|------|------|
| 1개 이상 성공 | 성공한 것만 `backgroundCandidates` 교체, alert 없이 오버레이 해제 |
| 3개 모두 실패 | `window.alert(errors.join('\n'))` 후 오버레이 해제 |
| 모든 경로 | 내부 `try/finally`로 **`setIsGeneratingAiBackground(false)` 보장** |

### 5.3 editing 전역 오버레이

`app-shell` 루트 말단에 조건부 렌더:

```tsx
{isGeneratingAiBackground && (
  <div className="ai-bg-overlay" role="status" aria-live="polite" aria-busy="true" ...>
    <style>{ /* keyframes + 클래스 스타일 */ }</style>
    <div className="ai-bg-overlay__box">
      <div className="ai-bg-overlay__spinner" aria-hidden />
      <p className="ai-bg-overlay__label">AI 배경 생성 중...</p>
      <p className="ai-bg-overlay__hint">3개 샘플을 동시에 만들고 있어요. 잠시만 기다려 주세요.</p>
    </div>
  </div>
)}
```

- `position: fixed; inset: 0; z-index: 9999` — editing 모듈 내부의 모든 클릭/입력을 물리적으로 차단
- `pointer-events: auto; cursor: wait` — 아래 UI로 이벤트 전파 차단
- 내부 `<style>` 태그로 `@keyframes ai-bg-overlay-spin` 정의 → 외부 CSS 파일 수정 불필요
- **editing 루트 내부**에 위치하므로 다른 라우트(onboarding / ad-design / result)에는 영향 없음

---

## 6. Acceptance Criteria 매핑

| AC | 상태 | 근거 |
|----|------|------|
| `modelApi.changeImageComfyUIOptAsync(...)` 추가 및 JSON→dataURL 변환 | Done | `modelApi.js:910-1006` |
| `opt=0/1/2` `Promise.allSettled` 3병렬 | Done | `App.tsx:506-515` |
| 호출 시작 시 전역 오버레이 표시 + 클릭 차단 | Done | `App.tsx:1020-1080`, `pointer-events:auto` |
| 3개 완료 전 오버레이 해제 없음 | Done | `Promise.allSettled` 후에만 `setIsGeneratingAiBackground(false)` 도달 |
| 1개 이상 성공 시 성공분만 push + 조용히 해제 | Done | `App.tsx:535-547` |
| 3개 실패 시 `window.alert` 후 해제 | Done | `App.tsx:535-542` |
| try/catch + finally overlay 복귀 보장 | Done | 이중 try/finally |
| 다른 라우트 영향 없음 | Done | 오버레이는 editing `app-shell` 내부에만 렌더 |
| `mainPreviewRef` 1회 캡처 후 3개 job 공유 | Done | `imageBase64` 변수를 3개 호출이 공유 |
| `callApi.js` 호출부가 새 함수 사용 | Done | `callApi.js:309-320` |

---

## 7. 검증

- **타입 검사**: `npx tsc --noEmit` → exit 0
- **수동 확인 권장 항목**
  - [ ] 편집 진입 → AI 배경 생성 버튼 클릭 → 오버레이 표시 + 다른 UI 클릭 안 됨
  - [ ] 3개 모두 성공 시 후보 3장이 한꺼번에 나타나고 첫 번째가 선택됨
  - [ ] 일부 실패 시 성공한 것만 보이며 alert 없음
  - [ ] 모두 실패 시 alert 표시 + 오버레이 해제
  - [ ] 생성 중 창 이동(onboarding/ad-design/result)에서는 오버레이 미표시

---

## 8. 후속 정리(선택)

- `modelApi.changeImageComfyuiOpt` (blob 반환, 미사용) 제거 가능
- `callApi.js`의 `generateBackground` sync fallback(`modelApi.generateImage`)도 `_opt`로 통합할지 검토 필요
- 오버레이 CSS를 `styles/global.css`로 이전하면 재사용성 향상
