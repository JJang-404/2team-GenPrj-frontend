# Deep Interview Spec: AI 배경 생성 → `_opt` 비동기 API (3개 병렬) + editing 전역 오버레이

## Metadata
- Interview ID: ai-bg-opt-2026-04-21
- Rounds: 4
- Final Ambiguity Score: 13.8%
- Type: brownfield
- Generated: 2026-04-21
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.92 | 0.35 | 0.322 |
| Constraint Clarity | 0.80 | 0.25 | 0.200 |
| Success Criteria | 0.85 | 0.25 | 0.213 |
| Context Clarity | 0.85 | 0.15 | 0.128 |
| **Total Clarity** | | | **0.862** |
| **Ambiguity** | | | **13.8%** |

---

## Goal

editing 모듈의 `handleGenerateBackgrounds`가 `/addhelper/model/changeimagecomfyui_opt/jobs` 비동기 API를 `opt=0/1/2` 세 값으로 **병렬 호출**해 3개의 배경 샘플을 동시에 생성하고, 생성 중에는 editing 화면 전역에 클릭 차단 오버레이를 띄워 사용자 조작을 잠근다. 성공한 샘플만 `backgroundCandidates`에 일괄 push하며, 전부 실패하면 alert 후 오버레이를 해제한다.

---

## Constraints

- **API 엔드포인트 고정**: `POST /addhelper/model/changeimagecomfyui_opt/jobs` + 상태 폴링 + `/result` JSON 조회
- **요청 바디**: `{ opt, prompt, positive_prompt, negative_prompt, image_base64, strength: 0.9 }` (opt는 0/1/2 세 값)
- **응답 형식**: JSON (`{ positive_prompt, negative_prompt, image_base64, content_type }`) — 기존 `runImageJob`의 blob 반환과 다름
- **strength 고정**: 0.9 (백엔드 `changeimage.json:18` `denoise=0.9` 기본값과 일치, Phase B 합의값 유지)
- **병렬 처리**: `Promise.allSettled`로 3개 job을 동시 실행, 모두 완료될 때까지 대기
- **overlay 범위**: editing 모듈 전역, 모든 클릭/입력 차단, 스피너 + 진행 문구 표시
- **overlay 해제 시점**: 3개 job 전부 완료 후 (성공/실패 무관 전체 끝나야 해제)
- **다른 라우트 영향 없음**: onboarding/ad-design/result 라우트는 정상 동작
- **캡처 루트**: `mainPreviewRef` (workspace__main-preview div), html2canvas로 data URL 변환
- **타임아웃**: 10분 (`runImageJob` 기본값 준용, 초과 시 실패 처리)
- **이미지 변환**: `_opt` 응답의 `image_base64`는 `content_type`과 조합해 data URL로 복원 후 `backgroundCandidates`에 push

## Non-Goals

- 취소 버튼 (overlay 내부에 재시도/취소 UI 없음 — 사용자는 AI 배경 생성 버튼 재클릭으로 재시작)
- 진행도 %바 (단순 스피너 + 문구)
- opt별 서로 다른 prompt 주입 (3개 job 모두 동일한 prompt/positive_prompt/negative_prompt 사용, opt 값만 다름)
- non-opt 엔드포인트 호환/폴백 (완전 교체)
- variant 로컬 생성 (Phase B에서 이미 제거됨)

## Acceptance Criteria

- [ ] `modelApi.js`에 `changeImageComfyUIOptAsync({ opt, prompt, positive_prompt, negative_prompt, image_base64, strength })` 함수가 추가되어 `/addhelper/model/changeimagecomfyui_opt/jobs`로 POST → 상태 폴링 → `/result` JSON을 data URL로 변환해 반환한다.
- [ ] `handleGenerateBackgrounds`가 `opt=0/1/2`로 세 번 호출하는 Promise를 `Promise.allSettled`로 대기한다.
- [ ] 호출 시작 시 editing 전역 오버레이(`isGeneratingAiBackground === true`)가 표시되고 모든 클릭/입력이 차단된다.
- [ ] 3개 job 전부 완료되기 전에는 오버레이가 해제되지 않는다.
- [ ] 1개 이상 성공 시: 성공한 결과만 `backgroundCandidates`에 push하고 오버레이를 조용히 해제한다(alert 없음).
- [ ] 3개 모두 실패 시: `window.alert(errorMessage)` 표시 후 오버레이를 해제한다.
- [ ] try/catch + finally에서 overlay state가 반드시 false로 복귀한다.
- [ ] 다른 라우트(onboarding/ad-design/result)는 오버레이의 영향을 받지 않는다.
- [ ] `BACKGROUND_VARIANTS` 관련 잔여 코드가 없고, `mainPreviewRef` html2canvas 캡처가 각 opt 호출에 재사용된다(캡처는 1회, 동일 base64를 3개 job에 전달).
- [ ] `callApi.js:310` 호출부가 `changeImageComfyUIOptAsync`를 사용하도록 변경된다.

## Assumptions Exposed & Resolved

| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 1개 job으로 1개 샘플 반환 | Round 3에서 "opt 값은?" 질문 | opt=0/1/2 3개 병렬 job → 3개 샘플 반환 |
| strength는 문서 예시인 0.45가 기본값 | Phase B에서 이미 0.9 합의 vs 문서 예시 0.45 충돌 | strength=0.9 확정 (백엔드 workflow 기본값 + Phase B 일관) |
| 부분 실패 시 모두 취소 | Round 4 Promise.allSettled 논의 | 성공한 것만 반영, 전부 실패 시에만 alert |
| overlay 해제는 첫 완료 시 | Round 4에서 "모두 완료 후 일괄 처리" 선택 | 3개 전부 종료 후 해제 |
| 기존 로딩 오버레이 재사용 가능 | explore grep: `Overlay/Spinner/Loading` | editing에 `loading` empty-panel만 존재, 클릭 차단 오버레이 없음 → 신규 작성 |
| `_opt` 응답은 기존 async와 동일하게 blob | 문서 §2-3 명시 | JSON 응답, `image_base64` + `content_type`을 data URL로 조합 |

## Technical Context

### 수정 대상 파일

| 파일 | 역할 | 변경 |
|------|------|------|
| `react/src/server/api/modelApi.js` | 공통 폴링 유틸 + 기존 `changeImageComfyUIAsync` | `changeImageComfyUIOptAsync` 신규 추가 (JSON result 처리 분기) |
| `react/src/server/api/callApi.js:310` | 현재 `modelApi.changeImage(...)` 호출 | `changeImageComfyUIOptAsync` 래퍼 또는 직접 호출로 변경 |
| `react/src/modules/editing/App.tsx` | `handleGenerateBackgrounds` (line 464-556) + `isGeneratingAiBackground` state 추가 | `Promise.allSettled([opt=0, opt=1, opt=2])`, finally에서 overlay 해제 |
| `react/src/modules/editing/App.tsx` | 렌더 트리 (line 946 주변) | 신규 오버레이 JSX 추가, `isGeneratingAiBackground` 조건부 렌더 |
| `react/src/modules/editing/utils/canvas.ts` | `captureElementAsDataUrl` | 재사용 (1회 캡처 후 3개 job 공유) |

### 신규 생성
- **editing 전역 오버레이 컴포넌트** (인라인 혹은 별도 파일): 반투명 배경 + 중앙 스피너 + "AI 배경 생성 중..." 같은 문구, `pointer-events: auto`, `z-index` 충분히 높게, editing root DOM 내부에 배치
- `modelApi.changeImageComfyUIOptAsync`: payload에 `opt` 필드 포함, result는 JSON → `const dataUrl = \`data:\${content_type};base64,\${image_base64}\`` 형태로 변환

### 재사용 / 변경 없음
- `pollJobStatus` (modelApi.js:67-103) — 상태 폴링 로직 공용
- `stripBase64Prefix` (modelApi.js:5-10) — 이미지 base64 정규화
- `backgroundCandidates` state 관리 기존 패턴

### 엔드포인트 요약
```
POST /addhelper/model/changeimagecomfyui_opt/jobs      (body: ChangeImageComfyUiRequest_opt)
GET  /addhelper/model/changeimagecomfyui_opt/jobs/{id}
GET  /addhelper/model/changeimagecomfyui_opt/jobs/{id}/result
```

---

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| ProductImage | core domain | mainPreviewRef 기반 base64 | captured from MainPreview |
| MainPreview | core domain | workspace__main-preview div | contains ProductImage |
| CaptureRoot | supporting | ref | wraps EditorCanvas |
| BackgroundPrompt | supporting | prompt/positive/negative | input to ChangeImageOptApi |
| ChangeImageOptApi | external system | opt, strength=0.9, image_base64 | called 3x in parallel (opt=0/1/2) |
| LoadingOverlay | supporting | isGeneratingAiBackground | covers editing module |
| ParallelJobBatch | supporting | 3개 job Promise.allSettled | results → backgroundCandidates |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability |
|-------|-------------|-----|---------|--------|-----------|
| 1 | 6 | 6 | - | - | N/A |
| 2 | 6 | 0 | 0 | 6 | 100% |
| 3 | 7 | 1 (ParallelJobBatch) | 0 | 6 | 85.7% |
| 4 | 7 | 0 | 0 | 7 | 100% |

---

## Interview Transcript

<details>
<summary>Full Q&A (4 rounds)</summary>

### Round 1 (Constraint Clarity)
**Q:** 비동기 'AI 배경 생성' 진행 중 UI disable의 범위와 방식?
**A:** editing 화면 전역 오버레이 (Option 1)
**Ambiguity:** 36.4%

### Round 2 (Success Criteria)
**Q:** async job 종료 시 overlay 해제·결과 반영·에러 처리?
**A:** done=후보 추가+overlay 해제 / failed=alert+overlay 해제 (Option 1)
**Ambiguity:** 24.4%

### Round 3 (Goal Clarity)
**Q:** `_opt` variant의 `opt` 필드 값과 `strength` 값 확정?
**A:** opt=0/1/2 세 값을 병렬 실행해 3개 샘플 반환 (strength는 Round 4 직후 0.9로 추가 확정)
**Ambiguity:** 34.5% (scope 확장으로 일시 상승)

### Round 4 (Success Criteria — 재타게팅)
**Q:** 3개 병렬 job 중 부분 실패 시 처리 방식?
**A:** 모두 완료 후 일괄 처리 (Promise.allSettled) — 성공한 것만 반영, 전부 실패 시 alert (Option 1)
**Side-answer:** strength=0.9 확정
**Ambiguity:** 13.8% — PASSED

</details>
