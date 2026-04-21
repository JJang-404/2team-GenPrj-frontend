# AI 배경 생성 `_opt` 백엔드 JSON 응답 전환 — 구현 보고서

- 작성일: 2026-04-21
- 대상 레포: `D:\01.project\2team-GenPrj-backend`
- 관련 프런트 보고서: `doc/0421/ai-bg-changeimage-opt-report.md`
- 연관 스펙: `.omc/specs/deep-interview-ai-bg-changeimage-opt.md`
- 관련 컨트랙트 문서: `doc/0421/API_backend.md`

---

## 1. 목적

프런트엔드의 `modelApi.changeImageComfyUIOptAsync`가 `GET /addhelper/model/changeimagecomfyui_opt/jobs/{id}/result` 응답을
`{ positive_prompt, negative_prompt, image_base64, content_type }` **JSON**으로 파싱하도록 이미 구현되어 있으나,
기존 백엔드는 같은 엔드포인트에서 `Response(content=body, media_type="image/png")` 즉 **바이너리 PNG**를 반환하고 있어
런타임 시 `image_base64 undefined` → "응답에 image_base64가 없습니다." 오류로 3개 병렬 job이 전부 실패하는 상황이었다.

이 보고서는 **다른 엔드포인트(`changeimage`, `changeimagecomfyui`, `makebgimagecomfyui` 등)의 바이너리 응답 계약을 깨지 않으면서** `_opt` 계열만 JSON으로 전환한 최소 침습 변경을 기록한다.

---

## 2. 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `app/restapi/_model_job_store.py` | `base64` import 추가 / `_run_async_job_json`, `_create_async_job_json`, `_build_job_result_response_json` 3개 헬퍼 신규 추가 (기존 함수 무수정) |
| `app/restapi/_model_comfyui.py` | `_changeimagecomfyui_opt_sync_impl` 반환 시그니처를 `tuple[bytes, str]` → `tuple[bytes, str, str, str]`로 확장, `prompt_bundle.positive_prompt / negative_prompt` 상위로 노출 |
| `app/restapi/modelApi.py` | `_opt` 전용 3개 라우트만 JSON 헬퍼로 스위치, import 두 줄 추가 |

검증: `python -m py_compile app/restapi/_model_job_store.py app/restapi/_model_comfyui.py app/restapi/modelApi.py` **EXIT=0**.

---

## 3. `_model_job_store.py` 신규 헬퍼

### 3.1 `_run_async_job_json`

```python
def _run_async_job_json(
    job_kind: str,
    job_id: str,
    runner: Callable[[], tuple[bytes, str, str, str]],
) -> None:
    _update_async_job(job_kind, job_id, status="running")
    try:
        body, content_type, positive_prompt, negative_prompt = runner()
    except Exception as ex:
        print(f"[async-job Error] kind={job_kind}, job_id={job_id}, error={type(ex).__name__}: {ex}")
        _update_async_job(job_kind, job_id, status="failed", error=str(ex))
        return

    _update_async_job(
        job_kind, job_id,
        status="done", error=None,
        result_body=body, content_type=content_type,
        positive_prompt=positive_prompt, negative_prompt=negative_prompt,
    )
```

- 기존 `_run_async_job`의 2-tuple 계약을 건드리지 않고 나란히 존재
- 성공 시 job 레코드에 `positive_prompt` / `negative_prompt` 추가 필드를 기록

### 3.2 `_create_async_job_json`

- `_ASYNC_JOB_STORES[job_kind]`를 재사용 (kind는 `"changeimagecomfyui_opt"` 그대로)
- job 레코드 초기 슬롯에 `positive_prompt: None, negative_prompt: None` 추가
- worker 스레드로 `_run_async_job_json`을 호출

### 3.3 `_build_job_result_response_json`

```python
image_base64 = base64.b64encode(result_body).decode("ascii")
return JSONResponse(content={
    "positive_prompt": str(job.get("positive_prompt") or ""),
    "negative_prompt": str(job.get("negative_prompt") or ""),
    "image_base64": image_base64,
    "content_type": content_type,
})
```

- 404 / 409(queued·running) / 500(failed, 결과 없음)의 에러 분기는 기존 `_build_job_result_response`와 동일하게 JSON으로 반환
- **성공 본문만** 바이너리 → base64 JSON으로 변환
- `image_base64`는 **프리픽스(`data:...;base64,`) 없는 원본 base64** — 프런트 `modelApi.js`에서 `data:${content_type};base64,${image_base64}`로 조립

---

## 4. `_model_comfyui.py` 반환 시그니처 확장

### Before

```python
def _changeimagecomfyui_opt_sync_impl(req: ChangeImageComfyUiRequest_opt) -> tuple[bytes, str]:
    ...
    return _extract_first_comfyui_image(images)
```

### After

```python
def _changeimagecomfyui_opt_sync_impl(
    req: ChangeImageComfyUiRequest_opt,
) -> tuple[bytes, str, str, str]:
    ...
    image_bytes_out, content_type = _extract_first_comfyui_image(images)
    return (
        image_bytes_out,
        content_type,
        prompt_bundle.positive_prompt or "",
        prompt_bundle.negative_prompt or "",
    )
```

- `_build_comfyui_prompt_bundle_opt`가 이미 영문화된 positive/negative를 계산하고 있으므로, 결과를 폐기하지 않고 JSON 응답에 포함시키도록 통과시킴
- ComfyUI `client.change_image` 호출부는 불변

---

## 5. `modelApi.py` 라우트 스위치

### Before

```python
@router.post("/changeimagecomfyui_opt/jobs")
async def create_changeimagecomfyui_opt_job(req):
    job = _create_async_job("changeimagecomfyui_opt", lambda: _changeimagecomfyui_opt_sync_impl(req))
    return JSONResponse(content=job)

@router.get("/changeimagecomfyui_opt/jobs/{job_id}/result")
def get_changeimagecomfyui_opt_job_result(job_id: str) -> Response:
    return _build_job_result_response("changeimagecomfyui_opt", job_id)
```

### After

```python
@router.post("/changeimagecomfyui_opt/jobs")
async def create_changeimagecomfyui_opt_job(req):
    job = _create_async_job_json("changeimagecomfyui_opt", lambda: _changeimagecomfyui_opt_sync_impl(req))
    return JSONResponse(content=job)

@router.get("/changeimagecomfyui_opt/jobs/{job_id}/result")
def get_changeimagecomfyui_opt_job_result(job_id: str) -> JSONResponse:
    return _build_job_result_response_json("changeimagecomfyui_opt", job_id)
```

- `status` 엔드포인트는 기존 `_build_job_status_response` 그대로 사용 (이미 JSON 반환이라 문제 없음)
- 다른 6개 라우트(`generate`, `changeimage`, `makebgimageollama`, `makebgimage`, `generatecomfyui`, `changeimagecomfyui`, `makebgimagecomfyui`)는 `_create_async_job` / `_build_job_result_response` 원본 사용 — 바이너리 동작 유지

---

## 6. 계약 매핑 (프런트 ↔ 백엔드)

| 단계 | 프런트 기대 | 백엔드 반환 |
|------|------------|-------------|
| `POST /jobs` | `{ job_id }` | `{ "job_id": "<uuid>", "status": "queued" }` ✓ |
| `GET /jobs/{id}` (폴링) | `{ status: queued\|running\|done\|failed }` | `_build_job_status_response` ✓ |
| `GET /jobs/{id}/result` 성공 | `{ image_base64, content_type, positive_prompt, negative_prompt }` | `_build_job_result_response_json` ✓ |
| `GET /jobs/{id}/result` 409 | `pollJobStatus`가 폴링 유지 | `JSONResponse(409, {detail})` ✓ |
| `GET /jobs/{id}/result` 500 | `{ ok:false, error }` 로 정규화 | `JSONResponse(500, {detail})` ✓ |

- `image_base64` 프리픽스 **없음** — 프런트가 `data:${content_type};base64,${image_base64}`로 조립 (프런트 `modelApi.js`의 `changeImageComfyUIOptAsync` 내 로직)

---

## 7. 영향 범위 / 회귀 위험

| 대상 | 영향 |
|------|------|
| `/model/generate/jobs/{id}/result` | 변경 없음 (기존 바이너리 동작 유지) |
| `/model/changeimage/jobs/{id}/result` | 변경 없음 |
| `/model/makebgimage*/jobs/{id}/result` | 변경 없음 |
| `/model/changeimagecomfyui/jobs/{id}/result` | 변경 없음 — (비-opt ComfyUI 콜러 그대로) |
| `/model/changeimagecomfyui_opt/jobs` 3개 | **JSON 전환 (대상)** |

- `_ASYNC_JOB_STORES["changeimagecomfyui_opt"]` 딕셔너리는 재사용되지만, 값 스키마에 `positive_prompt`/`negative_prompt`가 추가되어도 `_build_job_status_response`는 `status`/`error`만 읽으므로 영향 없음
- 바이너리 경로의 `_build_job_result_response`는 불변

---

## 8. 검증

- **구문 검사**: `python -m py_compile app/restapi/_model_job_store.py app/restapi/_model_comfyui.py app/restapi/modelApi.py` → exit 0
- **수동 확인 권장 항목**
  - [ ] 백엔드 재기동 후 `POST /addhelper/model/changeimagecomfyui_opt/jobs` (opt=0/1/2) 3회 요청 → 각 응답에 `job_id`
  - [ ] `GET .../jobs/{id}` 폴링이 `queued → running → done`으로 수렴
  - [ ] `GET .../jobs/{id}/result` 응답 Content-Type이 `application/json`이며 4개 필드를 모두 포함
  - [ ] `image_base64`를 base64 디코드하면 PNG 매직바이트(`89 50 4E 47`)로 시작
  - [ ] 프런트 editing 화면 "AI 배경 생성" 클릭 → 후보 3장 표시, 첫 번째 자동 선택, 실패 alert 없음
  - [ ] 비-opt 엔드포인트(기존 `changeimage`/`changeimagecomfyui` 등) 호출 경로 회귀 없음

---

## 9. 후속 정리(선택)

- `_build_job_result_response` / `_build_job_result_response_json` 간 중복 로직(404/409/500 분기)을 내부 헬퍼로 통합 가능
- `prompt_bundle.positive_prompt / negative_prompt`가 빈 문자열이면 프런트에서 어떻게 표시할지(placeholder vs hide) 정책 확정 필요 (현재는 `""` 그대로 전달)
- 다른 비-opt 엔드포인트도 JSON 컨트랙트로 점진 이관 시 이 헬퍼 3종을 재사용해 마이그레이션 비용 최소화 가능
