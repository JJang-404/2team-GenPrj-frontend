# frontend_2 광고 편집 데모

이 프로젝트는 `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2` 에 있는 광고 편집 데모 프런트엔드입니다.  
백엔드는 `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-backend` 를 같이 사용합니다.

## 현재 구성

- 첫 화면: `frontend_1` / `sample_ver5` 구조를 기준으로 한 입력 화면
- 두 번째 화면: 템플릿 배치 선택 후 바로 배경 후보 확인
- 세 번째 화면: 최종 편집 화면

현재 흐름은 아래와 같습니다.

1. 첫 화면에서 가게명, 슬로건, 상세 문구, 제품 이미지들을 입력합니다.
2. 업로드 이미지는 백엔드로 보내 자동 배경 제거를 시도합니다.
3. 첫 화면의 4개 초안 카드 중 원하는 배치를 클릭하면 해당 템플릿으로 바로 배경 후보 단계로 넘어갑니다.
4. 배경 모드가 `AI 이미지 생성`이면 현재 객체+텍스트 배치를 guide image로 캡처해서 실제 image-to-image 생성을 시도합니다.
5. 배경을 고른 뒤 최종 편집 화면에서 객체를 이동, 회전, 크기조절하고 PNG로 저장할 수 있습니다.

## 알아둘 점

- `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_1/src/App.jsx`
- `/home/ohs3201/codeit/project/2team-GenPrj/2team-GenPrj-frontend/sample_ver5/frontend/src/App.jsx`

위 두 파일은 같은 기준 화면입니다.  
즉 `frontend_2` 초기 화면은 이 구조를 참고해서 이어지는 편집 데모로 만든 상태입니다.

## 주요 경로

- 프런트 엔트리: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/main.tsx`
- 메인 흐름: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx`
- 초기 화면: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/components/InitialHome.tsx`
- 편집 사이드바: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/components/Sidebar.tsx`
- 편집 캔버스: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/components/EditorCanvas.tsx`
- 템플릿 카드: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/components/TemplateCard.tsx`
- 배경 후보 카드: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/components/BackgroundCard.tsx`
- 타입: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/types/editor.ts`
- 스타일: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/styles/global.css`

백엔드 주요 파일:

- 서버 시작점: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-backend/src/server.js`
- 라우트: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-backend/src/routes/editorRoutes.js`
- 템플릿 정의: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-backend/src/services/templateService.js`
- 배경 생성 서비스: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-backend/src/services/backgroundService.js`
- 외부 AI 연동: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-backend/src/services/externalAiService.js`
- 프롬프트 생성/번역: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-backend/src/services/promptService.js`
- 알파 마스크 스크립트: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-backend/scripts/apply_alpha_mask.py`

## 실행 방식

루트 `.env` 준비:

- 경로: `/home/ohs3201/codeit/project/gen_prj/.env`

백엔드 실행:

```bash
cd /home/ohs3201/codeit/project/gen_prj/2team-GenPrj-backend
npm install
npm start
```

프런트 실행:

```bash
cd /home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2
npm install
npm run dev
```

기본 주소:

- 프런트: `http://localhost:5174`
- 백엔드: `http://127.0.0.1:4000`

## .env 설정

공용 `.env`는 루트에서 같이 읽습니다.

- 백엔드: 직접 로드
- 프런트: `vite.config.ts`의 `envDir`로 루트 참조

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

## 실제 동작 원리

### 1. 첫 화면

- 사용자가 가게명, 슬로건, 상세 문구를 입력
- 제품 이미지를 여러 개 업로드 가능
- 업로드 직후 `/api/images/remove-background` 호출
- 성공하면 제품 이미지를 투명 PNG로 교체

### 2. 템플릿/배경 후보

- 첫 화면의 4개 초안 카드는 각각 다른 배치 미리보기
- 클릭한 카드 인덱스에 맞는 템플릿으로 이동
- 템플릿에는 사용자 입력값과 제품 이미지가 주입됨
- 제품이 여러 개면 템플릿 슬롯에 순서대로 매핑되고, 남는 제품은 추가 요소로 배치됨

### 3. AI 이미지 생성

- 현재 객체와 텍스트 배치를 투명 guide image로 캡처
- 한국어 프롬프트를 OpenAI로 영어 생성 프롬프트로 번역 시도
- Hugging Face `image-to-image`로 실제 배경 생성 시도

### 4. 폴백

- HF image-to-image가 실패하면 그래픽 폴백 배경 후보를 반환
- 이 경우 후보 이름에 `(실사 생성 실패 폴백)`이 붙음
- 즉 그래픽 후보가 보이면 실제 실사 생성이 실패한 상태로 보면 됩니다

## 장식 요소 규칙

템플릿에는 `초코 스플래시`, `말차 스플래시`, `배지` 같은 장식 요소가 들어있습니다.  
지금은 배경 모드, 템플릿 종류, 제품 수, 컨셉에 따라 조건부 표시입니다.

- `AI 이미지 생성`: 실사 배경 우선이라 장식 요소 숨김
- `듀얼 쇼케이스`: 제품 2개 이상이고 `gradient` 또는 `pastel`이며 컨셉이 `vivid` 또는 `retro`일 때만 스플래시 표시
- `분할 히어로`: 제품이 1개 이상이고 `solid`가 아니며 컨셉이 `premium`이 아닐 때만 단일 스플래시 표시
- `팝 보드`: `solid`가 아닐 때 배지 표시
- 그 외 템플릿/조건에서는 장식 요소를 자동 숨김

관련 로직은 `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx`에 있습니다.

## 저장 기능

- 최종 편집 화면 사이드바 하단에는 `편집 이미지 저장` 버튼이 나옵니다
- 저장 시 현재 편집 결과를 PNG로 다운로드합니다
- 선택 테두리와 조절 핸들은 저장 이미지에서 제외됩니다

## 현재 한계

- HF provider/model 조합에 따라 실제 img2img가 막힐 수 있습니다
- OpenAI 키가 없으면 프롬프트 번역은 휴리스틱 규칙 기반으로 폴백됩니다
- 배경 제거 품질은 업로드 이미지 형태와 HF 세그멘테이션 결과에 영향을 받습니다

## 빠르게 수정할 때 보면 되는 파일

- 전체 흐름 수정: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx`
- 초기 화면 수정: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/components/InitialHome.tsx`
- 편집 UI 수정: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/components/Sidebar.tsx`
- 캔버스 동작 수정: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/components/EditorCanvas.tsx`
- 템플릿 구조 수정: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-backend/src/services/templateService.js`
- AI 호출 수정: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-backend/src/services/externalAiService.js`

## 글씨체 추가 방법

텍스트 편집 사이드바에 새 글씨체를 추가하려면 보통 두 군데를 같이 수정해야 합니다.

1. 폰트 선택 목록 추가

- 파일: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/components/Sidebar.tsx`
- `const fontOptions = [...]` 배열에 새 항목 추가

예시:

```ts
{ value: '"SUIT Variable", "Noto Sans KR", sans-serif', label: 'SUIT' }
```

2. 폰트 실제 로드

- 파일: `/home/ohs3201/codeit/project/gen_prj/2team-GenPrj-frontend/frontend_2/src/styles/global.css`
- 외부 웹폰트면 `@import`
- 로컬 폰트 파일이면 `@font-face`

즉:

- `Sidebar.tsx`: 드롭다운에 보이게 하는 곳
- `global.css`: 실제 브라우저에서 렌더되게 하는 곳
