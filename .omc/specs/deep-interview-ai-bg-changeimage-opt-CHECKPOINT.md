# Deep Interview Checkpoint: AI 배경 생성 → `_opt` 비동기 API + UI disable

> **상태**: 진행 중 (Round 1·2 완료, Round 3 질문 송출 직전)
> **목적**: 세션 재시작 후 이어서 인터뷰를 진행하기 위한 체크포인트
> **저장 시각**: 2026-04-21 (Round 2 답변 반영)

---

## 0. 빠른 재개 가이드 (세션 재시작 후)

```
1) .omc/specs/deep-interview-ai-bg-changeimage.md 읽기 (Phase B 이미 합의된 사양)
2) 이 파일(deep-interview-ai-bg-changeimage-opt-CHECKPOINT.md) 읽기
3) doc/0421/API_backend.md §2 (ComfyUI ChangeImage opt 비동기 API) 참고
4) Round 3 질문(Goal Clarity — opt 값/strength 확정)부터 다시 제시
5) 남은 차원(Goal/Context) 스코어가 임계값(20%) 이하로 떨어질 때까지 인터뷰 계속
6) 완료 시 최종 spec 파일 `.omc/specs/deep-interview-ai-bg-changeimage-opt.md`로 크리스털라이즈
```

---

## 1. 현재 작업의 맥락

### 1-1. 선행 사양 (Phase B, 완료)
- 파일: `.omc/specs/deep-interview-ai-bg-changeimage.md`
- 요지: text2img → img2img 전환, `mainPreviewRef` html2canvas 캡처, variant 제거, strength 0.9
- 이 사양 위에 Phase C(현재)가 쌓임

### 1-2. Phase C (현재 인터뷰) 사용자 원문 요구사항
```
@doc/0421/API_backend.md 이 파일 참조해줘.
'AI 배경 생성'할때 ComfyUI ChangeImage (opt) 비동기 API 를 참조해서
연동하는 방법을 적용할거야.
@react/src/server 폴더는 Api 파일 경로야.
비동기가 진행되는 동안에는 다른 화면에 기능을 disable 할거야.
```

세 가지 추가 요구사항:
1. **`_opt` variant 사용**: 기존 `/changeimagecomfyui/jobs` → `/changeimagecomfyui_opt/jobs`
2. **API 파일 경로 인지**: `react/src/server/api/` (modelApi.js, callApi.js 등)
3. **비동기 중 UI disable**: 다른 화면의 기능 잠금

---

## 2. `_opt` variant 사실 (from doc/0421/API_backend.md §2)

### 2-1. 엔드포인트
```
POST /addhelper/model/changeimagecomfyui_opt/jobs
GET  /addhelper/model/changeimagecomfyui_opt/jobs/{job_id}
GET  /addhelper/model/changeimagecomfyui_opt/jobs/{job_id}/result
```

### 2-2. 요청 바디 (`ChangeImageComfyUiRequest_opt`)
```json
{
  "opt": 0,
  "prompt": "...",
  "positive_prompt": "...",
  "negative_prompt": "...",
  "image_base64": "data:image/png;base64,...",
  "strength": 0.45
}
```
- **기존(non-opt)과의 차이**: `opt: int` 필드 추가
- 문서 기본 strength: `0.45` (단, Phase B에서 확정한 0.9는 `changeimage.json:18` 기본값 기준이므로 재확인 필요)

### 2-3. 응답 (성공 시 **JSON**, blob 아님)
```json
{
  "positive_prompt": "...",
  "negative_prompt": "...",
  "image_base64": "...",
  "content_type": "image/png"
}
```
- **기존 async 패턴과의 차이**: 기존 `runImageJob`/`fetchJobResult`는 blob 반환. `_opt`는 JSON 파싱 후 `image_base64`를 data URL로 변환해 사용해야 함.

### 2-4. 상태 값
`queued | running | done | failed` (기존과 동일)

---

## 3. 프론트엔드 코드 현황 (Phase C 시작 시점)

### 3-1. API 레이어
- `react/src/server/api/modelApi.js`
  - 공통 유틸: `stripBase64Prefix` (line 5-10), `pollJobStatus` (67-103), `fetchJobResult` (106-131)
  - 기존 (non-opt): `changeImageComfyUIAsync` (line 155, `/changeimagecomfyui/jobs`)
  - 래퍼: `changeImage` (line 187)
  - **신규 추가 필요**: `changeImageComfyUIOptAsync` → `/changeimagecomfyui_opt/jobs`
    - 반환 형태가 JSON이므로 `fetchJobResult`와 별도 처리 필요
- `react/src/server/api/callApi.js:310`
  - 현재: `modelApi.changeImage(prompt, imageBase64, 1.0, '', negativePrompt)`
  - 목표: `modelApi.changeImageOpt(prompt, imageBase64, strength, '', negativePrompt, opt=0)` 또는 유사 시그니처

### 3-2. UI 레이어
- `react/src/modules/editing/App.tsx`
  - 캡처 루트: `<div className="workspace__main-preview" ref={mainPreviewRef}>` (line 951)
  - AI 분기: `handleGenerateBackgrounds` (line 464-556)
  - Phase B에서 정리된 항목(아직 구현 전): variant 제거, html2canvas 캡처 추가
- `react/src/modules/editing/utils/canvas.ts`: `captureElementAsDataUrl` 재사용 가능
- **로딩 오버레이 컴포넌트 존재 여부**: 아직 미확인 (Context Clarity 감점 사유)

---

## 4. 인터뷰 진행 기록

### Round 1 (완료)

**Q (Constraint Clarity 타게팅)**: 비동기 'AI 배경 생성' 진행 중 UI disable의 '범위와 방식'은 어떻게 할까요?

**Options 제시**:
1. editing 화면 전역 오버레이 (Recommended)
2. 특정 버튼/섹션만 disabled
3. 전역(앱 전체) 블로킹 모달
4. 비블로킹 토스트 + 배경 버튼만 잠금

**A**: **Option 1 — editing 화면 전역 오버레이** 선택

**결정 내용**:
- editing 모듈 전체에 반투명 로딩 오버레이로 모든 클릭/입력 차단
- 스피너 + 진행 문구 표시
- 다른 라우트(onboarding/ad-design/result)는 영향 없음
- 가장 단순·안전한 범위

**Ambiguity 변화**: 100% → 36.4%

| Dimension | Score | Weight | Weighted | Gap |
|-----------|-------|--------|----------|-----|
| Goal | 0.75 | 0.35 | 0.263 | `opt` 필드 값 / strength 최종값 미확정 |
| Constraints | 0.70 | 0.25 | 0.175 | 오버레이 세부 UX(취소/진행도) 미정 |
| Success Criteria | 0.40 | 0.25 | 0.100 | 성공·실패·타임아웃 시 UI 복귀 경로 미정 |
| Context (brownfield) | 0.65 | 0.15 | 0.098 | 기존 로딩 오버레이 컴포넌트 존재 여부 미확인 |
| **Total Clarity** | | | **0.636** | |
| **Ambiguity** | | | **36.4%** | |

### Round 2 (완료)

**Q (Success Criteria 타게팅)**: async job이 끝나면 overlay 해제·결과 반영·에러 처리를 어떻게 할까요?

**Options**:
1. done=후보 추가+overlay 해제 / failed=alert+overlay 해제 (Recommended)
2. 성공/실패 모두 overlay 내에서 노출 + 재시도 버튼
3. 성공 시 조용히 후보 추가 / 실패 시 토스트만 표시
4. 성공·실패 모두 조용히 종료 (현재 에러 흐름 유지)

**A**: **Option 1 — done=후보 추가+overlay 해제 / failed=alert+overlay 해제** 선택

**결정 내용**:
- `status === 'done'` 수신 시: result JSON에서 `image_base64` 파싱 → data URL 변환 → `backgroundCandidates`에 push → overlay 제거
- `status === 'failed'` 또는 polling 타임아웃 시: `window.alert(errorMessage)` (기존 패턴) → overlay 제거
- overlay 내 재시도 버튼 없음. 사용자는 'AI 배경 생성' 버튼을 다시 눌러 재시작
- 타임아웃 기준: `runImageJob` 기본 10분 준용
- try/catch는 기존 `handleGenerateBackgrounds` 구조 유지하되, finally 블록에서 overlay state를 false로 복귀

**Ambiguity 변화**: 36.4% → 24.4%

| Dimension | Score | Weight | Weighted | Gap |
|-----------|-------|--------|----------|-----|
| Goal | 0.75 | 0.35 | 0.263 | `opt` 필드 값 / strength 최종값 미확정 |
| Constraints | 0.78 | 0.25 | 0.195 | overlay 진행 문구 텍스트 미정(경미) |
| Success Criteria | 0.80 | 0.25 | 0.200 | 타임아웃 기준(10분 기본값 준용) |
| Context (brownfield) | 0.65 | 0.15 | 0.098 | 기존 로딩 오버레이 컴포넌트 존재 여부 미확인 |
| **Total Clarity** | | | **0.756** | |
| **Ambiguity** | | | **24.4%** | |

### Round 3 (다음 질문 — Goal Clarity 타게팅)

**Q**: `_opt` variant에 전달할 **`opt` 필드 값**과 **`strength` 값**을 확정해주세요.
- 문서 `doc/0421/API_backend.md` 예시: `opt: 0`, `strength: 0.45`
- Phase B 사양 (non-opt 기준): `strength: 0.9` (백엔드 `changeimage.json:18` `"denoise": 0.9`)
- 두 값이 불일치 — `_opt` 워크플로우가 별도라면 0.45, 같은 워크플로우를 공유하면 0.9

**Options 초안** (실제 질문 시점에 확정):
1. `opt=0`, `strength=0.9` (기존 Phase B 합의값 유지, Recommended)
2. `opt=0`, `strength=0.45` (문서 예시 그대로)
3. 사용자가 직접 값 지정

**A**: _(미답변 — 재개 시 이 질문부터 제시)_

---

## 5. 차기 인터뷰 단계 로드맵 (예상)

Round 2 답변 후 남은 차원별 예상 질문:

### Round 3 (Goal Clarity 예상)
- `opt` 필드 값: 0으로 고정? 다른 값 사용 가능성?
- strength 최종값: 0.45 (문서) vs 0.9 (백엔드 workflow JSON) — 어느 쪽이 실제 기본값?

### Round 4 (Context Clarity 예상)
- 기존 로딩 오버레이 컴포넌트 재사용 vs 신규 작성 — 현재 `editing` 모듈에 로딩/진행 UI 가 있는지 확인

### Round 4+ (Contrarian Mode, 조건부)
- 전역 오버레이가 정말 필요한가? 배경 생성 중에도 제품 위치 편집을 허용할 수는 없는가?

### Round 6+ (Simplifier Mode, 조건부)
- non-opt async를 이미 구현해둔다면, _opt 분기를 옵션으로만 켜는 접근 vs 완전 교체

---

## 6. 확정된 구현 범위 (Round 1·2 기준)

### 신규 추가
- **`modelApi.js`**: `changeImageComfyUIOptAsync(payload)` 함수 추가
  - `POST /addhelper/model/changeimagecomfyui_opt/jobs`
  - status 폴링(`pollJobStatus` 재사용 가능)
  - result는 JSON 파싱 → `image_base64`를 data URL로 변환 후 반환
  - 타임아웃: 10분 (`runImageJob` 기본값 준용)
- **editing 모듈 오버레이**: 반투명 배경 + 중앙 스피너 + 진행 문구
  - 활성 조건: `isGeneratingAiBackground === true`
  - click-through 차단 (pointer-events: auto)
- **완료/에러 처리 (Round 2 결정)**:
  - `done`: result를 `backgroundCandidates`에 push → overlay 해제
  - `failed` 또는 타임아웃: `window.alert(errorMessage)` → overlay 해제
  - try/catch + finally에서 overlay state를 false로 복귀 보장
  - overlay 내 재시도 버튼 없음 (사용자가 AI 배경 생성 버튼 재클릭)

### 기존 Phase B 항목 (변경 없음)
- `BACKGROUND_VARIANTS` 제거
- `mainPreviewRef` html2canvas 캡처
- `data-html2canvas-ignore` 컨벤션

### 재확인 필요
- strength 최종값 (0.45 vs 0.9) → Round 3에서 확인 예정
- `opt` 필드 값 (0 고정 여부) → Round 3에서 확인 예정
- 기존 오버레이 컴포넌트 존재 여부 → Round 4에서 explore

---

## 7. State 파일 참조

```json
{
  "active": true,
  "current_phase": "deep-interview",
  "state": {
    "interview_id": "ai-bg-opt-2026-04-21",
    "type": "brownfield",
    "initial_idea": "AI 배경 생성을 _opt 비동기 API로 연동 + 비동기 중 UI disable",
    "rounds": [
      {
        "round": 1,
        "dimension_targeted": "Constraint Clarity",
        "question": "비동기 'AI 배경 생성' 진행 중 UI disable의 '범위와 방식'은 어떻게 할까요?",
        "answer": "editing 화면 전역 오버레이 (Option 1)",
        "scores": {
          "goal": 0.75,
          "constraints": 0.70,
          "criteria": 0.40,
          "context": 0.65
        },
        "ambiguity": 0.364
      },
      {
        "round": 2,
        "dimension_targeted": "Success Criteria",
        "question": "async job이 끝나면 overlay 해제·결과 반영·에러 처리를 어떻게 할까요?",
        "answer": "done=후보 추가+overlay 해제 / failed=alert+overlay 해제 (Option 1)",
        "scores": {
          "goal": 0.75,
          "constraints": 0.78,
          "criteria": 0.80,
          "context": 0.65
        },
        "ambiguity": 0.244
      },
      {
        "round": 3,
        "dimension_targeted": "Goal Clarity",
        "question": "opt 필드 값과 strength 값 확정 (0.9 vs 0.45)",
        "answer": null,
        "status": "pending_answer"
      }
    ],
    "current_ambiguity": 0.244,
    "threshold": 0.2,
    "challenge_modes_used": [],
    "ontology_snapshots": [
      {
        "round": 1,
        "entities": [
          {"name": "ProductImage", "type": "core domain", "status": "stable"},
          {"name": "MainPreview", "type": "core domain", "status": "stable"},
          {"name": "CaptureRoot", "type": "supporting", "status": "stable"},
          {"name": "BackgroundPrompt", "type": "supporting", "status": "stable"},
          {"name": "ChangeImageOptApi", "type": "external system", "status": "changed (was ChangeImageApi — adds opt field + JSON response)"},
          {"name": "LoadingOverlay", "type": "supporting", "status": "new"}
        ],
        "stability_ratio": 0.83
      },
      {
        "round": 2,
        "entities": [
          {"name": "ProductImage", "type": "core domain", "status": "stable"},
          {"name": "MainPreview", "type": "core domain", "status": "stable"},
          {"name": "CaptureRoot", "type": "supporting", "status": "stable"},
          {"name": "BackgroundPrompt", "type": "supporting", "status": "stable"},
          {"name": "ChangeImageOptApi", "type": "external system", "status": "stable"},
          {"name": "LoadingOverlay", "type": "supporting", "status": "stable"}
        ],
        "stability_ratio": 1.00,
        "note": "Round 2는 UX 흐름 결정으로 신규 엔티티 없음 — 완전 수렴"
      }
    ]
  }
}
```