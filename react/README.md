# react 프런트 통합 구조 보고서

`react`는 기존 `initPage`와 `editing`을 하나의 React/Vite 프런트 프로젝트로 합친 최종 프런트입니다.

- 프런트 루트: `gen_prj/2team-GenPrj-frontend/react`
- 공용 env 루트: `gen_prj/.env`

## 요약

이 프로젝트는 하나의 프런트 앱 안에서 두 페이지를 라우팅으로 나눕니다.

- `/` : 초기 입력 화면 `initPage`
- `/editing` : 편집 화면 `editing`

즉 예전처럼 프런트 앱을 2개 따로 띄우는 구조가 아니라, 이제는 `react` 하나만 띄우면 됩니다.

## 실행

통합 프런트:

```bash
cd gen_prj/2team-GenPrj-frontend/react
npm install
npm run dev
```

빌드 확인:

```bash
cd gen_prj/2team-GenPrj-frontend/react
npm run build
```

기본 주소:

- 프런트: `http://localhost:5173`
- 원격 FastAPI base: `https://gen-proj.duckdns.org/addhelper`

## 페이지 구조

엔트리:

- `gen_prj/2team-GenPrj-frontend/react/src/main.tsx`
- `gen_prj/2team-GenPrj-frontend/react/src/App.tsx`

페이지:

- `gen_prj/2team-GenPrj-frontend/react/src/pages/InitPage.tsx`
- `gen_prj/2team-GenPrj-frontend/react/src/pages/EditingPage.tsx`

모듈:

- `gen_prj/2team-GenPrj-frontend/react/src/modules/initPage/*`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/*`

구조 의도는 아래와 같습니다.

1. `pages`는 경로 단위 진입점만 담당
2. 실제 기능 코드는 `modules/initPage`, `modules/editing` 아래 유지
3. 공용 라우팅은 `src/App.tsx`에서 처리

## 라우팅 동작 원리

파일:

- `gen_prj/2team-GenPrj-frontend/react/src/App.tsx`

현재는 `react-router`를 쓰지 않고, 경로 기반의 가벼운 라우팅으로 구성했습니다.

- `window.location.pathname`이 `/editing`으로 시작하면 편집 페이지 렌더
- 그 외는 초기 페이지 렌더
- 브라우저 뒤로가기/앞으로가기는 `popstate`로 동기화

즉 라우터 의존성을 추가하지 않고도 2페이지 흐름만 단순하게 유지하도록 만들었습니다.

## initPage -> editing 데이터 전달 원리

관련 파일:

- `gen_prj/2team-GenPrj-frontend/react/src/modules/initPage/utils/editingBridge.js`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/editingBridge.ts`

전달 순서는 아래입니다.

1. `initPage`에서 사용자가 상품, 배경, 비율, 추가 정보를 입력
2. 디자인 선택 버튼 클릭
3. `buildEditingPayload()`가 `editing`용 payload 생성
4. 상품 이미지가 `blob:` URL이면 `data URL`로 변환
5. payload를 `sessionStorage/window.name`에 저장
6. 프런트가 `/editing`으로 이동
7. `editing`이 저장된 payload를 복원
8. 복원된 데이터를 기준으로 템플릿, 배경, 객체 편집 화면 시작

즉 현재는 같은 React 앱 안에서 `sessionStorage/window.name` 기반 로컬 브리지를 사용합니다.

## initPage에서 editing으로 넘어가는 데이터

파일:

- `gen_prj/2team-GenPrj-frontend/react/src/modules/initPage/utils/editingBridge.js`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/types/home.ts`

핵심 payload 구조:

```ts
{
  draftIndex: number;
  projectData: {
    options: {
      ratio: string;
      sampleCount: number;
      concept: string;
      brandColor: string;
      bgType?: string;
      startColor?: string;
      endColor?: string;
      gradientAngle?: number;
      splitPosition?: number;
      splitDirection?: 'horizontal' | 'vertical';
    };
    storeName: string;
    mainSlogan: string;
    details: string;
    products: Array<{
      id: number;
      name: string;
      price: string;
      currency?: string;
      description: string;
      image: string | null;
      isAiGen: boolean;
      showName: boolean;
      showPrice: boolean;
      showDesc: boolean;
    }>;
    additionalInfo: {
      parkingSpaces: string;
      petFriendly: boolean;
      noKidsZone: boolean;
      smokingArea: boolean;
      elevator: boolean;
      phoneNumber: string;
      address: string;
    };
  };
}
```

## 배경/비율 전달 규칙

관련 파일:

- `gen_prj/2team-GenPrj-frontend/react/src/modules/initPage/utils/bgStyles.js`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/initialBackground.ts`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/ratio.ts`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/App.tsx`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx`

현재 동작:

- `initPage`에서 선택한 비율 `1:1 / 4:5 / 9:16`를 `editing`으로 그대로 전달
- `editing`의 큰 캔버스, 템플릿 카드, 배경 후보 카드가 이 비율을 그대로 사용
- `initPage`에서 선택한 배경 색/분할/그라데이션 값을 기반으로 초기 배경 후보를 하나 먼저 생성
- `editing` 진입 직후에는 이 초기 배경을 먼저 보여줌
- 이후 배경 후보를 생성해도 첫 번째 후보로 `initPage 배경`을 유지

즉 사용자는:

1. 첫 페이지에서 보던 배경을 두 번째 페이지에서도 먼저 확인할 수 있고
2. 생성된 후보를 본 뒤에도 처음 배경으로 다시 돌아갈 수 있습니다

## 상품 이미지 처리 원리

관련 파일:

- `gen_prj/2team-GenPrj-frontend/react/src/modules/initPage/hooks/useProducts.js`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/initPage/utils/removeBackground.js`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/initPage/utils/cropToBoundingBox.js`

현재 흐름:

1. 원본 상품 이미지 업로드
2. 배경제거 실행
3. 투명 배경 이미지로 크롭
4. 결과를 `data URL`로 저장
5. 이 값을 그대로 브리지 payload에 포함

즉 `editing`으로 넘어갈 때 상품 이미지가 빠지지 않도록, 전송 전에 `blob:` 상태를 없애는 방향으로 맞췄습니다.

## editing 내부 구조

핵심 파일:

- 상태/전체 흐름: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/App.tsx`
- 편집 캔버스: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx`
- 템플릿 카드: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/TemplateCard.tsx`
- 배경 카드: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/BackgroundCard.tsx`
- 사이드바 조립: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/Sidebar.tsx`

사이드바 세부 섹션:

- 광고 정보: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/sidebar/AdInfoSection.tsx`
- 추가 정보: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/sidebar/AdditionalInfoSection.tsx`
- 배경 생성 옵션: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/sidebar/BackgroundOptionsSection.tsx`
- 요소 추가: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/sidebar/AddElementSection.tsx`
- 선택 객체 패널: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/sidebar/ElementInfoPanels.tsx`

유틸:

- 템플릿/객체 규칙: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts`
- Wireframe 레이아웃 계산: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/wireframeLayout.ts`
- Wireframe 브릿지 (initPage ↔ editing): `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/wireframeBridge.ts`
- 프로젝트 텍스트/프롬프트 동기화: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/projectEditor.ts`
- 초기 배경 생성: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/initialBackground.ts`
- 비율 처리: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/ratio.ts`
- 추가 정보 아이콘: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/additionalInfo.ts`

## 상품 사진 정보 패널

관련 파일:

- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/sidebar/ElementInfoPanels.tsx`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/src/types/editor-core.ts`

상품 이미지 요소를 선택하면 아래 정보를 편집할 수 있습니다.

- 사진 수정
- 배경 제거
- 객체 제거
- 투명도
- 이름
- 금액
- 통화 (`원`, `$`)
- 소개문구

현재 이 값들은 이미지 요소 메타데이터에 저장됩니다.

즉:

- 이미지 객체별로 따로 관리 가능
- 이후 이름/금액/소개문구를 실제 캔버스 텍스트 객체와 연결하는 확장도 쉬움

## 추가 정보 아이콘

관련 파일:

- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/additionalInfo.ts`
- `gen_prj/2team-GenPrj-frontend/react/public/info-icons/*`

현재 사용하는 파일명:

- `parking.png`
- `pet-friendly-yes.png`
- `pet-friendly-no.png`
- `no-kids-yes.png`
- `no-kids-no.png`
- `smoking-yes.png`
- `smoking-no.png`
- `elevator-yes.png`
- `elevator-no.png`

`주차 공간 수`는 `parking.png` 위에 숫자 배지가 추가됩니다.

## 무엇을 수정하려면 어디를 봐야 하는가

### 1. 초기 입력 화면 문구/필드/레이아웃 수정

- `gen_prj/2team-GenPrj-frontend/react/src/modules/initPage/App.jsx`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/initPage/components/sidebar/*`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/initPage/components/draft/*`

### 2. 초기 페이지에서 editing으로 넘기는 데이터 구조 수정

- `gen_prj/2team-GenPrj-frontend/react/src/modules/initPage/utils/editingBridge.js`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/types/home.ts`

### 3. 편집 화면 배경 규칙 수정

- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/initialBackground.ts`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/sidebar/BackgroundOptionsSection.tsx`
- 백엔드 생성 규칙: `gen_prj/2team-GenPrj-backend/src/services/backgroundService.js`

### 4. 편집 화면 객체/템플릿 배치 수정

- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts`
- `gen_prj/2team-GenPrj-backend/src/services/templateService.js`

### 5. 캔버스 비율/선택 박스/이동 방식 수정

- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/ratio.ts`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/styles/global.css`

### 6. 추가 정보 아이콘 파일 교체

- 아이콘 파일: `gen_prj/2team-GenPrj-frontend/react/public/info-icons`
- 아이콘 매핑 코드: `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/additionalInfo.ts`

### 7. 상품 사진 정보 패널 필드 수정

- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/sidebar/ElementInfoPanels.tsx`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/types/editor-core.ts`

## 백엔드 연결 지점

원격 API 호출 파일:

- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/api/client.ts`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/config/remoteApi.ts`
- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/backgroundGeneration.ts`

현재 원격 FastAPI와 맞추는 기준:

- 개발 환경: Vite proxy로 `/addhelper -> https://gen-proj.duckdns.org/addhelper`
- 배포 환경: `VITE_REMOTE_API_BASE` 또는 기본값 `https://gen-proj.duckdns.org/addhelper`

현재 실제로 원격 API를 쓰는 기능:

- `POST /addhelper/model/changeimage`
- `GET /addhelper/model/generate`

현재 프런트 내부로 옮긴 기능:

- 템플릿 bootstrap
- sidebar recommendations
- initPage -> editing bridge
- 배경제거

## 환경변수

루트 `.env` 위치:

- `gen_prj/.env`

현재 프런트에서 의미 있는 값:

```env
VITE_REMOTE_API_BASE=https://gen-proj.duckdns.org/addhelper
```

필요하면 아래도 쓸 수 있습니다.

```env
VITE_EDITING_URL=/editing
VITE_INITPAGE_URL=/
```

보통 단일 프런트 구조에서는 기본값만으로 충분합니다.

## 현재 상태

현재 확인된 사항:

- `react` 단일 프런트 `npm install` 완료
- `react` 단일 프런트 `npm run build` 통과
- `initPage`와 `editing`이 하나의 Vite 앱으로 통합됨
- `/` -> `/editing` 흐름 동작
- 초기 배경과 비율을 `initPage`에서 `editing`으로 전달
- 배경 후보를 생성해도 첫 후보로 `initPage 배경` 유지

## 최근 수정사항

- `editing`의 배경 후보 로직을 다시 정리함
  - `단색`은 후보 단계 없이 바로 편집 화면으로 이동
  - `그라데이션`, `다중색`, `AI 이미지 생성`은 후보 4개를 보여주도록 복구
- 배경 후보가 모드 전환 시 섞이던 문제 수정
  - 이전 모드 후보를 유지하지 않고 현재 모드 기준 preview만 남기도록 변경
- `배경 후보 보기` 버튼 동작 복구
  - 후보가 이미 4개 있으면 바로 후보 화면으로 이동
  - 후보가 부족하면 먼저 생성 후 후보 화면으로 이동
  - `단색` 모드에서는 버튼 숨김 유지
- `initPage` 배경을 후보 목록 첫 카드에 강제로 넣던 동작 제거
  - 이제 후보 목록은 생성된 후보 4개만 표시
- 로컬 배경 후보 수 확장
  - `그라데이션` 4개
  - `다중색` 4개
  - `AI 생성 실패 폴백`도 4개
- 관련 수정 파일
  - `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/App.tsx`
  - `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/utils/backgroundGeneration.ts`
  - `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/components/sidebar/BackgroundOptionsSection.tsx`

## 현재 제약

- 빌드 시 chunk size 경고가 있음
  - 실패는 아니며, 추후 코드 스플리팅으로 개선 가능
- 상품 사진 정보의 이름/금액/소개문구는 현재 이미지 객체 메타데이터에 저장됨
  - 실제 캔버스 텍스트 객체와 자동 연결하려면 추가 작업 필요
- 라우팅은 현재 경량 수동 라우팅
  - 필요하면 이후 `react-router-dom`으로 전환 가능

## 빠른 점검 순서

문제가 생기면 아래 순서로 보면 됩니다.

1. `react` 프런트가 `5173`에서 떠 있는지 확인
2. `initPage`에서 디자인 선택 시 URL이 `/editing`으로 바뀌는지 확인
3. 브라우저 콘솔에 브리지/이미지 에러가 있는지 확인
4. 실사 생성 실패 시 `/addhelper/model/changeimage` 응답 확인
5. 비율/배경이 이상하면 `initPage/utils/editingBridge.js`와 `editing/utils/initialBackground.ts` 확인
