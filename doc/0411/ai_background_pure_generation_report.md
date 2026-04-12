# AI 배경 순수 생성 전환 작업 보고서 (2026.04.11)

순수 생성(Pure Generation) 방식으로 전환하고, 업종 기반 영문 프롬프트 템플릿 및 강화된 네거티브 프롬프트를 적용하였습니다.  
텍스트, 문자, 숫자, 로고, 사람이 배경에서 완전히 제거되도록 개선하였습니다.

---

## 1. 변경 파일 및 내용

### ① `callApi.js` — `generateBackground` 함수 전면 재작성

**변경 전**
- 한국어 프롬프트를 그대로 이미지 모델에 전달 (`AI_BACKGROUND_PROMPT_HEADER` + 필드 조합)
- 네거티브 프롬프트: `"배경에 문자는 넣지 말아 주세요"` (한국어, 매우 약함)

**변경 후**
- `industryToEnglishContext(industry)` 신규 추가  
  → 업종명(한국어)을 이미지 모델이 이해하는 영문 배경 컨텍스트로 변환  
  → 카페 / 식당 / 베이커리 / 헤어살롱 / 꽃집 등 22종 업종 지원
- `translateKoreanKeywords(text)` 신규 추가  
  → 사용자가 입력한 한국어 스타일 키워드(봄, 고급스럽게, 빈티지 등)를 영문으로 치환  
  → 33개 패턴 사전 등록
- `buildBackgroundNegativePrompt()` 신규 추가  
  → text, letters, alphabet, numbers, digits, typography, logo, watermark, people, person, face, hands 등 명시적 차단
- `generateBackground` 재작성  
  → 영문 포스터 배경 프롬프트 조립 (`industryContext + translatedStyle + 품질 키워드`)  
  → `modelApi.generateImage` 호출 (순수 생성, 인페인팅 미사용)  
  → `AI_BACKGROUND_PROMPT_HEADER` / `AI_BACKGROUND_PROMPT_FIELDS` 의존 제거

```
최종 프롬프트 구조:
"professional advertising poster background, {업종 English 컨텍스트}, {번역된 스타일}, cinematic lighting, photorealistic, 8K resolution, high-end commercial photography background, background only, no foreground objects in focus"
```

---

### ② `App.tsx` — `handleGenerateBackgrounds` 스타일 변형 영문화

**변경 전**
```javascript
const variantStyles = ['분위기 고급지게', '빈티지', '세련되게', '카툰화'];
// 한국어 문자열을 customPrompt로 그대로 전달
const combinedPrompt = `${promptKo}, ${style}`;
```

**변경 후**
```javascript
const variantStyles = [
  { label: '고급',   en: 'luxury premium sophisticated ambiance, dark elegant refined, high-end' },
  { label: '빈티지', en: 'vintage retro nostalgic, warm muted tones, classic aged texture' },
  { label: '세련',   en: 'sleek modern minimalist, clean contemporary polished, crisp lines' },
  { label: '활기찬', en: 'bright vibrant colorful, cheerful energetic lively, bold warm palette' },
];
// 영문 스타일 키워드를 customPrompt에 직접 삽입
const combinedPrompt = promptKo.trim() ? `${promptKo}, ${style.en}` : style.en;
```

- 이미지 모델이 이해하기 좋은 영문 키워드로 스타일 구성
- 후보 카드 이름(label)은 한국어 유지, 프롬프트(en)만 영문으로 분리
- 기존 `res.styleName`은 `style.label` (한국어)로 유지되어 UI 표시에 영향 없음

---

### ③ `backgroundGeneration.ts` — 번역 및 네거티브 프롬프트 강화

**`heuristicTranslation` 함수 개선**
- 변경 전: 커피류 5개 키워드만 번역
- 변경 후: 업종 키워드 11종 + 분위기/스타일 키워드 21개 패턴 처리
- 번역되지 않은 한국어는 번역 결과가 있을 때만 포함 (중복 방지)

**`buildNegativePrompt` 함수 강화**
- 변경 전: 제품/사람/로고 위주 (~13개 토큰)
- 변경 후: text · letters · alphabet · numbers · digits · typography · font · logo · watermark · people · person · human · face · faces · hands · fingers · body parts · figure · duplicate objects 등 명시적으로 포함 (~25개 토큰)

**`createAiImageCandidates` 변형 스타일 업데이트**
| # | 변경 전 | 변경 후 |
|---|---------|---------|
| 1 | AI 프리미엄 스튜디오 (음료 캠페인 특화) | AI 고급 스튜디오 (업종 무관 고급 배경) |
| 2 | AI 카페 우드 무드 (카페 특화) | AI 따뜻한 우드 (따뜻한 인테리어 범용) |
| 3 | AI 골든 아워 밸리 (산/들판) | AI 골든 아워 (노을/자연광 범용) |
| 4 | AI 소프트 윈도 라이트 (카페 창문) | AI 소프트 라이트 (깔끔한 배경 범용) |

- 순수 생성 경로(`!guideImage`)는 4개 병렬 요청 유지

---

## 2. 핵심 개선 효과

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 프롬프트 언어 | 한국어 혼용 | 영문 전용 (번역 후 전달) |
| 업종 반영 | 없음 | 22종 업종별 영문 컨텍스트 자동 적용 |
| 스타일 키워드 | 한국어 문자열 그대로 | 영문 이미지 생성 키워드로 변환 |
| 네거티브 프롬프트 | 한국어 1문장 | 영문 ~25개 토큰 (텍스트·숫자·로고·사람 명시) |
| 생성 방식 | 인페인팅 혼용 가능성 | `modelApi.generateImage` 순수 생성 고정 |
| 텍스트 배경 노출 | 간혹 발생 | 명시적 네거티브로 차단 |

---

## 3. 테스트 방법

1. **업종 설정**: initPage에서 업종을 `카페`, `베이커리`, `한식당` 등으로 설정
2. **프롬프트 입력**: "봄 분위기의 화사한 테라스" 와 같이 한국어로 입력
3. **배경 생성 클릭**: 4종 스타일(고급 / 빈티지 / 세련 / 활기찬) 배경이 병렬 생성
4. **확인 포인트**:
   - 배경에 텍스트, 숫자, 로고, 사람이 포함되지 않는지 확인
   - 업종(카페면 카페 인테리어, 꽃집이면 꽃 배경 등)과 어울리는 배경인지 확인
   - 사용자가 입력한 한국어 분위기가 반영되는지 확인
