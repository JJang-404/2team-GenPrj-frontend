# react 프런트 통합 구조 보고서

`react`는 기존 `initPage`와 `editing`을 하나의 React/Vite 프런트 프로젝트로 합친 최종 프런트입니다.

- 프런트 루트: `gen_prj/2team-GenPrj-frontend/react`
- 백엔드 루트: `gen_prj/2team-GenPrj-backend`
- 공용 env 루트: `gen_prj/.env`

## 요약

이 프로젝트는 하나의 프런트 앱 안에서 두 페이지를 라우팅으로 나눕니다.

- `/` : 초기 입력 화면 `initPage`
- `/editing` : 편집 화면 `editing`

즉 예전처럼 프런트 앱을 2개 따로 띄우는 구조가 아니라, 이제는 `react` 하나만 띄우면 됩니다.

## 실행

백엔드:

```bash
cd gen_prj/2team-GenPrj-backend
npm start
```

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
- 백엔드: `http://127.0.0.1:4000`

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
- `gen_prj/2team-GenPrj-backend/src/routes/editorRoutes.js`
- `gen_prj/2team-GenPrj-backend/src/services/bridgeService.js`

전달 순서는 아래입니다.

1. `initPage`에서 사용자가 상품, 배경, 비율, 추가 정보를 입력
2. 디자인 선택 버튼 클릭
3. `buildEditingPayload()`가 `editing`용 payload 생성
4. 상품 이미지가 `blob:` URL이면 `data URL`로 변환
5. payload를 fallback 용으로 `sessionStorage/window.name`에 저장
6. payload를 백엔드 `/api/bridge/editing`에 POST
7. 백엔드가 임시 토큰 발급
8. 프런트가 `/editing?bridgeToken=...`으로 이동
9. `editing`이 `/api/bridge/editing/:token`으로 payload를 1회 복원
10. 복원된 데이터를 기준으로 템플릿, 배경, 객체 편집 화면 시작

즉 현재 주 전달 방식은 `백엔드 임시 브리지 토큰`입니다.

## 왜 브리지 토큰 방식을 쓰는가

이 방식이 필요한 이유:

- 배경제거된 상품 이미지가 커질 수 있음
- query string으로는 길이 제한과 보안 문제가 큼
- `sessionStorage`는 origin 차이에서 불안정할 수 있음
- 토큰 방식은 큰 payload도 서버 메모리에서 잠깐 보관 후 안전하게 꺼내오기 쉬움

현재 우선순위:

1. 백엔드 브리지 토큰 복원
2. 실패 시 `sessionStorage/window.name` fallback

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

백엔드 관련 주요 파일:

- 서버 진입: `gen_prj/2team-GenPrj-backend/src/server.js`
- 라우트: `gen_prj/2team-GenPrj-backend/src/routes/editorRoutes.js`
- 브리지 저장: `gen_prj/2team-GenPrj-backend/src/services/bridgeService.js`
- 템플릿 정의: `gen_prj/2team-GenPrj-backend/src/services/templateService.js`
- 배경 생성: `gen_prj/2team-GenPrj-backend/src/services/backgroundService.js`
- 배경제거/외부 모델: `gen_prj/2team-GenPrj-backend/src/services/externalAiService.js`

프런트 API 호출 파일:

- `gen_prj/2team-GenPrj-frontend/react/src/modules/editing/api/client.ts`

현재 프런트가 쓰는 주요 API:

- `GET /api/editor/bootstrap`
- `POST /api/images/remove-background`
- `POST /api/backgrounds/generate`
- `POST /api/bridge/editing`
- `GET /api/bridge/editing/:token`

## 환경변수

루트 `.env` 위치:

- `gen_prj/.env`

현재 프런트에서 의미 있는 값:

```env
VITE_API_BASE=/api
```

필요하면 아래도 쓸 수 있습니다.

```env
VITE_API_BASE_URL=http://127.0.0.1:4000/api
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

## 현재 제약

- 빌드 시 chunk size 경고가 있음
  - 실패는 아니며, 추후 코드 스플리팅으로 개선 가능
- 상품 사진 정보의 이름/금액/소개문구는 현재 이미지 객체 메타데이터에 저장됨
  - 실제 캔버스 텍스트 객체와 자동 연결하려면 추가 작업 필요
- 라우팅은 현재 경량 수동 라우팅
  - 필요하면 이후 `react-router-dom`으로 전환 가능

## 빠른 점검 순서

문제가 생기면 아래 순서로 보면 됩니다.

1. 백엔드가 켜져 있는지 확인
2. `react` 프런트가 `5173`에서 떠 있는지 확인
3. `initPage`에서 디자인 선택 시 URL이 `/editing`으로 바뀌는지 확인
4. 브라우저 콘솔에 브리지/이미지 에러가 있는지 확인
5. `editor/bootstrap` 응답이 오는지 확인
6. 비율/배경이 이상하면 `initPage/utils/editingBridge.js`와 `editing/utils/initialBackground.ts` 확인
