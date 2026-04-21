# AI 배경 생성 `_opt` 연동 오류 수정 — 후속 보고서

- 작성일: 2026-04-21
- 선행 보고서: `ai-bg-changeimage-opt-report.md`
- 대상 범위: **frontend** 수정만 (`2team-GenPrj-frontend`)

---

## 1. 수정 배경

선행 보고서에서 `_opt` 비동기 병렬 전환을 완료했으나, dev 환경(`http://localhost:8000`)에서 실제 'AI 배경 생성' 버튼을 누르면 아래 세 가지 연동 오류가 연속으로 드러났다.

1. **사용자 사이드바 입력이 유실됨** — `customPrompt`에 사용되는 state가 항상 빈 문자열이었음
2. **프롬프트 필드 역할 오용** — 프론트가 영어 UNIVERSAL 템플릿을 `prompt`에 끼워 넣고 `negative_prompt`에도 별도 UNIVERSAL 네거티브를 주입하고 있었음. 백엔드 LLM 분기(opt=0/1/2) 관점에서 일관성이 없었음
3. **`/result` 응답 포맷 미스매치** — 프론트는 JSON(`{image_base64, content_type}`) 파싱을 기대했으나 백엔드는 **raw 이미지 바이트**를 반환. 폴링이 `done`까지 성공한 뒤에도 alert: "응답에 image_base64가 없습니다"가 3개 opt 모두에서 발생

---

## 2. 백엔드 opt 시맨틱 (재확인)

프론트 수정 방향을 결정하기 위해 백엔드 실제 구현을 확인한 결과는 아래와 같다 (참고용, 프론트는 수정 안 함).

| opt | LLM 입력 | 시스템 프롬프트 | 최종 positive/negative 출처 |
|-----|----------|----------------|-----------------------------|
| 0 | `user_prompt` + `positive_prompt` + `negative_prompt` 모두 | 사용 | LLM이 재생성 |
| 1 | `user_prompt` 만 | 사용 | `_concat_prompt(파라미터_positive, LLM_positive)` |
| 2 | `user_prompt` 만 | **미사용** | `_concat_prompt(파라미터_positive, LLM_positive)` |

결정: **프론트는 `prompt`에 사용자 의도만 전달**. `positive_prompt`/`negative_prompt`는 빈 문자열. 백엔드 LLM이 opt별로 알아서 SD용 positive/negative를 생성.

---

## 3. 변경 파일 (frontend)

| 파일 | 변경 내용 |
|------|-----------|
| `react/src/modules/editing/App.tsx` | `handleGenerateBackgrounds` Case B의 `customPrompt` 소스를 `promptKo` → `promptHint`로 교체 |
| `react/src/server/api/callApi.js` | UNIVERSAL 템플릿 import 제거, `_buildBackgroundPrompt` / `_buildBackgroundNegativePrompt` 헬퍼 2개 삭제, `generateBackground` 본문을 "사용자 입력을 `prompt`로 그대로 전달 + positive/negative 빈 값" 로 단순화 |
| `react/src/server/api/modelApi.js` | `changeImageComfyUIOptAsync`의 result 조회 블록(40줄)을 기존 async 패턴(`this.fetchJobResult(resultPath)` — blob + `URL.createObjectURL`)로 교체 |

검증: `npx tsc --noEmit` **EXIT=0**.

---

## 4. 수정 상세

### 4.1 App.tsx — 사용자 입력 배선 교정

사이드바 textarea(`BackgroundOptionsSection.tsx`)는 `promptHint` state에 바인딩되어 있으나, `handleGenerateBackgrounds` Case B는 `promptKo`를 읽고 있었다. `promptKo`의 setter(`setPromptKo`)가 코드 내 어디에서도 호출되지 않아 항상 `''`.

```diff
 const optValues = [0, 1, 2] as const;
 const settled = await Promise.allSettled(
   optValues.map((opt) =>
     callApi.generateBackground({
-      customPrompt: promptKo,
+      customPrompt: promptHint,
       imageBase64,
       opt,
     }),
   ),
 );
```

> `promptKo` state 자체는 Case A(단색/그라데이션 로컬 모드)에서 여전히 참조되므로 제거하지 않았다. 별개 정리 대상.

### 4.2 callApi.js — UNIVERSAL 템플릿 제거 + payload 단순화

**Import 제거**
```diff
-import { 
-  SCENE_PROMPTS, 
-  COFFEE_RELATED_KEYWORDS,
-  createUniversalPositivePrompt,
-  getUniversalNegativePrompt
-} from '../../modules/editing/constants/prompts';
```

**헬퍼 2개 삭제**: `_buildBackgroundPrompt`, `_buildBackgroundNegativePrompt` — 둘 다 UNIVERSAL 템플릿을 조립하는 역할이었고, 새 설계("프론트는 prompt만")에서 불필요.

**`generateBackground` 본문 교체**
```js
async generateBackground(options = {}) {
  const { customPrompt = '', imageBase64 = '', opt = 0 } = options;
  const prompt = (customPrompt || '').trim();

  const result = imageBase64
    ? await modelApi.changeImageComfyUIOptAsync({
        opt,
        prompt,
        positive_prompt: '',
        negative_prompt: '',
        image_base64: imageBase64,
        strength: 0.9,
      })
    : await modelApi.generateImage(prompt, '', '');

  return { ...result, prompt };
}
```

> 결과 객체에서 `negativePrompt` 필드를 제거했다. 더 이상 프론트가 조립한 값이 없어 반환할 의미가 없다.

### 4.3 modelApi.js — `/result` 응답을 blob으로 받기

백엔드 `_build_job_result_response`는 모든 async job에 대해 동일하게 `Response(content=bytes, media_type=content_type)`로 raw 바이트를 반환한다. 선행 스펙의 "JSON 응답" 기술이 실제 구현과 달랐다.

기존 async 엔드포인트(`_makeBackgroundImageOllamaAsync`, `_generateImageAsync` 등)는 전부 `fetchJobResult(resultPath)` → `responseType:'blob'` + `URL.createObjectURL` 패턴을 쓴다. `_opt`만 예외였다.

```diff
 const resultPath = `/model/changeimagecomfyui_opt/jobs/${jobId}/result`;
-try {
-  const resultResponse = await this.apiClient.get(resultPath, { timeout: 60000 });
-  const data = resultResponse.data || {};
-  const contentType = data.content_type || 'image/png';
-  const imageBase64Result = data.image_base64 || '';
-  if (!imageBase64Result) {
-    return {
-      ok: false,
-      apiUrl: this.buildUrl(resultPath),
-      error: '응답에 image_base64가 없습니다.',
-    };
-  }
-  const dataUrl = `data:${contentType};base64,${imageBase64Result}`;
-  return {
-    ok: true,
-    apiUrl: this.buildUrl(resultPath),
-    blobUrl: dataUrl,
-    positivePrompt: data.positive_prompt,
-    negativePrompt: data.negative_prompt,
-    contentType,
-  };
-} catch (error) {
-  if (axios.isAxiosError(error)) {
-    if (error.response?.status === 409) { ... }
-    if (error.response?.status === 500) { ... }
-  }
-  return { ok: false, apiUrl: this.buildUrl(resultPath), error: `결과 조회 실패: ${error.message}` };
-}
+const fetchResult = await this.fetchJobResult(resultPath);
+return {
+  ...fetchResult,
+  apiUrl: this.buildUrl(resultPath),
+};
```

> `fetchJobResult`는 이미 409/500 분기, blob URL 생성, 에러 메시지 포맷을 모두 포함한다. 코드 중복 제거 효과도 있음.

---

## 5. 실제 네트워크 페이로드 (수정 후)

opt=1 예시 (opt=0/2도 `opt` 값만 다름):

```json
{
  "opt": 1,
  "prompt": "<사용자가 사이드바에 입력한 문장 원문>",
  "positive_prompt": "",
  "negative_prompt": "",
  "image_base64": "<data: prefix 제거된 PNG base64>",
  "strength": 0.9
}
```

응답은 raw 바이트(Content-Type: `image/png`), 프론트에서 `URL.createObjectURL`로 blob URL 생성 후 `backgroundCandidates`에 push.

---

## 6. 타임아웃 설정 (변경 없음 — 참고용)

| 구간 | 타임아웃 |
|------|----------|
| POST `/jobs` 생성 | 2분 (`120_000 ms`) |
| 폴링 전체 대기 | 10분 (`600_000 ms`) |
| GET `/jobs/{id}/result` | 60초 |

이번 알림("응답에 image_base64가 없습니다")은 **타임아웃과 무관**했다. 폴링이 `status=done`까지 정상 도달한 뒤 result 응답 파싱 단계에서 발생한 포맷 미스매치였다.

---

## 7. 남은 정리 대상 (out of scope)

- `react/src/modules/editing/constants/prompts.ts` — `SCENE_PROMPTS`, `UNIVERSAL_NEGATIVE_PROMPT`, `createUniversalPositivePrompt`, `getUniversalNegativePrompt`, `COFFEE_RELATED_KEYWORDS` 모두 이제 참조 지점이 없음. 파일 삭제 또는 export 제거 가능 (현재는 dead code로 남아있어도 빌드엔 영향 없음)
- `App.tsx:110` `promptKo` state — Case A에서 여전히 읽히지만 setter 배선이 빠져 항상 빈 값. Case A의 사용자 입력 경로 정비 또는 `promptHint`와 병합 필요
- 선행 스펙 `.omc/specs/deep-interview-ai-bg-changeimage-opt.md` §Constraints의 "응답 형식: JSON" 문구는 실제 구현과 다름. 스펙 업데이트 필요

---

## 8. 검증 체크리스트

- [x] `npx tsc --noEmit` EXIT=0
- [x] 백엔드 POST 직접 호출 → job_id 정상 발급
- [x] 백엔드 CORS 프리플라이트 정상 (allow_origins=*, preflight 200)
- [ ] 브라우저에서 'AI 배경 생성' 버튼 클릭 → 3개 배경 후보 수신 (사용자 검증 필요)
