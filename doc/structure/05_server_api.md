# 05. 서버 API 계층 보고서

- 대상:
  - `react/src/server/api/**` (baseApi, callApi, modelApi, designApi, imageApi, adverApi, storeInfo, users)
  - `react/src/server/common/**` (defines, functions, storage)
- 역할: FastAPI 백엔드(`/addhelper`)와 통신하는 얇은 axios 래퍼 + localStorage
  기반 클라이언트 캐시.
- 상위 문서: `00_overview.md § 4.5`

이 레이어는 React 와 네트워크 사이의 얇은 경계. 모든 UI 모듈이 여기로만
네트워크 I/O 를 수행하므로 "백엔드 계약 변경 = 이 폴더 일부만 수정" 이 되도록
의도됐다.

---

## 1. 디렉터리 맵

```
server/
├── api/
│   ├── baseApi.js        ─ axios 인스턴스 + HTTP 래퍼 + 에러 평탄화 (144 L)
│   ├── callApi.js        ─ 복합 유즈케이스(디자인 저장, 배경 생성 등) (391 L)
│   ├── modelApi.js       ─ SD3.5 이미지 생성/변환 (sync + async job) (192 L)
│   ├── imageApi.js       ─ 이미지 업로드/리스트/다운로드 (170 L)
│   ├── designApi.js      ─ 디자인 프로필 저장/조회 (47 L)
│   ├── adverApi.js       ─ 광고문구 생성 (18 L)
│   ├── storeInfo.js      ─ localStorage 기반 가게 정보 + AD 프롬프트 빌더 (123 L)
│   └── users.js          ─ signup/login (28 L)
└── common/
    ├── defines.js        ─ BACKEND_BASE_URL 상수, 기본 옵션, createProduct (68 L)
    ├── functions.js      ─ getBackendUrl() 환경 분기 (19 L)
    └── storage.js        ─ localStorage 안전 래퍼 + STORAGE_KEYS (208 L)
```

총 1,040 LOC. 절반 이상(~511) 은 callApi 와 modelApi 에 집중.

---

## 2. 기본 원칙 — 응답 계약 (baseApi.js)

모든 API 호출은 **`{ ok, data, error, ... }`** 모양으로 평탄화된다.

```js
{
  ok: boolean,            // HTTP 2xx AND (response.statusCode === '200' or 없음)
  apiUrl: string,         // 디버깅용 전체 URL
  httpStatusCode: number,
  statusCode: number | string,
  requestBody?: any,      // POST 만
  responseJson: any,      // raw backend payload
  data: any,              // responseJson.datalist ?? responseJson (GET) 또는 datalist (POST)
  message: string | null,
  error: string | null,   // ok=false 시에만 채움
}
```

### 2.1 FastAPI 응답 이중 상태 규약

FastAPI 서버는 두 층위의 상태를 돌려준다:

1. **HTTP status** — 200/4xx/5xx (axios 표준)
2. **body.statusCode** — 문자열 `"200"` (성공) / 다른 값 (논리적 실패)

`isApiSuccess(httpStatusCode, responseData)` 는 이 둘을 AND 로 평가한다.
`statusCode` 필드가 body 에 없으면 HTTP 만으로 판정 (파일 다운로드 등
streaming 응답 대응).

### 2.2 axios 타임아웃/에러 분류

- `timeoutSec` 기본 30s. 이미지 생성은 `IMAGE_GENERATE_TIMEOUT_MS = 10*60*1000`
  등 개별 호출에서 덮어쓴다.
- `ECONNABORTED` → "요청 시간 초과 (Nms)" 문자열 에러.
- `error.response` 있음 → status + body.message 기반 에러 문자열.
- 네트워크 실패 → "요청 실패: <msg>".

UI 는 `ok` 만 보면 되며, 실패 사유는 `error` 로.

---

## 3. 백엔드 엔드포인트 맵

| 도메인 | API 클래스 | 주요 엔드포인트 | 인자/형식 |
|--------|------------|-----------------|-----------|
| 모델 | `modelApi` | `POST /model/generate_sync`, `POST /model/generate_async_create`, `GET /model/generate_async_status/{jobId}`, `POST /model/change` | prompt, positive/negative, strength |
| 이미지 | `imageApi` | `POST /image/upload` (multipart), `GET /image/list`, `GET /image/info/{id}`, `GET /image/download/{id}` | userId, file, fileDesc |
| 디자인 | `designApi` | `POST /design/save`, `GET /design/list` (with candidates fallback) | profile_id, ai_image_id, designMeta |
| 광고 | `adverApi` | `POST /adver/generate` | input_text, tone, targetAudience, count |
| 사용자 | `users` | `POST /user/signup`, `POST /user/login` | userId, userName, userPassword |

모든 엔드포인트는 `BACKEND_BASE_URL` 아래에서 상대 경로. 실제 URL 은
`getBackendUrl()` 이 환경별로 결정:

```js
// functions.js
if (import.meta.env.DEV) return "http://localhost:8000/addhelper";
return import.meta.env.VITE_BACKEND_BASE_URL || "https://gen-proj.duckdns.org/addhelper";
```

---

## 4. `modelApi` — 이미지 생성의 핵심

가장 복잡한 API 클래스. SD3.5 기반 백엔드의 두 모드(sync / async job)를 모두
지원한다.

### 4.1 Sync 경로

```
modelApi.generateImageSync(prompt, positivePrompt, negativePrompt)
  └─ POST /model/generate_sync?positive_prompt=...&negative_prompt=...
     body = { prompt }
     responseType: 'blob'
  → { ok, blobUrl, prompt, negativePrompt }
```

서버가 이미지를 응답 본문으로 바로 준다. Blob → `URL.createObjectURL(blob)`
으로 변환해 blobUrl 반환.

응답이 blob 이지만 `type` 이 이미지가 아닐 때 (에러 JSON 이 blob 으로 포장된
경우) FileReader 로 텍스트로 읽어 error 를 꺼내는 방어 코드 있음.

### 4.2 Async 경로

```
generateImageAsync(prompt, positivePrompt, negativePrompt)
  ├─ POST /model/generate_async_create   → { job_id }
  ├─ while (elapsed < timeout)
  │    ├─ GET /model/generate_async_status/{job_id}
  │    ├─ status === 'done'   → GET download url → blob → blobUrl
  │    ├─ status === 'failed' → return { ok: false, error: reason }
  │    └─ else sleep 2s and retry
  └─ timeout → { ok: false, error: '시간 초과' }
```

서버가 긴 작업(대규모 SD3.5 이미지) 을 job queue 로 돌리는 경우. UI 는 단일
async 호출로 추상화되어 호출한다.

### 4.3 Dispatcher

`generateImage(prompt, positivePrompt, negativePrompt)` 는 조건에 따라 sync/async
중 하나를 고른다 (현재 구현은 sync 우선).

### 4.4 Change (img2img)

```
modelApi.changeImage(prompt, imageBase64, strength, positive, negative)
  └─ POST /model/change
```

기존 이미지를 프롬프트로 변형. `strength` 가 0.3 → 원본 보존 강함 (정면
변환용), 0.75 → 더 자유로운 재해석. editing 측 `callApi.transformImageToFrontal`
가 이것을 strength=0.3 으로 호출해 "정면 컵 이미지화" 를 수행.

---

## 5. `imageApi` — 파일 업로드/다운로드

### 5.1 uploadImage

```js
async uploadImage(userId, imageFile, fileDesc = '') {
  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('file', imageFile);
  formData.append('file_desc', fileDesc);
  return axios.post('/image/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
```

반환 body 에서 `image_id` 를 추출해야 하는데 백엔드가 여러 포맷으로 줄 수 있어
`callApi.resolveAiImageId` 가 4군데(`data`, `responseJson.datalist`,
`responseJson.data`, `responseJson`) 를 차례대로 탐색하며 숫자형 id 를 찾는다.

### 5.2 listImages / getImageInfo / downloadImage

조회 3종. 특히 `listImages({ userId, fileName, fileDesc })` 는 422 Unprocessable
Entity 를 "조회 결과 없음" 으로 해석한다 (FastAPI Pydantic validation 관례에
맞춰).

---

## 6. `callApi` — 복합 유즈케이스 오케스트레이터

`baseApi` 를 확장하면서, 여러 API 를 섞어야 하는 시나리오를 래핑한다.
단일 메서드 하나가 3-4 개의 다른 API 호출을 차례로 부른다.

### 6.1 주요 시나리오

| 메서드 | 조합하는 API | 하는 일 |
|--------|-------------|---------|
| `generateBackground({ customPrompt })` | `modelApi.generateImage` | 프롬프트 조립 + negative 기본값 + SD3.5 호출 |
| `transformImageToFrontal(imageUrl)` | `fetch → blob → base64` + `modelApi.changeImage(strength=0.3)` | 사용자 제품 이미지를 "정면 컵" 으로 img2img |
| `generateAdCopy()` | `storeInfo.buildAdPrompt` + `adverApi.generateAdCopy` | 저장된 가게 정보로 광고 문구 3개 생성 |
| `resolveAiImageUpload({ ... })` | `modelApi.generateImage`(optional) + `fetch blob` + `buildUploadImageFile`(압축) + `imageApi.uploadImage` + `resolveAiImageId` | AI 생성 이미지를 서버에 업로드하고 image_id 확보 |
| `saveDesignProfile({ ... })` | `resolveAiImageUpload` + `buildDesignMetaPayload` + `designApi.saveDesignProfile` | 디자인 저장 전 파이프라인 전체 |
| `listDesignProfiles({ userId })` | `designApi.listDesignProfiles` | 얇은 pass-through |

### 6.2 buildUploadImageFile — 자동 이미지 압축

업로드 전 900KB 초과 시 canvas 로 리사이즈(max 1280) + JPEG 재인코딩 (quality
0.88 → 0.5 까지 내림). PNG 인 경우 파일명 확장자 유지. 이 로직이 없으면
FastAPI 측 file size limit 에 걸리는 경우가 많다.

### 6.3 sanitizeOptionsForStorage

`aiBackgroundImage` 는 `blob:` URL — 브라우저 세션 한정이므로 DB 저장 전
제거하고, 서버에서는 `ai_image_id` 로만 복원한다. 이 규약을 잊으면
DB 에 사용 불가 URL 이 쌓이므로 반드시 sanitize 후 저장.

### 6.4 프롬프트 조립 (AI 배경)

```js
_buildBackgroundPrompt(customPrompt) {
  return [customPrompt.trim(), 'Generate only the poster background, without including any products or objects']
    .filter(Boolean).join(', ');
}

_buildBackgroundNegativePrompt() {
  // text, letters, people, product, cup, bottle, ...
  // — 백엔드 GPT 번역 과정에서도 그대로 보존되도록 영문 유지
}
```

핵심 원칙:

- **한국어 프롬프트** 를 유저에게 받아도 된다. 백엔드
  `OpenAiJob.build_prompt_bundle` 이 GPT 로 영문 번역 후 SD3.5 에 전달.
- **네거티브 프롬프트는 영문** 으로 박아둠 — GPT 번역 계층에서 의미 손실을
  최소화.

---

## 7. `designApi` — fallback candidate 경로

```js
async listDesignProfiles(payload) {
  const candidates = ['/design/list', '/design/listAll'];  // 백엔드 버전에 따라
  for (const urlPath of candidates) {
    const result = await this.post(urlPath, payload);
    if (result.ok) return result;
    const isNotFound = result.statusCode === 404;
    if (!isNotFound) break;  // 다른 에러면 즉시 반환
  }
  return lastResult;
}
```

백엔드 마이그레이션 중간 상태(엔드포인트 이름 전환) 를 흡수하기 위한 패턴.
404 만 다음 후보로 fallback, 그 외는 에러 보존.

---

## 8. `storeInfo` — localStorage 기반 도메인 모델

서버와 별개로 **브라우저에 직접 저장** 되는 데이터:

- `basicInfo` — 가게명/업종/소개 문구
- `extraInfo` — 부가정보 (주차, 전화 등)
- `products` — 제품 배열

세 가지 주 메서드:

- `saveStoreInfo(data)` — localStorage 에 쓰기 (실패 시 alert).
- `getStoreInfo()` — 읽기 + JSON.parse 가드.
- `buildAdPrompt()` — 저장된 데이터로 GPT 용 프롬프트 여러 줄을 조립:
  ```
  가게이름: {storeName}
  업종: {industry}
  가게 소개: {storeIntro}
  주요 상품: {product1}, {product2}, ...
  ```

이 로직이 **InitPage ↔ 편집 ↔ 서버** 세 쪽을 잇는 접착제. initPage 에서 입력
→ storeInfo 저장 → 편집 모듈 진입 시 `HomeProjectData` 로 변환되어 bridge
전달 → 편집 모듈 `generateAdCopy` 호출 시 다시 localStorage 에서 읽어 백엔드
프롬프트 조립.

---

## 9. `users` — 인증

2개 메서드만:

- `signup(userId, userName, userPassword)` — `POST /user/signup`
- `login(userId, userPassword)` — `POST /user/login`

성공 시 `storage.STORAGE_KEYS.lastLoginUserId` 에 사용자 id 저장. 토큰 기반이
아니고 localStorage userId 를 모든 API 호출의 `user_id` 필드에 실어 보내는
단순 모델. 프로덕션 수준 인증/세션은 미구현.

---

## 10. `common/storage.js` — 안전한 localStorage 래퍼

208 줄이 대부분 try-catch 방어 코드. `window` 또는 `localStorage` 가 없는
환경(서버/SSR/브라우저 제한 모드) 에서도 throw 하지 않고 `fallbackValue` 반환.

API:

- `getStorageValue(key, fallback)` / `setStorageValue(key, value)` / `removeStorageValue(key)`
- `getStorageNumber(key, fallback)` — Number() 파싱 + isFinite 가드
- `getStorageJSON(key, fallback)` / `setStorageJSON(key, value)` — JSON.parse/stringify 감싸기
- `STORAGE_KEYS` — 앱 전체가 쓰는 키 목록 상수 (dedupe + 오타 방지)

```js
export const STORAGE_KEYS = {
  lastLoginUserId: 'auth.lastLoginUserId',
  adCopyGenerationState: 'page.adCopyGeneration',
  imageGenerationState: 'page.imageGeneration',
  imagePromptState: 'page.imagePrompt',
  imageAttachmentState: 'page.imageAttachment',
  testState: 'page.test',
  loginState: 'page.login',
  signupState: 'page.signup',
};
```

**중요**: 이 상수 이외의 로컬 스토리지 키를 하드코딩하지 말 것 — 새 키 추가
시 여기에 등록.

---

## 11. `common/defines.js` — 기본값 팔레트

전역 기본값 상수 모음:

- `BACKEND_BASE_URL` — localhost 기본 (dev) + 주석 처리된 prod 주소. 실제 선택은
  `getBackendUrl()` 이 담당하므로 이 상수는 fallback 역할.
- `IMAGE_GENERATE_TIMEOUT_MS` / `IMAGE_CHANGE_TIMEOUT_MS` — 10/20분.
- `EMPTY_INPUT_FALLBACK = '미입력'` — 빈 입력을 프롬프트에 넣을 때.
- `AI_BACKGROUND_PROMPT_HEADER` / `AI_BACKGROUND_NEGATIVE_PROMPT` /
  `AI_BACKGROUND_PROMPT_FIELDS` — initPage 에서 AI 배경 프롬프트를 조립할 때
  쓰는 문구 템플릿.
- `CURRENCIES = ['원', '$', '€', '¥', '£']` — 제품 가격 통화 선택지.
- `DEFAULT_OPTIONS` / `DEFAULT_BASIC_INFO` / `DEFAULT_EXTRA_INFO` — initPage 초기
  상태 시드. ratio='4:5', concept='vivid', brandColor='#FF4757' 등.
- `createProduct()` — 빈 제품 객체 factory. `id: Date.now()` 로 고유 id 부여.

---

## 12. 호출 그래프 (주요 사용처)

```
InitPage App.jsx
  ├─ callApi.generateAdCopy → adverApi.generateAdCopy
  ├─ callApi.transformImageToFrontal → modelApi.changeImage
  ├─ callApi.saveDesignProfile
  │     ├─ resolveAiImageUpload → imageApi.uploadImage
  │     └─ designApi.saveDesignProfile
  └─ storeInfo.saveStoreInfo / getStoreInfo

Editing App.tsx
  ├─ callApi.adCopy / imageGen (backgroundGeneration.ts 내부에서)
  ├─ adverApi.saveResult (export 결과 업로드)
  ├─ modelApi.generateImage (AI 배경)
  └─ storeInfo.getStoreInfo (프롬프트 재조립)
```

> editing 측 `backgroundGeneration.ts` 는 대부분 `modelApi` / `callApi` 를 직접
> 호출한다. 이 파일은 400 줄 — [03_editing_module.md § 7](03_editing_module.md)
> 참조.

---

## 13. 변경 포인트 가이드

| 변경 목적 | 수정 위치 | 주의 |
|-----------|-----------|------|
| 백엔드 URL 변경 | `common/defines.js` (`BACKEND_BASE_URL`) + `common/functions.js` (`getBackendUrl`) + env `VITE_BACKEND_BASE_URL` | 3곳 정렬. dev 분기가 하드코딩 localhost 라 env override 우선순위 확인 |
| 새 엔드포인트 추가 | 해당 도메인 API 클래스 (`modelApi`, `imageApi`, …) 또는 새 `xxxApi.js` 생성 | `extends BaseApi` + `this.post(...)` 만 쓰면 평탄화된 응답이 자동 획득 |
| AI 프롬프트 헤더/푸터 문구 변경 | `callApi._buildBackgroundPrompt` / `_buildBackgroundNegativePrompt` + `defines.js`(initPage 용) | 두 곳 존재 — initPage 측 프롬프트는 defines 에, editing 측은 callApi 내부 |
| localStorage 키 추가 | `common/storage.js.STORAGE_KEYS` | `getStorageJSON` 사용 권장 (raw getStorageValue + JSON.parse 중복 금지) |
| 타임아웃 조정 | `defines.js` `IMAGE_*_TIMEOUT_MS` 또는 `baseApi` constructor의 `timeoutSec` | image generation 은 30s 로는 부족 |
| FastAPI 응답 포맷 변경 (예: `datalist` → `items`) | `baseApi` `get/post` 안의 `data: responseData?.datalist ?? ...` | 모든 API 가 이 평탄화에 의존. 하위 호환 유지 권장. |

---

## 14. 테스트 관점 체크리스트

- [ ] 백엔드가 200 + body `statusCode="500"` 을 줄 때 `ok === false` 인가.
- [ ] axios timeout 시 `error === '요청 시간 초과 (Nms)'` 문자열이 정확히
      채워지는가.
- [ ] `imageApi.uploadImage` 가 900KB 미만 PNG 를 재인코딩 없이 그대로 보내는가.
- [ ] `imageApi.listImages` 가 422 응답을 "결과 없음" 으로 정상 해석하는가.
- [ ] `callApi.resolveAiImageId` 가 4 가지 응답 포맷 모두에서 id 를 추출하는가.
- [ ] `modelApi.generateImageAsync` 가 job 실패 시 `{ ok: false, error: reason }`
      을 반환하는가 (무한루프 방지).
- [ ] `designApi.listDesignProfiles` 가 `/design/list` 404 시
      `/design/listAll` 로 fallback 되는가.
- [ ] localStorage 사용 불가 환경(incognito / Safari ITP) 에서 `getStorageValue`
      가 throw 하지 않는가.

---

## 15. 관련 경로

### API
- [api/baseApi.js](../../react/src/server/api/baseApi.js)
- [api/callApi.js](../../react/src/server/api/callApi.js)
- [api/modelApi.js](../../react/src/server/api/modelApi.js)
- [api/imageApi.js](../../react/src/server/api/imageApi.js)
- [api/designApi.js](../../react/src/server/api/designApi.js)
- [api/adverApi.js](../../react/src/server/api/adverApi.js)
- [api/storeInfo.js](../../react/src/server/api/storeInfo.js)
- [api/users.js](../../react/src/server/api/users.js)

### Common
- [common/defines.js](../../react/src/server/common/defines.js)
- [common/functions.js](../../react/src/server/common/functions.js)
- [common/storage.js](../../react/src/server/common/storage.js)
