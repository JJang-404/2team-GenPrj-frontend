# 백엔드 GPT 프롬프트 번역 연동 분석 및 수정 보고서 (2026.04.11)

---

## 1. 왜 프론트에 영문 번역 코드를 추가했는가 (잘못된 판단)

이전 작업(`ai_background_pure_generation_report.md`)에서 아래 3개의 헬퍼 함수를 `callApi.js`에 추가하였습니다.

| 함수명 | 역할 |
|--------|------|
| `industryToEnglishContext(industry)` | 한국어 업종 → 영문 배경 컨텍스트 (22종 매핑) |
| `translateKoreanKeywords(text)` | 한국어 스타일 키워드 → 영문 치환 (33개 regex 패턴) |
| `buildBackgroundNegativePrompt()` | 영문 네거티브 프롬프트 문자열 반환 |

**추가 이유**: 이미지 생성 모델이 영문 프롬프트를 더 잘 이해한다고 판단하여, 프론트에서 미리 영문으로 변환 후 전달하려 했습니다.

**문제**: **백엔드 서버를 먼저 확인하지 않았습니다.**

---

## 2. 백엔드에 이미 GPT 번역이 구현되어 있음

### 확인된 파일 경로

| 파일 | 역할 |
|------|------|
| `Backend1/app/restapi/modelApi.py` | `/addhelper/model/generate` 엔드포인트 |
| `Backend1/app/models/openai.py` | `OpenAiJob` — GPT 번역/프롬프트 빌더 |
| `Backend1/app/common/defines.py` | GPT 시스템 프롬프트 정의 |

### 실제 요청 흐름

```
프론트엔드 (callApi.js)
  └─ modelApi.generateImage(prompt, '', negativePrompt)
       └─ GET /addhelper/model/generate?prompt=...&negative_prompt=...

백엔드 (modelApi.py - generate_image)
  └─ _build_prompt_bundle(prompt, positive_prompt, negative_prompt)
       └─ OpenAiJob().build_prompt_bundle(...)
            └─ [한국어 감지] _contains_korean() → True
                 └─ GPT (gpt-5-mini) 호출
                      └─ 시스템: BASE_PROMPT_MSG
                      └─ 사용자: {"prompt": "...", "positive_prompt": "", "negative_prompt": "..."}
                      └─ 반환: {"positive_prompt": "영문 SD3.5 프롬프트", "negative_prompt": "영문 네거티브"}

이미지 생성 엔진
  └─ POST engine_url/generate (positive_prompt, negative_prompt)
```

### 백엔드 GPT 시스템 프롬프트 (`BASE_PROMPT_MSG`)

```
"You prepare Stable Diffusion 3.5 prompts.
Return strict JSON only with keys positive_prompt and negative_prompt.
Respect user-supplied positive_prompt and negative_prompt first,
translate Korean or mixed-language inputs into concise natural English,
fill missing fields from prompt context,
and if negative_prompt is missing use a safe image-quality negative prompt.
Do not include markdown or explanations."
```

### GPT 번역 조건 (`build_prompt_bundle`)

```python
needs_llm = (
    not normalized_negative        # 네거티브 프롬프트 없음
    or not normalized_positive     # 포지티브 프롬프트 없음  ← 항상 해당
    or self._contains_korean(...)  # 한국어 포함 여부
)
```

→ `positive_prompt`를 비워서 보내면 **항상 GPT가 호출**됩니다.  
→ 한국어 `prompt` 가 포함되면 **GPT가 자동 번역**합니다.

---

## 3. 기존 영문 번역 코드의 문제점

| 항목 | 프론트 regex 번역 | 백엔드 GPT 번역 |
|------|-----------------|----------------|
| 정확도 | 낮음 (단순 단어 치환) | 높음 (문맥 이해) |
| 업종 커버리지 | 22종 직접 매핑 | 제한 없음 |
| SD3.5 최적화 | 없음 | 전용 시스템 프롬프트 적용 |
| 유지보수 | 매번 수동 추가 필요 | 필요 없음 |
| 코드 복잡도 | 높음 (100줄+ 코드) | 없음 |

추가로, 만약 프론트에서 영문 `prompt` + 영문 `negative_prompt`를 완성해서 보내면:
- `_contains_korean()` → False (영문만 있으므로)
- 그러나 `not normalized_positive` → True (positive를 안 보내므로)
- 결국 GPT 호출은 되지만 **내 열등한 regex 번역 결과를 GPT가 다시 처리**하는 이중 작업 발생

---

## 4. 수정 내용

### `callApi.js` — 3개 헬퍼 함수 삭제, `generateBackground` 재작성

**변경 전 (잘못된 방식)**
```javascript
// 프론트에서 직접 영문 번역 (불필요)
const industryContext = industryToEnglishContext(industry);
const translatedStyle = translateKoreanKeywords(customPrompt);
const prompt = `professional advertising poster background, ${industryContext}, ${translatedStyle}, ...`;
```

**변경 후 (올바른 방식)**
```javascript
// 업종·가게 정보를 한국어 그대로 조립 → 백엔드 GPT가 번역
const contextParts = [
  industry   ? `업종: ${industry}`         : '',
  storeName  ? `가게 이름: ${storeName}`    : '',
  storeDesc  ? `콘셉트: ${storeDesc}`       : '',
  customPrompt.trim() ? `스타일/분위기: ${customPrompt.trim()}` : '',
  '포스터 배경만 생성, 배경 위에 올라가는 제품·객체는 포함하지 않음',
].filter(Boolean);

const prompt = contextParts.join(', ');

// 네거티브는 영문 유지 (이미지 엔진이 직접 해석, 백엔드 GPT가 보존)
const negativePrompt = 'text, letters, numbers, digits, typography, logo, watermark, brand name, label, sign, banner, people, person, face, hands, body parts, product, cup, bottle, food, packaging';
```

삭제된 코드:
- `industryToEnglishContext()` — 100줄 업종 매핑 테이블
- `translateKoreanKeywords()` — 33개 regex 패턴 치환
- `buildBackgroundNegativePrompt()` — 중복 함수

### `App.tsx` — variantStyles 한국어로 복원

**변경 전 (불필요한 영문 스타일)**
```javascript
const variantStyles = [
  { label: '고급', en: 'luxury premium sophisticated ambiance, dark elegant refined, high-end' },
  { label: '빈티지', en: 'vintage retro nostalgic, warm muted tones, classic aged texture' },
  ...
];
const combinedPrompt = `${promptKo}, ${style.en}`;  // 영문 삽입
```

**변경 후 (한국어 → 백엔드 GPT 번역)**
```javascript
const variantStyles = [
  { label: '고급', style: '고급스럽고 프리미엄한 분위기' },
  { label: '빈티지', style: '빈티지 레트로 감성' },
  { label: '세련', style: '세련되고 모던한 미니멀' },
  { label: '활기찬', style: '밝고 활기찬 따뜻한 색감' },
];
const combinedPrompt = `${promptKo}, ${style.style}`;  // 한국어 그대로
```

---

## 5. 최종 프롬프트 흐름 (수정 후)

```
사용자 입력 (예시)
  업종: 카페
  가게이름: 루나커피
  스타일: 빈티지 레트로 감성

↓ callApi.generateBackground()

prompt = "업종: 카페, 가게 이름: 루나커피, 스타일/분위기: 빈티지 레트로 감성, 포스터 배경만 생성..."
negativePrompt = "text, letters, numbers, logo, people, person, ..."

↓ modelApi.generateImage(prompt, '', negativePrompt)
↓ 백엔드 GET /model/generate?prompt=...&negative_prompt=...

↓ build_prompt_bundle() — 한국어 감지 → GPT 호출

GPT 입력:
  {"prompt": "업종: 카페, 가게 이름: 루나커피, 스타일/분위기: 빈티지 레트로 감성, ...",
   "positive_prompt": "",
   "negative_prompt": "text, letters, numbers, ..."}

GPT 출력 (예시):
  {
    "positive_prompt": "vintage retro cafe interior, Luna Coffee shop, warm sepia tones, nostalgic wooden decor, antique light fixtures, cozy ambiance, cinematic lighting, 8K, background only",
    "negative_prompt": "text, letters, numbers, logo, watermark, people, person, face, hands, product, cup, bottle, low quality, blurry"
  }

↓ 이미지 생성 엔진 (SD3.5)
↓ 고품질 포스터 배경 이미지 반환
```

---

## 6. backgroundGeneration.ts 에 대하여

`backgroundGeneration.ts` 의 `heuristicTranslation` 과 `buildNegativePrompt` 는 이번 수정에서 **변경 없이 유지**합니다.

이유:
- 이 파일의 `createAiImageCandidates` 도 `${base}/model/generate` (백엔드)를 호출 → GPT가 다시 처리함
- `heuristicTranslation` 결과는 후보 카드의 `translatedPrompt` 메타데이터로 UI에 표시되는 용도
- 실제 이미지 품질에는 영향 없음 (백엔드 GPT가 최종 변환)
- App.tsx 의 ai-image 모드에서는 `generateBackgrounds` (client.ts 경로)를 사용하지 않으므로 이 경로는 현재 미사용

---

## 7. 결론

> **백엔드 서버를 먼저 확인했다면 프론트에 번역 코드를 추가할 필요가 없었습니다.**

백엔드 `/model/generate` 는 이미 `OpenAiJob.build_prompt_bundle()` 을 통해 GPT 번역을 수행합니다.  
올바른 연동 방법은 **한국어 컨텍스트를 그대로 전달**하고 **네거티브 프롬프트만 영문으로 명시**하는 것입니다.

이번 수정으로 `callApi.js` 에서 약 130줄의 불필요한 코드를 제거하고,  
백엔드 GPT의 Stable Diffusion 3.5 전용 프롬프트 최적화를 온전히 활용하게 되었습니다.
