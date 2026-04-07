# frontend_2 광고 편집 데모

`frontend_2`는 광고 입력 → 템플릿 선택 → 배경 후보 생성 → 편집까지 이어지는 프런트 데모입니다.

- 프런트 경로: `gen_prj/2team-GenPrj-frontend/frontend_2`
- 백엔드 경로: `gen_prj/2team-GenPrj-backend`
- 공용 환경변수: `gen_prj/.env`

## 실행

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

## 전체 흐름

1. 초기 화면에서 가게명, 광고문구, 상세 지시사항, 추가 정보, 제품 정보를 입력합니다.
2. 제품 이미지를 올리면 `/api/images/remove-background`로 보내 배경 제거를 시도합니다.
3. 우측 초안 카드 4개 중 하나를 누르면 해당 초안 인덱스에 맞는 템플릿 배치로 이동합니다.
4. 선택된 템플릿에 사용자 제품/문구/추가 정보가 주입됩니다.
5. 현재 객체 배치를 guide image로 캡처해서 배경 후보를 생성합니다.
6. 배경을 선택하면 편집 화면으로 넘어가고, 객체 이동/회전/크기/투명도 등을 조절합니다.

## frontend_1 과의 관계

현재 `frontend_2`는 `frontend_1` 화면을 직접 재사용하지 않습니다. `frontend_1`과 같은 계열의 입력 화면을 `frontend_2` 내부에 다시 구현한 상태입니다.

기준 파일:

- `gen_prj/2team-GenPrj-frontend/frontend_1/src/App.jsx`
- `2team-GenPrj/2team-GenPrj-frontend/sample_ver5/frontend/src/App.jsx`

실제로 `frontend_1`과 연결하려면 `frontend_1`에서 아래 형태의 payload를 만들고 `frontend_2`의 `onStart(payload, draftIndex)`와 같은 방식으로 넘기면 됩니다.

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

관련 타입:

- `gen_prj/2team-GenPrj-frontend/frontend_2/src/types/home.ts`

## 파일 구조

### 화면 흐름

- 전체 흐름/상태: `gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx`
- 초기 입력 화면: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/InitialHome.tsx`
- 편집 사이드바 조립: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/Sidebar.tsx`
- 편집 캔버스: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/EditorCanvas.tsx`

### 홈 화면 관련

- 홈 상태 기본값/드래프트 레이아웃 유틸: `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/homeEditor.ts`
- 홈 초안 카드: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/home/HomePreviewCard.tsx`

### 사이드바 관련

- 광고 정보 섹션: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/AdInfoSection.tsx`
- 추가 정보 섹션: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/AdditionalInfoSection.tsx`
- 배경 생성 옵션 섹션: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/BackgroundOptionsSection.tsx`
- 요소 추가 섹션: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/AddElementSection.tsx`
- 텍스트/이미지 선택 패널: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/ElementInfoPanels.tsx`
- 추천 기능 섹션: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/RecommendationsSection.tsx`
- 배경 토큰 유틸: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/backgroundTokens.ts`

### 편집/주입 로직

- 템플릿 주입, 드래프트 배치, 추가 정보 요소 생성: `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/editorFlow.ts`
- 프로젝트 데이터와 템플릿 요소 동기화: `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/projectEditor.ts`
- 요소 수정 공통 유틸: `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/editor.ts`
- 파일 읽기 유틸: `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/file.ts`
- 캔버스 캡처 유틸: `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/canvas.ts`
- 추가 정보 아이콘 경로/문구: `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/additionalInfo.ts`

### 타입

- 편집/템플릿 타입: `gen_prj/2team-GenPrj-frontend/frontend_2/src/types/editor-core.ts`
- 홈 입력 타입: `gen_prj/2team-GenPrj-frontend/frontend_2/src/types/home.ts`
- API 타입: `gen_prj/2team-GenPrj-frontend/frontend_2/src/types/api.ts`
- 호환용 re-export: `gen_prj/2team-GenPrj-frontend/frontend_2/src/types/editor.ts`

### API 연결

- API 클라이언트: `gen_prj/2team-GenPrj-frontend/frontend_2/src/api/client.ts`
- 백엔드 라우트: `gen_prj/2team-GenPrj-backend/src/routes/editorRoutes.js`
- 백엔드 템플릿 정의: `gen_prj/2team-GenPrj-backend/src/services/templateService.js`
- 백엔드 배경 생성: `gen_prj/2team-GenPrj-backend/src/services/backgroundService.js`
- 외부 모델 호출: `gen_prj/2team-GenPrj-backend/src/services/externalAiService.js`
- 프롬프트 번역: `gen_prj/2team-GenPrj-backend/src/services/promptService.js`

## 배경 생성 방식

중요:

- `solid`
- `gradient`
- `pastel`(UI에서는 다중색)

이 3개는 현재 기본적으로 “모델이 사진을 생성하는 방식”이 아닙니다. 프런트가 `BG_SOLID`, `BG_GRADIENT`, `BG_MULTI` 토큰을 보내고, 백엔드가 그 토큰을 해석해서 색상 중심 배경 후보를 만듭니다.

즉:

- `단색`은 지정한 1개 색 그대로 단색 배경 후보 생성
- `그라데이션`은 2개 이상 색을 받아 다중 스톱 그라데이션 후보 생성
- `다중색`은 지정한 여러 색을 기반으로 면 분할/리본/버스트 같은 포스터형 후보 생성

관련 파일:

- 프런트 토큰 생성: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/BackgroundOptionsSection.tsx`
- 토큰 파싱 유틸: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/backgroundTokens.ts`
- 백엔드 해석: `gen_prj/2team-GenPrj-backend/src/services/backgroundService.js`
- 다중색 SVG 패턴: `gen_prj/2team-GenPrj-backend/src/utils/assets.js`

반대로:

- `ai-image`

이 모드만 Hugging Face img2img를 실제로 시도합니다. 실패하면 백엔드는 폴백 후보를 반환합니다.

즉 현재 기준으로:

- 단색/그라데이션/다중색: 색상 규칙 기반 후보 생성
- AI 이미지 생성: 모델 호출 시도

## guide image / 모델 입력 흐름

배경 생성 직전 `App.tsx`는 현재 편집 중인 객체 배치를 투명 PNG로 캡처합니다.

관련 파일:

- 캡처: `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/canvas.ts`
- 흐름: `gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx`

백엔드로 넘어가는 값:

- `templateId`
- `backgroundMode`
- `promptKo`
- `guideImage`
- `guideSummary`

## 추가 정보 동작

입력 위치:

- `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/InitialHome.tsx`

토글 위치:

- `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/AdditionalInfoSection.tsx`

실제 요소 생성:

- `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/editorFlow.ts`
- `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/projectEditor.ts`

아이콘 경로/문구 처리:

- `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/additionalInfo.ts`

### 추가 정보 아이콘 파일 규칙

아이콘 폴더:

- `gen_prj/2team-GenPrj-frontend/frontend_2/public/info-icons`

사용 파일명:

- `parking.png`
- `pet-friendly-yes.png`
- `pet-friendly-no.png`
- `no-kids-yes.png`
- `no-kids-no.png`
- `smoking-yes.png`
- `smoking-no.png`
- `elevator-yes.png`
- `elevator-no.png`

현재 규칙:

- `주차 공간 수`는 `parking.png`를 쓰고, 숫자를 아이콘 안에 배지처럼 추가
- `애견 동반 가능 여부`는 yes/no 파일 중 상태에 맞는 파일 사용
- `노키즈존`은 yes/no 파일 중 상태에 맞는 파일 사용
- `흡연 구역 존재 여부`는 yes/no 파일 중 상태에 맞는 파일 사용
- `엘리베이터 존재 여부`는 yes/no 파일 중 상태에 맞는 파일 사용
- `전화번호`, `주소`는 아이콘 없이 텍스트만 표시

## 수정 포인트

### 템플릿 구조를 바꾸고 싶을 때

- `gen_prj/2team-GenPrj-backend/src/services/templateService.js`

### 사용자 입력이 템플릿에 어떻게 들어가는지 바꾸고 싶을 때

- `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/editorFlow.ts`
- `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/projectEditor.ts`

### 초안 카드 배치를 바꾸고 싶을 때

- `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/homeEditor.ts`
- `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/home/HomePreviewCard.tsx`

### 사이드바 구성을 바꾸고 싶을 때

- `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/Sidebar.tsx`
- `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/*`

### 배경 생성 색상 규칙을 바꾸고 싶을 때

- `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/BackgroundOptionsSection.tsx`
- `gen_prj/2team-GenPrj-backend/src/services/backgroundService.js`

### AI 이미지 생성 프롬프트/번역을 바꾸고 싶을 때

- `gen_prj/2team-GenPrj-backend/src/services/promptService.js`
- `gen_prj/2team-GenPrj-backend/src/services/externalAiService.js`

### 추가 정보 아이콘을 바꾸고 싶을 때

- 아이콘 파일 교체: `gen_prj/2team-GenPrj-frontend/frontend_2/public/info-icons`
- 경로 규칙 수정: `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/additionalInfo.ts`

### 요소 추가 버튼 동작을 바꾸고 싶을 때

- UI: `gen_prj/2team-GenPrj-frontend/frontend_2/src/components/sidebar/AddElementSection.tsx`
- 생성 로직: `gen_prj/2team-GenPrj-frontend/frontend_2/src/utils/editorFlow.ts`
- 연결: `gen_prj/2team-GenPrj-frontend/frontend_2/src/App.tsx`

## 환경변수

루트 `.env`:

- `gen_prj/.env`

예시:

```env
OPENAI_API_KEY=...
HF_TOKEN=...
HUGGINGFACE_API_KEY=...
```

## 현재 참고 사항

- `frontend_2`는 `frontend_1`을 직접 import 하지 않습니다.
- 단색은 현재 사용자가 지정한 1개 색 그대로 배경 후보를 만듭니다.
- 그라데이션은 2색 고정이 아니라 2~4색 이상도 추가해서 다중 스톱으로 만들 수 있습니다.
- 다중색은 단순 그라데이션이 아니라 면 분할/포스터형 SVG 배경 후보를 만듭니다.
- 단색/그라데이션/다중색은 현재 “실사 모델 생성”이 아니라 색상 규칙 기반 후보 생성입니다.
- 실사풍 결과는 `AI 이미지 생성` 모드에서만 모델 호출을 시도합니다.
- 실제 모델 호출은 계정 권한, 네트워크, provider 상태에 따라 실패할 수 있습니다.
