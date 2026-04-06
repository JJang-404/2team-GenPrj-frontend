# frontend_2 광고 편집 데모

`frontend_2`는 `frontend_1`의 입력 화면 다음 단계로 이어지는 광고 편집 데모 프런트입니다.  
템플릿 선택, 배경 후보 생성, 최종 편집, PNG 저장까지 한 흐름으로 묶여 있습니다.

- 프런트 경로: `gen_prj/2team-GenPrj-frontend/frontend_2`
- 백엔드 경로: `gen_prj/2team-GenPrj-backend`
- 공용 `.env` 경로: `gen_prj/.env`

## 실행 방법

백엔드:

```bash
cd gen_prj/2team-GenPrj-backend
npm install
npm start
```

프런트:

```bash
cd gen_prj/2team-GenPrj-frontend/frontend_2
npm install
npm run dev
```

빌드 확인:

```bash
cd gen_prj/2team-GenPrj-frontend/frontend_2
npm run build
```

기본 주소:

- 프런트: `http://localhost:5174`
- 백엔드: `http://127.0.0.1:4000`

프런트는 [vite.config.ts](gen_prj/2team-GenPrj-frontend/frontend_2/vite.config.ts)에서 `/api`를 `http://localhost:4000`으로 프록시합니다.

## 전체 흐름

1. 초기 화면에서 가게 이름, 광고 문구, 상세 지시사항, 추가 정보, 제품 정보를 입력합니다.
2. 제품 이미지를 올리면 백엔드 `/api/images/remove-background`로 보내 자동 배경 제거를 시도합니다.
3. 우측 4개 초안 카드 중 하나를 누르면 해당 인덱스에 맞는 템플릿으로 바로 이동합니다.
4. 템플릿 위에 사용자 제품, 문구, 추가 정보가 주입됩니다.
5. 현재 레이아웃을 투명 guide image로 캡처해서 배경 후보를 생성합니다.
6. 배경 후보를 고른 뒤 최종 편집 단계에서 객체를 이동, 회전, 크기조절, 투명도 조절 후 PNG로 저장합니다.

## frontend_1 과의 관계

현재 기준:

- `frontend_2`의 초기 화면은 `frontend_1`/`sample_ver5` 구조를 참고해 같은 계열 UI로 다시 구현한 상태입니다.
- 즉 지금은 `frontend_1` 화면을 iframe이나 route로 직접 재사용하는 구조가 아니라, `frontend_2/src/components/InitialHome.tsx` 안에 별도 구현이 들어 있습니다.

기준 파일:

- `gen_prj/2team-GenPrj-frontend/frontend_1/src/App.jsx`
- `2team-GenPrj/2team-GenPrj-frontend/sample_ver5/frontend/src/App.jsx`

### frontend_1 과 똑같이 맞추려면

- 초기 입력 UI 수정: [InitialHome.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/InitialHome.tsx)
- 초기 화면 스타일 수정: [global.css](gen_prj/2team-GenPrj-frontend/frontend_2/src/styles/global.css)
- 필요하면 `frontend_1`의 입력 필드를 `HomeProjectData` 타입에 맞춰 그대로 복사한 뒤 `onStart(payload)`로 넘기면 됩니다.

### frontend_1 과 실제 데이터 연결 기준

`frontend_2`는 최종적으로 아래 구조의 데이터를 받으면 됩니다.

파일:

- 타입 정의: [editor.ts](gen_prj/2team-GenPrj-frontend/frontend_2/src/types/editor.ts)

핵심 타입:

```ts
HomeProjectData = {
  options: {
    ratio: string;
    sampleCount: number;
    concept: string;
    brandColor: string;
  };
  storeName: string;
  mainSlogan: string;
  details: string;
  products: HomeProductInput[];
  additionalInfo: {
    parkingSpaces: string;
    petFriendly: boolean;
    noKidsZone: boolean;
    smokingArea: boolean;
    elevator: boolean;
    phoneNumber: string;
    address: string;
  };
}
```

즉 `frontend_1`에서 이 구조로 payload를 만들고 `frontend_2`의 `handleStartFromHome`과 같은 형태로 넘기면 됩니다.

## 주요 파일 역할

### 프런트

- 엔트리: [main.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/main.tsx)
- 전체 상태/흐름: [App.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx)
- 초기 입력 화면: [InitialHome.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/InitialHome.tsx)
- 편집 사이드바: [Sidebar.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/Sidebar.tsx)
- 편집 캔버스: [EditorCanvas.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/EditorCanvas.tsx)
- 템플릿 카드: [TemplateCard.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/TemplateCard.tsx)
- 배경 후보 카드: [BackgroundCard.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/BackgroundCard.tsx)
- API 클라이언트: [client.ts](gen_prj/2team-GenPrj-frontend/frontend_2/src/api/client.ts)
- 타입: [editor.ts](gen_prj/2team-GenPrj-frontend/frontend_2/src/types/editor.ts)
- 공통 스타일: [global.css](gen_prj/2team-GenPrj-frontend/frontend_2/src/styles/global.css)
- 추가 정보 아이콘/문구 유틸: [additionalInfo.ts](gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/additionalInfo.ts)
- 공통 편집 유틸: [editor.ts](gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/editor.ts)

### 백엔드

- 서버 시작점: [server.js](gen_prj/2team-GenPrj-backend/src/server.js)
- API 라우트: [editorRoutes.js](gen_prj/2team-GenPrj-backend/src/routes/editorRoutes.js)
- 템플릿/사이드바 추천 정의: [templateService.js](gen_prj/2team-GenPrj-backend/src/services/templateService.js)
- 배경 후보 생성: [backgroundService.js](gen_prj/2team-GenPrj-backend/src/services/backgroundService.js)
- 외부 AI 호출: [externalAiService.js](gen_prj/2team-GenPrj-backend/src/services/externalAiService.js)
- 프롬프트 번역/negative prompt: [promptService.js](gen_prj/2team-GenPrj-backend/src/services/promptService.js)
- 배경 제거용 알파 마스크 스크립트: [apply_alpha_mask.py](gen_prj/2team-GenPrj-backend/scripts/apply_alpha_mask.py)

## 현재 데이터가 어떻게 흐르는지

### 1. 초기 화면 입력

파일: [InitialHome.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/InitialHome.tsx)

여기서 관리하는 값:

- 가게 이름
- 광고 문구
- 상세 지시사항
- 제품 리스트
- 추가 정보
- 컨셉, 비율, 브랜드 컬러

시작 버튼이나 초안 카드 클릭 시:

- `buildStartPayload()`가 `HomeProjectData`를 만들고
- `onStart(payload, draftIndex)`로 [App.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx)에 넘깁니다.

### 2. 템플릿 주입

파일: [App.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx)

핵심 함수:

- `mapProjectDataToTemplate`
- `updateProjectTextElements`
- `handleStartFromHome`

여기서 하는 일:

- 제품 이미지를 템플릿 이미지 슬롯에 매핑
- 가게 이름, 광고 문구, 가격, 설명을 템플릿 텍스트에 주입
- 여러 제품이면 남는 제품을 추가 요소로 생성
- 추가 정보 토글 시 텍스트 + 아이콘 요소를 실제 캔버스 객체로 생성

### 3. 배경 생성

배경 생성용 API 호출은 [client.ts](gen_prj/2team-GenPrj-frontend/frontend_2/src/api/client.ts)에서 합니다.

배경 생성 직전:

- [App.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx)의 `handleGenerateBackgrounds`
- 현재 레이아웃을 `html2canvas`로 캡처
- `guideImage`와 `guideSummary`를 포함해 백엔드 `/api/backgrounds/generate` 호출

### 4. 편집

캔버스 실제 편집:

- [EditorCanvas.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/EditorCanvas.tsx)

현재 지원:

- 선택
- 이동
- 회전
- 크기 조절
- 투명도 조절
- 텍스트 색상 수정
- 텍스트 정렬
- 이미지 교체
- 이미지 배경 제거
- 객체 숨김

## 백엔드 API 연결 방식

파일: [editorRoutes.js](gen_prj/2team-GenPrj-backend/src/routes/editorRoutes.js)

현재 프런트가 사용하는 API:

- `GET /api/editor/bootstrap`
  - 템플릿 목록, 사이드바 추천 기능 반환
- `POST /api/images/remove-background`
  - 입력: `{ imageDataUrl }`
  - 출력: 배경 제거된 이미지 data URL
- `POST /api/backgrounds/generate`
  - 입력: `{ templateId, backgroundMode, promptKo, guideImage, guideSummary }`
  - 출력: 배경 후보 목록
- `POST /api/prompts/translate`
  - 입력: `{ promptKo, backgroundMode }`
  - 출력: 번역 프롬프트, negative prompt
- `GET /api/health`
  - 상태 확인

## 배경 생성 로직 정리

파일: [backgroundService.js](gen_prj/2team-GenPrj-backend/src/services/backgroundService.js)

현재 규칙:

- `solid`
  - `BG_SOLID(#xxxxxx)` 토큰이 있으면 그 색 기준으로 단색 후보 생성
- `gradient`
  - `BG_GRADIENT(#start,#end)` 토큰이 있으면 그 시작/종료 색 기준으로 그라데이션 후보 생성
- `pastel`(UI에서는 다중색)
  - `BG_MULTI(#a,#b,#c...)` 토큰이 있으면 그 색 배열 기준으로 다중색 후보 생성
- `ai-image`
  - Hugging Face img2img 시도
  - 실패 시 그래픽 폴백 후보 반환

프런트에서 색 선택 시:

- [Sidebar.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/Sidebar.tsx)가 `promptHint`에 `BG_SOLID`, `BG_GRADIENT`, `BG_MULTI` 토큰을 넣고
- 백엔드가 그 토큰을 해석해 실제 후보 색을 만듭니다.

## 추가 정보 동작 방식

### 입력

파일: [InitialHome.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/InitialHome.tsx)

입력받는 값:

- `parkingSpaces`
- `petFriendly`
- `noKidsZone`
- `smokingArea`
- `elevator`
- `phoneNumber`
- `address`

### 편집 화면 반영

파일:

- [App.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx)
- [additionalInfo.ts](gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/additionalInfo.ts)

동작:

- 사이드바에서 `🙈/🙉` 토글
- 보이게 하면 템플릿에 텍스트 객체 + 아이콘 객체가 추가
- 아이콘은 고정 세트로 관리
- `주차 공간 수`는 입력한 숫자가 아이콘 안 배지로 들어감
- 이 아이콘 세트는 임시이며, [additionalInfo.ts](gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/additionalInfo.ts)만 수정하면 전체 교체 가능
- 로컬 파일 아이콘을 직접 넣으려면 `public/info-icons/` 아래에 아래 파일명을 두면 됩니다:
  - `parking.png`
  - `pet-friendly-yes.png`
  - `pet-friendly-no.png`
  - `no-kids-yes.png`
  - `no-kids-no.png`
  - `smoking-yes.png`
  - `smoking-no.png`
  - `elevator-yes.png`
  - `elevator-no.png`

상태별 매핑:

- `애견 동반 가능 여부`
  - `true` → `pet-friendly-yes.png`
  - `false` → `pet-friendly-no.png`
- `노키즈존`
  - `true` → `no-kids-yes.png`
  - `false` → `no-kids-no.png`
- `흡연 구역 존재 여부`
  - `true` → `smoking-yes.png`
  - `false` → `smoking-no.png`
- `엘리베이터 존재 여부`
  - `true` → `elevator-yes.png`
  - `false` → `elevator-no.png`
- `주차 공간 수`
  - 기본 이미지 파일은 `parking.png`
  - 사용자가 입력한 숫자는 코드에서 아이콘 위에 배지처럼 덧붙습니다

관련 코드:

- 아이콘 경로 매핑: [additionalInfo.ts](gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/additionalInfo.ts)
- 추가 정보 입력값: [InitialHome.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/InitialHome.tsx)
- 추가 정보를 템플릿 요소로 넣는 로직: [App.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx)

## 무엇을 고치려면 어디를 봐야 하는지

### 초기 화면 문구/입력 UI 수정

- [InitialHome.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/InitialHome.tsx)
- [global.css](gen_prj/2team-GenPrj-frontend/frontend_2/src/styles/global.css)

### 4개 초안 카드 배치 수정

- [InitialHome.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/InitialHome.tsx)
  - `renderDraftProducts`

### 템플릿 선택 후 어떤 요소가 들어가는지 수정

- [App.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx)
  - `mapProjectDataToTemplate`

### 템플릿 자체 레이아웃 수정

- [templateService.js](gen_prj/2team-GenPrj-backend/src/services/templateService.js)

### 배경 후보 카드 모양 수정

- [BackgroundCard.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/BackgroundCard.tsx)
- [global.css](gen_prj/2team-GenPrj-frontend/frontend_2/src/styles/global.css)

### 사이드바 구조 수정

- [Sidebar.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/Sidebar.tsx)
- [SidebarBlock.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/SidebarBlock.tsx)
- [SidebarMiniButton.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/SidebarMiniButton.tsx)
- [global.css](gen_prj/2team-GenPrj-frontend/frontend_2/src/styles/global.css)

### 객체 드래그/회전/크기조절 수정

- [EditorCanvas.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/EditorCanvas.tsx)

### 추가 정보 아이콘 교체

- [additionalInfo.ts](gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/additionalInfo.ts)

현재 여기만 바꾸면 됩니다:

- `getAdditionalInfoIcon`
- `getAdditionalInfoDisplayText`

### 배경 색상 규칙 수정

- 프런트 색 입력 UI: [Sidebar.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/Sidebar.tsx)
- 백엔드 색 해석: [backgroundService.js](gen_prj/2team-GenPrj-backend/src/services/backgroundService.js)

### 배경 제거 방식 수정

- 프런트 호출: [client.ts](gen_prj/2team-GenPrj-frontend/frontend_2/src/api/client.ts)
- 백엔드 구현: [externalAiService.js](gen_prj/2team-GenPrj-backend/src/services/externalAiService.js)
- Python 보조 스크립트: [apply_alpha_mask.py](gen_prj/2team-GenPrj-backend/scripts/apply_alpha_mask.py)

### OpenAI / HF 모델 교체

- OpenAI 번역 호출: [promptService.js](gen_prj/2team-GenPrj-backend/src/services/promptService.js)
- HF img2img / 배경제거 호출: [externalAiService.js](gen_prj/2team-GenPrj-backend/src/services/externalAiService.js)
- 배경 후보 조합: [backgroundService.js](gen_prj/2team-GenPrj-backend/src/services/backgroundService.js)

## .env 설정

루트 `.env`를 프런트와 백엔드가 같이 씁니다.

경로:

- `gen_prj/.env`

예시:

```env
OPENAI_API_KEY=your_openai_key
OPENAI_TRANSLATION_MODEL=gpt-5-mini

HF_TOKEN=your_huggingface_token
HUGGINGFACE_API_KEY=your_huggingface_token
HF_BG_REMOVAL_MODEL=briaai/RMBG-2.0
HF_BG_REMOVAL_PROVIDER=
HF_BG_REMOVAL_THRESHOLD=0.1

HF_IMAGE_TO_IMAGE_MODEL=stabilityai/stable-diffusion-3.5-medium
HF_IMAGE_TO_IMAGE_PROVIDER=
HF_GUIDANCE_SCALE=6
HF_NUM_INFERENCE_STEPS=30
HF_TARGET_WIDTH=768
HF_TARGET_HEIGHT=1024

PORT=4000
HOST=127.0.0.1
VITE_API_BASE=/api
```

## 지금 남아 있는 제약

- `frontend_1` 원본 코드에는 아직 추가 정보 입력 필드가 직접 들어있지 않습니다.
- 그래서 지금은 `frontend_2`의 초기 화면에서 추가 정보를 입력받도록 구현돼 있습니다.
- HF provider/model 권한 상태에 따라 실제 img2img가 실패할 수 있고, 그 경우 그래픽 폴백이 보일 수 있습니다.
- 추가 정보 아이콘은 현재 임시 세트이며 나중에 교체 가능한 구조로 분리만 해둔 상태입니다.

## 빠른 점검 순서

문제가 생기면 보통 아래 순서로 보면 됩니다.

1. 초기 값이 안 넘어온다
   - [InitialHome.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/InitialHome.tsx)
   - [editor.ts](gen_prj/2team-GenPrj-frontend/frontend_2/src/types/editor.ts)
   - [App.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx)
2. 템플릿에 값이 안 보인다
   - [App.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx)의 `mapProjectDataToTemplate`
   - [templateService.js](gen_prj/2team-GenPrj-backend/src/services/templateService.js)
3. 배경 후보 색이 이상하다
   - [Sidebar.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/Sidebar.tsx)
   - [backgroundService.js](gen_prj/2team-GenPrj-backend/src/services/backgroundService.js)
4. AI 배경 생성이 실패한다
   - [externalAiService.js](gen_prj/2team-GenPrj-backend/src/services/externalAiService.js)
   - `.env`
5. 저장 이미지가 이상하다
   - [App.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx)의 `handleSaveImage`
   - [EditorCanvas.tsx](gen_prj/2team-GenPrj-frontend/frontend_2/src/components/EditorCanvas.tsx)
