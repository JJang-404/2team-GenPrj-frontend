# Editing AI 이미지 변경 연동 정리

작성일: 2026-04-22

## 결론

`2team-GenPrj-test/2team-GenPrj-test`의 이미지 변경 UI에서 쓰는 시스템은 `2team-GenPrj-frontend`의 editing 화면에서도 같은 백엔드(`2team-GenPrj-backend`)를 기준으로 동작할 수 있다.

단, UI를 그대로 가져오는 방식이 아니라 frontend의 editing UI를 유지하고, 내부 동작만 test의 `changeimagecomfyui_opt` job 방식으로 맞추는 구조가 적합하다. 현재 frontend editing에는 이 구조가 이미 상당 부분 들어와 있다.

- test: 사용자가 직접 업로드/붙여넣기한 이미지를 `image_base64`로 보낸다.
- frontend editing: 현재 편집 캔버스(`mainPreviewRef`)를 캡처해서 `image_base64`로 보낸다.
- 둘 다 최종 백엔드는 `/addhelper/model/changeimagecomfyui_opt/jobs`를 호출하고, `opt=0/1/2`로 프롬프트 조합 방식을 바꾼다.

## 현재 test 동작

대상 파일:

- `2team-GenPrj-test/2team-GenPrj-test/src/pages/ImagePrompt/ImagePrompt.jsx`
- `2team-GenPrj-test/2team-GenPrj-test/src/api/modelApi.js`

test의 이미지 변경 UI는 아래 입력을 받는다.

| UI 입력 | API 필드 | 설명 |
| --- | --- | --- |
| 기본 프롬프트 | `prompt` | 사용자의 자연어 요청 |
| 포지티브 프롬프트 | `positive_prompt` | 넣고 싶은 요소, 스타일, 품질 조건 |
| 네거티브 프롬프트 | `negative_prompt` | 빼고 싶은 요소, 품질 저하 조건 |
| 업로드/붙여넣기 이미지 | `image_base64` | 변경 기준 이미지 |
| 변환 강도 | `strength` | ComfyUI denoise 강도 |
| 옵션 탭 | `opt` | 백엔드 프롬프트 조합 방식 |

이미지 변경 버튼을 누르면:

1. 업로드 이미지 또는 붙여넣기 이미지를 Data URI/base64로 준비한다.
2. `modelApi.changeImageComfyuiOpt(opt, prompt, imageBase64, strength, positivePrompt, negativePrompt)`를 호출한다.
3. 프론트 API 래퍼가 `POST /model/changeimagecomfyui_opt/jobs`를 보낸다.
4. `GET /model/changeimagecomfyui_opt/jobs/{job_id}`를 폴링한다.
5. 완료되면 `GET /model/changeimagecomfyui_opt/jobs/{job_id}/result`에서 이미지 blob을 받는다.

백엔드 prefix까지 포함하면 실제 경로는 `/addhelper/model/changeimagecomfyui_opt/jobs`이다.

## 현재 frontend editing 동작

대상 파일:

- `2team-GenPrj-frontend/react/src/modules/editing/App.tsx`
- `2team-GenPrj-frontend/react/src/modules/editing/components/sidebar/BackgroundOptionsSection.tsx`
- `2team-GenPrj-frontend/react/src/server/api/callApi.js`
- `2team-GenPrj-frontend/react/src/server/api/modelApi.js`

editing UI에서는 사이드바의 `배경 생성 옵션 > AI 이미지 생성`이 test의 이미지 변경 기능과 대응된다.

현재 흐름:

1. 사용자가 `AI 이미지 생성 프롬프트` textarea에 입력한다.
2. `AI 배경 생성` 버튼을 누른다.
3. `App.tsx`의 `handleGenerateBackgrounds()`가 실행된다.
4. `mainPreviewRef` 영역을 캡처해서 현재 포스터 구도 이미지를 만든다.
5. 같은 캡처 이미지를 `opt=0`, `opt=1`, `opt=2`에 병렬로 보낸다.
6. 성공한 결과를 `BackgroundCandidate[]`로 만들어 우측 배경 후보 카드에 표시한다.
7. 사용자가 후보를 선택하면 editing의 배경으로 적용된다.

즉, frontend editing은 test처럼 사용자가 별도 이미지를 업로드하는 것이 아니라, 현재 편집 화면 자체를 기준 이미지로 사용한다. 이 차이가 UI 관점에서 더 자연스럽다.

## 프롬프트 매핑

질문한 “test의 기본 프롬프트는 frontend editing의 AI 이미지 생성의 사용자 입력 프롬프트가 되는가?”에 대한 답은 “그렇게 매핑하는 것이 맞고, 현재도 그 방향으로 구현되어 있다”이다.

| test | frontend editing | 백엔드 |
| --- | --- | --- |
| 기본 프롬프트 `promptText` | `promptHint` textarea | `prompt` |
| 포지티브 프롬프트 `positivePromptText` | 현재 UI에는 없음 | `positive_prompt` |
| 네거티브 프롬프트 `negativePromptText` | 현재 UI에는 없음 | `negative_prompt` |
| 업로드/붙여넣기 이미지 | editing 캔버스 캡처 이미지 | `image_base64` |
| strength slider | 현재 고정값 | `strength` |
| opt 탭 0/1/2 | 내부에서 0/1/2 병렬 실행 | `opt` |

frontend의 `callApi.generateBackground()`는 현재 다음처럼 보낸다.

```js
modelApi.changeImageComfyUIOptAsync({
  opt,
  prompt,
  positive_prompt: '',
  negative_prompt: '',
  image_base64: imageBase64,
  strength: 0.9,
})
```

따라서 frontend editing에서 사용자가 입력한 `AI 이미지 생성 프롬프트`는 test의 `기본 프롬프트`와 같은 역할을 한다.

## Positive / Negative는 어떻게 들어가는가

현재 frontend editing에서는 positive/negative를 사용자가 직접 입력하지 않는다. 빈 문자열로 백엔드에 전달된다.

백엔드는 `/addhelper/model/changeimagecomfyui_opt/jobs` 요청을 받으면 `_build_comfyui_prompt_bundle_opt()`를 통해 `OpenAiJob.build_prompt_dual_prompt_opt()`를 호출한다. 이때 들어가는 값은:

```json
{
  "opt": 0,
  "prompt": "frontend AI 이미지 생성 textarea 입력값",
  "positive_prompt": "",
  "negative_prompt": "",
  "image_base64": "캡처 이미지 base64",
  "strength": 0.9
}
```

백엔드 처리 의미:

- `prompt`: 사용자 의도. 예: “고급 카페 느낌의 따뜻한 우드 배경”
- `positive_prompt`: 프론트가 명시로 보내면 우선 반영될 수 있는 긍정 조건
- `negative_prompt`: 프론트가 명시로 보내면 우선 반영될 수 있는 제외 조건
- 둘 다 비어 있으면 백엔드 LLM 프롬프트 빌더가 `prompt`와 opt 정책을 기준으로 Stable Diffusion용 positive/negative를 생성한다.

즉 frontend editing의 기본 작동은 “사용자는 하나의 자연어 프롬프트만 입력하고, positive/negative는 백엔드가 생성”하는 방식이다.

## opt 의미

백엔드와 test 설명 기준으로 opt는 프롬프트 조합 전략이다.

| opt | 의미 |
| --- | --- |
| `0` | `user_prompt`, `positive_prompt`, `negative_prompt`, 시스템 프롬프트를 함께 고려 |
| `1` | `user_prompt` 중심으로 LLM 처리, 파라미터 positive/negative와 조합 |
| `2` | 시스템 프롬프트 없이 `user_prompt` 중심 처리, 파라미터 positive/negative와 조합 |

frontend editing에서는 사용자가 opt를 직접 고르지 않고, 0/1/2를 병렬 실행해서 결과 후보 3개를 만든다. UX상 이 방식이 test의 탭 방식보다 editing 화면에 더 적합하다.

## 작동 형식 제안

frontend editing의 최종 작동 형식은 아래가 적합하다.

1. 사용자는 frontend editing UI에서 `AI 이미지 생성` 모드를 선택한다.
2. `AI 이미지 생성 프롬프트`에 자연어 요청을 입력한다.
3. `AI 배경 생성` 클릭 시 현재 포스터 미리보기를 캡처한다.
4. 캡처 이미지를 기준으로 `/addhelper/model/changeimagecomfyui_opt/jobs`를 `opt=0/1/2` 병렬 호출한다.
5. 각 요청은 `prompt=사용자 입력`, `positive_prompt=''`, `negative_prompt=''`, `strength=0.9`를 기본값으로 보낸다.
6. 백엔드가 opt별 positive/negative를 생성하고 ComfyUI `changeimage.json` 워크플로우로 이미지를 변경한다.
7. 성공한 결과만 우측 배경 후보 카드로 보여준다.
8. 후보 선택 시 editing canvas의 배경으로 적용한다.

## 수정 방향

### 1. frontend editing의 현재 구현을 기준으로 정리

이미 `App.tsx`에는 AI 이미지 생성 시 `opt=0/1/2` 병렬 실행 흐름이 들어와 있다. 이 방향을 유지한다.

확인/정리 대상:

- `handleGenerateBackgrounds()`의 AI 이미지 생성 분기
- `callApi.generateBackground()`
- `modelApi.changeImageComfyUIOptAsync()`

### 2. positive/negative UI 정책 결정

권장 기본안은 positive/negative 입력칸을 노출하지 않는 것이다.

이유:

- frontend editing은 일반 사용자가 포스터 배경을 만드는 화면이다.
- test의 positive/negative는 개발/검증용 성격이 강하다.
- 현재 백엔드가 빈 positive/negative를 받아도 LLM으로 생성한다.

필요하면 고급 옵션으로만 추가한다.

- 기본 textarea: `prompt`
- 고급 옵션 접기 영역: `positive_prompt`, `negative_prompt`
- 기본값은 빈 문자열
- 입력값이 있을 때만 백엔드에 전달

### 3. strength 정책 정리

test는 slider로 `strength`를 직접 조절한다. frontend editing은 현재 `strength: 0.9` 고정이다.

권장:

- 기본은 `0.9` 유지
- UI에 노출하지 않음
- 결과가 원본 구도에 너무 묶이면 `0.75~0.85`로 낮춰 비교
- 개발자 확인용으로만 임시 slider를 둘 수 있음

### 4. API 경로를 job 방식으로 통일

frontend editing은 긴 작업이므로 sync 엔드포인트보다 jobs 엔드포인트가 맞다.

사용할 경로:

- `POST /addhelper/model/changeimagecomfyui_opt/jobs`
- `GET /addhelper/model/changeimagecomfyui_opt/jobs/{job_id}`
- `GET /addhelper/model/changeimagecomfyui_opt/jobs/{job_id}/result`

피해야 할 방향:

- 오래 걸리는 AI 이미지 생성에서 sync API 직접 호출
- frontend의 `editing/utils/backgroundGeneration.ts`에 남아 있는 구형 `/model/changeimage`, `/model/generate` 직접 fetch 흐름을 AI 이미지 생성 메인 경로로 다시 사용하는 것

### 5. 결과 후보 메타데이터 보강

현재 frontend는 성공 이미지 blob만 후보 카드로 만든다. 디버깅과 품질 비교를 위해 후보에 아래 정보를 남기는 것이 좋다.

- `opt`
- 요청 `prompt`
- `strength`
- job result url 또는 apiUrl
- 실패한 opt별 error message

백엔드가 positive/negative 결과를 이미지 응답과 함께 주지 않는 구조라면, 프론트에서는 최소한 요청값과 opt만 저장한다.

## 최종 판단

동일 시스템으로 동작 가능하다. 매핑은 다음 한 줄로 정리된다.

`test 기본 프롬프트(promptText)` = `frontend editing AI 이미지 생성 프롬프트(promptHint)` = 백엔드 `prompt`

positive/negative는 frontend editing에서 기본적으로 직접 받지 않고 빈 값으로 넘긴다. 그러면 백엔드가 opt 정책에 따라 positive/negative를 생성해서 ComfyUI에 전달한다. 고급 사용자 제어가 필요할 때만 positive/negative 입력 UI를 추가하면 된다.
