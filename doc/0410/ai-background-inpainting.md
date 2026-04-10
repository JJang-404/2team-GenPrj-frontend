# AI 배경 생성 고도화: 인페인팅 및 GPT 번역 연동 가이드 (2026-04-10)

본 문서는 'AI 배경 생성' 기능을 단순 이미지 가이드 방식에서 **객체 보호(Inpainting)** 및 **GPT 자동 번역**이 결합된 고도화된 방식으로 업그레이드한 내용을 정리합니다.

## 1. 아키텍처 및 흐름도

1.  **프론트엔드 (Canvas)**: 현재 캔버스의 투명 배경 PNG를 캡처합니다.
2.  **마스크 생성 (Client)**: 캡처된 이미지에서 알파 값이 있는 곳을 검은색(보호), 없는 곳을 흰색(생성)으로 칠한 **흑백 마스크**를 생성합니다.
3.  **번역 및 템플릿 (API)**: 사용자가 입력한 한국어 설명을 요청받은 상세 영문 프롬프트 템플릿에 주입합니다.
4.  **백엔드 (API)**: 프롬프트에 포함된 한국어를 GPT를 통해 영어로 자동 번역하고, 마스크와 원본 이미지를 함께 모델 서버로 전송합니다.

## 2. 주요 변경 사항

### [Backend] D:\01.project\Backend_server\Backend1
- **`app/models/openai.py`**: `ChangeImageRequest` 클래스에 `mask_image_base64` 필드를 추가하여 마스크 데이터를 수용할 수 있게 했습니다.
- **`app/restapi/modelApi.py`**: `/changeimage` 엔드포인트에서 전달받은 마스크 데이터를 업스트림 가속화 엔진으로 전달하도록 구현했습니다.

### [Frontend] d:\01.project\2team-GenPrj-frontend_United\United1_1
- **`react/src/modules/editing/utils/canvas.ts`**: `generateInpaintMask` 유틸리티를 추가했습니다.
- **`react/src/modules/editing/components/sidebar/backgroundTokens.ts`**: 프롬프트 문자열에서 불필요한 `.trimEnd()`를 제거하여 띄어쓰기 입력을 보존했습니다.
- **`react/src/server/api/modelApi.js`**: `changeImage` 함수에 `maskBase64` 매개변수를 추가했습니다.
- **`react/src/server/api/callApi.js`**: `changeBackgroundWithImage` 함수를 고도화하여 마스크 생성 로직과 상세 영문 프롬프트 템플릿을 통합했습니다.
- **`react/src/modules/editing/App.tsx`**: `handleGenerateBackgrounds`의 API 호출 흐름을 업데이트하고 `promptHint`를 장면 묘사로 사용하도록 수정했습니다.

## 3. 영문 프롬프트 템플릿
생성 시 사용되는 프롬프트는 다음과 같은 구조로 조립됩니다 (백엔드에서 자동 번역됨).

```text
A high-quality commercial product photo.
The main subject is already present in the image.
DO NOT modify, redraw, or replace the subject in any way.
DO NOT paint over the subject.
DO NOT generate anything on top of the subject.
Only generate background in the empty or surrounding areas outside the subject.
The background must naturally match the subject in lighting, color tone, and perspective, creating a realistic and cohesive scene.

Style:
clean composition, soft natural lighting, realistic shadows, premium high-end photography.

Scene description:
{사용자 입력 한국어 문구}
```

## 4. 사용 방법 및 주의사항
- **객체 보호**: 마스크 이미지가 함께 전송되므로 `strength` 값을 0.45 내외로 설정하더라도 기존 상품의 형태가 매우 잘 유지됩니다.
- **띄어쓰기**: 'AI 이미지 생성 프롬프트' 창에서 자유롭게 띄어쓰기를 사용하여 상세한 묘사를 작성할 수 있습니다.
- **번역**: 한국어로 입력하셔도 백엔드의 GPT 로직이 문맥을 파악하여 최적의 영어 프롬프트로 변환합니다.
