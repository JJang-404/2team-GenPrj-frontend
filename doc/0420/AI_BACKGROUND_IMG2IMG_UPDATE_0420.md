# 2026-04-20 AI 배경 생성 img2img 전환 정리

## 수정 및 변경사항

### 프론트엔드
- `react/src/modules/editing/App.tsx`
  - `BACKGROUND_VARIANTS`, `GENERATE_VARIANT_COUNT`, variant 기반 후보 생성 로직 제거
  - AI 배경 생성 시 병렬 text-to-image 대신 단일 img2img 호출로 변경
  - 제품 이미지만 포함하는 전용 캡처 캔버스(`aiGuideCaptureRef`) 추가
  - `renderElements.filter(isPrimaryImageElement)` 결과만 캡처해 `imageBase64`로 백엔드 전송
  - 사용자 프롬프트는 `promptKo` 그대로 전달
- `react/src/server/api/callApi.js`
  - `modelApi.changeImage(..., strength)` 값을 `1.0`에서 `0.9`로 조정
  - 백엔드 `data/comfyui/changeimage.json`의 `denoise: 0.9`와 일치하도록 정렬

### 백엔드
- `docs/API.md`
  - `changeimagecomfyui/jobs` 예시 strength 기본값을 `0.9`로 수정
  - `changeimagecomfyui`가 `data/comfyui/changeimage.json` 워크플로우를 사용한다는 설명 추가

## 변경 목적

- 기존 `AI 배경 생성`은 텍스트 프롬프트만 보내는 text-to-image 경로였습니다.
- 이번 변경으로 제품이 배치된 구도를 기준 이미지로 함께 보내는 img2img 경로로 전환했습니다.
- 목표는 제품 위치와 구도를 유지하면서 배경 이미지만 생성하도록 만드는 것입니다.

## 최종 데이터 흐름

1. 사용자가 `AI 배경 생성` 클릭
2. 프론트 `App.tsx`가 숨겨진 캡처 캔버스에서 제품 이미지 요소만 렌더
3. `captureElementAsDataUrl()`로 PNG Base64 생성
4. `callApi.generateBackground({ customPrompt: promptKo, imageBase64 })` 호출
5. `callApi.js`가 `imageBase64` 존재를 감지하고 `modelApi.changeImage(...)` 실행
6. 프론트는 `/addhelper/model/changeimagecomfyui/jobs`로 요청
7. 백엔드는 `app/restapi/_model_comfyui.py`에서 `image_base64`를 디코딩하고 `client.change_image(...)` 호출
8. `app/models/comfyui.py`가 `data/comfyui/changeimage.json`을 사용해 ComfyUI에 작업 전달
9. 응답 Blob을 프론트가 카드 후보로 추가하고 캔버스 배경으로 적용

## 캡처 범위 정책

- 포함:
  - 제품 이미지 요소만
- 제외:
  - 텍스트
  - 로고
  - 현재 선택된 배경
  - 선택/리사이즈 UI 핸들

## 수정 파일

- 프론트
  - `react/src/modules/editing/App.tsx`
  - `react/src/server/api/callApi.js`
- 백엔드
  - `docs/API.md`

## 확인 포인트

- 제품 이미지가 하나도 없으면 AI 배경 생성이 실패 메시지를 반환해야 합니다.
- AI 배경 생성 요청은 `generatecomfyui`가 아니라 `changeimagecomfyui/jobs` 경로를 타야 합니다.
- 전송되는 strength는 `0.9`여야 합니다.
- 생성 결과가 반환되면 배경 후보 1개가 추가되고 즉시 선택됩니다.
