# Backend API Guide

현재 백엔드 서버는 Express를 사용하여 구축되어 있으며, 모든 API 엔드포인트는 `/api` 경로를 기본으로 사용합니다.

## 서버 접속 시 "Cannot GET /" 오류 해결 방법
서버 실행 후 `http://127.0.0.1:4000` 접속 시 `Cannot GET /` 문구가 뜨는 것은 정상입니다. 루트 경로(`/`)가 정의되지 않았기 때문입니다.

서버가 살아있는지 확인하려면 아래의 헬스체크 경로를 이용하세요:
- **Health Check**: [http://127.0.0.1:4000/api/health](http://127.0.0.1:4000/api/health)

## 주요 API 엔드포인트

### 1. Editor Bootstrap
- **Path**: `GET /api/editor/bootstrap`
- **Description**: 에디터 실행에 필요한 기본 템플릿 및 추천 설정을 가져옵니다.

### 2. Background Generation
- **Path**: `POST /api/backgrounds/generate`
- **Description**: AI 기반 또는 그래픽 기반 배경 후보를 생성합니다.
- **Payload**:
  ```json
  {
    "templateId": "string",
    "backgroundMode": "solid | gradient | pastel | ai-image",
    "promptKo": "한글 프롬프트",
    "guideImage": "dataUrl (선택)",
    "guideSummary": "가이드 요약 (선택)"
  }
  ```

### 3. Background Removal
- **Path**: `POST /api/images/remove-background`
- **Description**: Hugging Face 모델을 사용하여 이미지의 배경을 제거합니다.
- **Payload**: `{ "imageDataUrl": "..." }`

### 4. Editing Bridge
- **Path**: `POST /api/bridge/editing` / `GET /api/bridge/editing/:token`
- **Description**: 초기 페이지와 에디팅 페이지 간의 데이터 전달을 위한 브릿지 역할을 합니다.

## 환경 설정 (.env)
백엔드 루트 또는 프로젝트 루트의 `.env` 파일에 다음 설정이 필요합니다:
- `HF_TOKEN`: Hugging Face API 토큰 (배경 제거 및 AI 이미지 생성용)
- `OPENAI_API_KEY`: 프롬프트 번역용 (선택 사항, 미설정 시 휴리스틱 번역 사용)
