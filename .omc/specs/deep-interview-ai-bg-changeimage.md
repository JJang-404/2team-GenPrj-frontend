# Deep Interview Spec: AI 배경 생성을 changeImageApi(img2img)로 전환

## Metadata
- Interview ID: ai-bg-changeimage-2026-04-21
- Rounds: 4
- Final Ambiguity Score: 17.75%
- Type: brownfield
- Generated: 2026-04-21
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 0.35 | 0.315 |
| Constraint Clarity | 0.80 | 0.25 | 0.200 |
| Success Criteria | 0.75 | 0.25 | 0.188 |
| Context Clarity | 0.80 | 0.15 | 0.120 |
| **Total Clarity** | | | **0.8225** |
| **Ambiguity** | | | **0.1775** |

## Goal
editing 모듈의 'AI 배경 생성' 버튼 클릭 시, 현재 text2img(`generateImage`) 경로를 img2img(`changeImage`) 경로로 전환한다. `mainPreviewRef` DOM을 `html2canvas`로 캡처하여 "제품 이미지들만 배치된 상태"의 스냅샷(base64 PNG)을 프롬프트와 함께 백엔드로 전송하고, 백엔드 ComfyUI 워크플로우(`changeimage.json`)를 통해 배경만 재생성된 이미지를 반환받는다.

## Constraints
- 캡처 대상: `mainPreviewRef`의 제품 이미지만 포함. 텍스트/로고/현재 배경은 `data-html2canvas-ignore` 컨벤션으로 제외.
- 인코딩: `canvas.toDataURL('image/png')`로 base64 문자열 생성. `backgroundColor: null`로 투명 배경 유지.
- API 경로: 기존 `callApi.generateBackground({ customPrompt, imageBase64 })` 분기를 그대로 활용. `imageBase64` 제공 시 자동으로 `modelApi.changeImage` → `POST /model/changeimagecomfyui/jobs`로 라우팅됨.
- strength: **0.9** — 백엔드 `D:\01.project\2team-GenPrj-backend\data\comfyui\changeimage.json:18`의 `"denoise": 0.9`와 일치. 현재 `callApi.js:310`의 하드코딩 `1.0`은 교정 대상.
- Variant 구조 완전 제거: `BACKGROUND_VARIANTS`, `GENERATE_VARIANT_COUNT`, variant 루프, variant 기반 `buildAiCandidate` 파라미터 모두 삭제.
- 프롬프트 병합: 사용자 입력 `promptKo`만 `customPrompt`로 전달. variant 스타일 키워드 합성 없음.
- 병렬 생성 루프 제거: 단일 호출로 축소.

## Non-Goals
- 텍스트/로고/배경 요소를 캡처에 포함시키는 옵션 제공.
- 사용자가 별도로 참조 이미지를 업로드하는 UI.
- 제품 영역 마스킹 기반 inpainting.
- variant 구조의 향후 확장 여지를 남기는 리팩토링.
- 실패 시 고급 폴백/재시도/사용자 피드백 UI. (현재는 기존 에러 처리 흐름 유지)

## Acceptance Criteria
- [ ] 'AI 배경 생성' 버튼 클릭 시 `mainPreviewRef`가 `html2canvas`로 캡처되어 base64 PNG으로 변환됨.
- [ ] 캡처 결과에 텍스트/로고/배경 스와치가 포함되지 않음 (제품 이미지만).
- [ ] `callApi.generateBackground`에 `{ customPrompt: promptKo, imageBase64 }` 형태로 호출됨.
- [ ] 호출 경로가 `modelApi.changeImage` → `POST /addhelper/model/changeimagecomfyui/jobs`로 라우팅됨 (네트워크 탭/콘솔 로그로 확인).
- [ ] `modelApi.changeImage`에 전달되는 strength 값이 `0.9`.
- [ ] `BACKGROUND_VARIANTS`, `GENERATE_VARIANT_COUNT`, variant 루프가 코드에서 제거됨.
- [ ] 백엔드가 이미지 blob을 반환하면 `backgroundCandidates`에 담겨 UI에 표시됨 (성공 기준).
- [ ] 단색/그라데이션/다중색 모드는 영향 없이 기존대로 동작함.

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 이미지 소스가 명확하지 않음 | Round 1에서 제품 이미지/캔버스 스냅샷/선택 배경/업로드 중 선택 | 제품 이미지, 단 MainPreview에 배치된 상태 |
| 캡처 범위 (텍스트/로고 포함?) | Round 2에서 4가지 캡처 범위 대안 제시 | 제품 이미지만 (텍스트/로고/배경 제외) |
| 성공 기준이 부재함 | Round 3에서 구도 유지 vs 프롬프트 반영 우선순위 질문 | "blob 반환 = 성공" — MVP 기준 |
| Variant 구조가 img2img에서도 필요한가 | Round 4 Contrarian Mode: "img2img는 이미지가 구도를 전달하므로 variant 의미 약화" | Variant 완전 제거 |
| strength 기본값이 1.0인가 | 사용자 교정: 백엔드 workflow JSON의 `"denoise": 0.9`가 실제 기본값 | 0.9로 통일 |

## Technical Context

### Repo Evidence
- **프론트엔드 (brownfield)**
  - `react/src/modules/editing/App.tsx:61-69` — `BACKGROUND_VARIANTS` 상수 정의, `GENERATE_VARIANT_COUNT = 1`.
  - `react/src/modules/editing/App.tsx:75-90` — `buildAiCandidate(res, variant, index)` 함수.
  - `react/src/modules/editing/App.tsx:506-546` — `handleGenerateBackgrounds` 내 AI 분기 (병렬 variant 루프).
  - `react/src/modules/editing/App.tsx:520` — 현재 `callApi.generateBackground({ customPrompt })`로만 호출 (imageBase64 미전달).
  - `react/src/modules/editing/App.tsx:951` — `<div className="workspace__main-preview" ref={mainPreviewRef}>` 캡처 루트.
  - `react/src/modules/editing/utils/canvas.ts:22-33` — `captureElementAsDataUrl` 기존 구현 (`html2canvas` + `backgroundColor: null` + `toDataURL('image/png')`). **재사용 가능**.
  - `react/src/modules/editing/components/EditorCanvas.tsx:288,295` — 기존 `data-html2canvas-ignore="true"` 컨벤션 존재.
  - `react/src/server/api/callApi.js:300-320` — `generateBackground({ customPrompt, imageBase64, industry })`. `imageBase64` 존재 시 `modelApi.changeImage` 자동 분기.
  - `react/src/server/api/callApi.js:310` — 현재 `modelApi.changeImage(prompt, imageBase64, 1.0, ...)`. **`0.9`로 교정 필요**.
  - `react/src/server/api/modelApi.js:155-163,187-189` — `changeImageComfyUIAsync` → `POST /model/changeimagecomfyui/jobs`.

- **백엔드**
  - `app/restapi/modelApi.py:326-342` — `/generatecomfyui/jobs` 및 `/changeimagecomfyui/jobs` 엔드포인트.
  - `app/restapi/_model_job_store.py:7-109` — 공통 Job 큐 인프라.
  - `app/models/comfyui.py:221-236` — `change_image()` img2img 흐름.
  - `data/comfyui/changeimage.json:18` — `"denoise": 0.9` 기본값.

### 주요 수정 대상 파일
1. **`react/src/modules/editing/App.tsx`**
   - `BACKGROUND_VARIANTS`, `GENERATE_VARIANT_COUNT`, `BackgroundVariant` 타입 제거.
   - `buildAiCandidate` 시그니처를 `variant` 파라미터 없이 재작성.
   - `handleGenerateBackgrounds` AI 분기: `mainPreviewRef` → `captureElementAsDataUrl()` → `callApi.generateBackground({ customPrompt: promptKo, imageBase64 })` 단일 호출로 축소.

2. **`react/src/server/api/callApi.js:310`**
   - `modelApi.changeImage(prompt, imageBase64, 1.0, '', negativePrompt)` → `0.9`.

### 확인·검증 포인트
- `data-html2canvas-ignore` 속성이 텍스트/로고/배경 스와치에 실제로 부착되어 있는지 점검. 누락된 경우 추가.
- 캡처 시 투명 배경이 유지되는지 (`captureElementAsDataUrl`의 `backgroundColor: null`).
- 네트워크 요청이 `/changeimagecomfyui/jobs`로 향하는지 브라우저 개발자 도구에서 확인.

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| ProductImage | core domain | url, name, qty, bakedImageUrl | MainPreview에 배치됨 |
| MainPreview | core domain | mainPreviewRef, workspace__main-preview className | ProductImage를 여러 개 포함, CaptureRoot의 대상 |
| CaptureRoot | supporting | html2canvas scale, backgroundColor:null | MainPreview를 기반으로 PNG base64 생성 |
| BackgroundPrompt | supporting | promptKo | ChangeImageApi의 customPrompt 입력 |
| ChangeImageApi | external system | endpoint, strength(0.9), imageBase64, prompt, negativePrompt | CaptureRoot의 출력 + BackgroundPrompt 소비 |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|-----------------|
| 1 | 4 | 4 | - | - | N/A |
| 2 | 5 | 1 (CaptureRoot) | 0 | 4 | 80% |
| 3 | 5 | 0 | 0 | 5 | 100% |
| 4 | 5 | 0 | 0 | 5 | 100% |

Round 3부터 온톨로지 수렴. 도메인 모델 안정.

## Interview Transcript

<details>
<summary>Full Q&A (4 rounds)</summary>

### Round 1
**Q:** AI 배경 생성 시 백엔드로 함께 넘길 '이미지'는 어떤 이미지인가요? (changeImageApi는 img2img 방식이라 입력 이미지가 스타일/구도의 기준이 됩니다)
**A:** 1번(제품 이미지)인데 모든 제품 이미지가 MainPreview에 배치가 된 상태에서 들어가게 됨.
**Ambiguity:** 65.5% (Goal: 0.55, Constraints: 0.15, Criteria: 0.10, Context: 0.60)

### Round 2
**Q:** MainPreview를 html2canvas로 캡처할 때, 몇 요소까지 포함해서 백엔드로 보내야 하나요?
**A:** 제품 이미지들만 (텍스트/로고/현재 배경 제외).
**Ambiguity:** 46.5% (Goal: 0.75, Constraints: 0.55, Criteria: 0.15, Context: 0.65)

### Round 3
**Q:** 생성된 AI 배경이 '성공적'이라고 판단하는 가장 중요한 기준은 무엇인가요?
**A:** 배경이미지가 반환되는 경우.
**Ambiguity:** 30.25% (Goal: 0.80, Constraints: 0.60, Criteria: 0.65, Context: 0.70)

### Round 4 (Contrarian Mode)
**Q:** img2img 모드로 전환하면서 BACKGROUND_VARIANTS 구조를 어떻게 할지 결정해주세요.
**A:** Variant 완전 제거 - promptKo만 전달.
**Ambiguity:** 17.75% (Goal: 0.90, Constraints: 0.80, Criteria: 0.75, Context: 0.80) ✓ Threshold 통과

### Post-interview 교정
strength는 1.0이 아니라 0.9가 기본값(백엔드 `changeimage.json:18` `"denoise": 0.9`). `callApi.js:310` 교정 대상에 포함.

</details>
