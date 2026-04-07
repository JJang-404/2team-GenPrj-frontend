# editing 연결/구조 보고서

`editing`은 `initPage`에서 만든 초안 데이터를 받아 2페이지 편집 화면으로 이어지는 앱입니다.

- 초기 페이지 경로: `gen_prj/2team-GenPrj-frontend/initPage/frontend`
- 편집 페이지 경로: `gen_prj/2team-GenPrj-frontend/editing`
- 백엔드 경로: `gen_prj/2team-GenPrj-backend`
- 공용 환경변수: `gen_prj/.env`

## 요약

현재 연결 방식은 `백엔드 임시 브리지 토큰`이 기본이고, `sessionStorage + window.name`은 fallback 입니다.

선택 이유:

- 큰 이미지 data URL도 안정적으로 전달 가능
- 서로 다른 포트/origin이어도 안전하게 payload 전달 가능
- query string에 거대한 payload를 싣지 않아도 됨
- 기존 `sessionStorage/window.name`은 fallback으로 남길 수 있음

즉 실동작 우선순위는 아래입니다.

1. `initPage`가 백엔드 `/api/bridge/editing`에 payload 저장
2. 응답받은 `bridgeToken`으로 `editing?bridgeToken=...` 이동
3. `editing`이 `/api/bridge/editing/:token`으로 payload 1회 복원
4. 실패 시 `sessionStorage/window.name` fallback 시도

## 실행

백엔드:

```bash
cd gen_prj/2team-GenPrj-backend
npm install
npm start
```

초기 페이지:

```bash
cd gen_prj/2team-GenPrj-frontend/initPage/frontend
npm install
npm run dev
```

편집 페이지:

```bash
cd gen_prj/2team-GenPrj-frontend/editing
npm install
npm run dev
```

빌드 확인:

```bash
cd gen_prj/2team-GenPrj-frontend/editing
npm run build
```

```bash
cd gen_prj/2team-GenPrj-frontend/initPage/frontend
npm run build
```

기본 주소:

- `initPage`: 보통 `http://localhost:5173`
- `editing`: `http://localhost:5174`
- 백엔드: `http://127.0.0.1:4000`

`initPage`에서 이동할 편집 앱 주소는 아래 env로 바꿀 수 있습니다.

```env
VITE_EDITING_URL=http://localhost:5174
```

`editing`에서 `처음으로` 버튼을 눌렀을 때 돌아갈 초기 앱 주소는 아래 env로 바꿀 수 있습니다.

```env
VITE_INITPAGE_URL=http://localhost:5173
```

## 연결 동작 원리

### 1. initPage에서 payload 생성

파일:

- `gen_prj/2team-GenPrj-frontend/initPage/frontend/src/App.jsx`
- `gen_prj/2team-GenPrj-frontend/initPage/frontend/src/utils/editingBridge.js`

초안 카드 버튼을 누르면:

1. 현재 `options`, `basicInfo`, `extraInfo`, `products`, `draftIndex`를 읽음
2. 상품 이미지가 `blob:` URL이면 먼저 `data URL`로 변환
3. 이를 `editing`이 기대하는 형태로 매핑
4. 직렬화한 payload를 fallback 용으로 `sessionStorage`와 `window.name`에 저장
5. 같은 payload를 백엔드 `/api/bridge/editing`에 POST
6. 응답 토큰을 붙여 `VITE_EDITING_URL?bridgeToken=...` 또는 기본값 `http://localhost:5174?bridgeToken=...`로 이동

## 2. editing에서 payload 복원

파일:

- `gen_prj/2team-GenPrj-frontend/editing/src/utils/editingBridge.ts`
- `gen_prj/2team-GenPrj-frontend/editing/src/App.tsx`

`editing` 시작 시:

1. bootstrap 템플릿을 먼저 로드
2. URL의 `bridgeToken`을 먼저 확인
3. 있으면 `/api/bridge/editing/:token`으로 payload를 1회 복원
4. 토큰이 없거나 실패하면 `readEditingBridgePayload()` fallback 시도
5. 복원 성공 시 `handleStartFromHome(projectData, draftIndex)` 실행
6. 내부 초기 화면을 먼저 그리지 않고 바로 배경 선택/편집 단계로 진입

## 전달되는 payload 구조

브리지 payload:

```ts
{
  draftIndex: number;
  projectData: HomeProjectData;
}
```

`editing` 기준 `HomeProjectData`:

파일:

- `gen_prj/2team-GenPrj-frontend/editing/src/types/home.ts`

```ts
{
  options: {
    ratio: string;
    sampleCount: number;
    concept: string;
    brandColor: string;
  };
  storeName: string;
  mainSlogan: string;
  details: string;
  products: Array<{
    id: number;
    name: string;
    price: string;
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
    deliveryPlatform: boolean;
    noKidsZone: boolean;
    smokingArea: boolean;
    elevator: boolean;
    phoneNumber: string;
    address: string;
  };
}
```

## initPage -> editing 매핑 규칙

매핑 파일:

- `gen_prj/2team-GenPrj-frontend/initPage/frontend/src/utils/editingBridge.js`

현재 매핑은 아래 기준입니다.

- `options.ratio` -> `projectData.options.ratio`
- `options.sampleCount` -> `projectData.options.sampleCount`
- `options.brandColor` -> `projectData.options.brandColor`
- `options.bgType`
  - `단색` -> `solid`
  - `그라데이션` -> `gradient`
  - `다중색` -> `pastel`
  - `AI 생성` -> `ai-image`
- `basicInfo.storeName` -> `projectData.storeName`
- `basicInfo.storeDesc` -> `projectData.mainSlogan`
- `basicInfo.industry` -> `projectData.details`
  - 현재는 `업종: ...` 문자열로 넣음
- `products[].price + currency` -> `projectData.products[].price`
- `products[].image`
  - 원본이 `data URL`이면 그대로 전달
  - 배경 제거 후 `blob:` URL이면 브리지에서 `data URL`로 변환 후 전달
- `extraInfo.seatCount` -> `projectData.additionalInfo.parkingSpaces`
- `extraInfo.phone` -> `projectData.additionalInfo.phoneNumber`
- `extraInfo.address` -> `projectData.additionalInfo.address`
- `extraInfo.hasDelivery` -> `projectData.additionalInfo.deliveryPlatform`
- `extraInfo.isNoKids` -> `projectData.additionalInfo.noKidsZone`
- `extraInfo.hasSmokingArea` -> `projectData.additionalInfo.smokingArea`
- `extraInfo.hasElevator` -> `projectData.additionalInfo.elevator`

현재 직접 대응되지 않는 필드:

- `petFriendly`

즉 `initPage`의 배달 플랫폼 여부는 이제 `editing`으로 자동 매핑되고, 애견 동반 여부만 별도 입력 항목으로 남아 있습니다.

## 수정된 주요 파일

### initPage 쪽

- 엔트리: `gen_prj/2team-GenPrj-frontend/initPage/frontend/src/App.jsx`
- 브리지 유틸: `gen_prj/2team-GenPrj-frontend/initPage/frontend/src/utils/editingBridge.js`
- 디자인 옵션 훅: `gen_prj/2team-GenPrj-frontend/initPage/frontend/src/hooks/useDesignOptions.js`
- 상품 훅: `gen_prj/2team-GenPrj-frontend/initPage/frontend/src/hooks/useProducts.js`

### editing 쪽

- 엔트리: `gen_prj/2team-GenPrj-frontend/editing/src/App.tsx`
- 브리지 복원 유틸: `gen_prj/2team-GenPrj-frontend/editing/src/utils/editingBridge.ts`
- 타입: `gen_prj/2team-GenPrj-frontend/editing/src/types/home.ts`
- 추가 정보 아이콘 규칙: `gen_prj/2team-GenPrj-frontend/editing/src/utils/additionalInfo.ts`

### backend 쪽

- 라우트: `gen_prj/2team-GenPrj-backend/src/routes/editorRoutes.js`
- 임시 브리지 저장소: `gen_prj/2team-GenPrj-backend/src/services/bridgeService.js`

브리지 payload는 메모리에 짧게 저장되고, 토큰으로 1회 읽으면 즉시 삭제됩니다.

## 현재 편집 앱 구조

### 흐름

- 전체 흐름/상태: `gen_prj/2team-GenPrj-frontend/editing/src/App.tsx`
- 편집 캔버스: `gen_prj/2team-GenPrj-frontend/editing/src/components/EditorCanvas.tsx`
- 사이드바 조립: `gen_prj/2team-GenPrj-frontend/editing/src/components/Sidebar.tsx`

### 추가 정보 아이콘

`editing`은 `public/info-icons`의 파일명을 기준으로 추가 정보 아이콘을 읽습니다.

- `parking.png`
- `pet-friendly-yes.png`
- `pet-friendly-no.png`
- `delivery-yes.png`
- `delivery-no.png`
- `no-kids-yes.png`
- `no-kids-no.png`
- `smoking-yes.png`
- `smoking-no.png`
- `elevator-yes.png`
- `elevator-no.png`

`주차 공간 수`는 `parking.png` 위에 숫자 배지가 추가로 그려집니다.

### 처음으로 버튼

`editing` 상단의 `처음으로` 버튼은 내부 초기 화면 없이 바로 `initPage`로 돌아갑니다.

현재는:

1. `VITE_INITPAGE_URL`이 있으면 그 주소로 이동
2. 없으면 기본값 `http://localhost:5173`으로 이동

즉 `initPage`를 1페이지로 쓰는 구조에 맞춰져 있습니다.

### 사이드바 섹션

- 광고 정보: `gen_prj/2team-GenPrj-frontend/editing/src/components/sidebar/AdInfoSection.tsx`
- 추가 정보: `gen_prj/2team-GenPrj-frontend/editing/src/components/sidebar/AdditionalInfoSection.tsx`
- 배경 생성 옵션: `gen_prj/2team-GenPrj-frontend/editing/src/components/sidebar/BackgroundOptionsSection.tsx`
- 요소 추가: `gen_prj/2team-GenPrj-frontend/editing/src/components/sidebar/AddElementSection.tsx`
- 선택 요소 패널: `gen_prj/2team-GenPrj-frontend/editing/src/components/sidebar/ElementInfoPanels.tsx`

### 로직 유틸

- 템플릿 주입/초안 배치: `gen_prj/2team-GenPrj-frontend/editing/src/utils/editorFlow.ts`
- 프로젝트 데이터 동기화: `gen_prj/2team-GenPrj-frontend/editing/src/utils/projectEditor.ts`
- 캔버스 캡처: `gen_prj/2team-GenPrj-frontend/editing/src/utils/canvas.ts`
- 파일 읽기: `gen_prj/2team-GenPrj-frontend/editing/src/utils/file.ts`
- 추가 정보 아이콘: `gen_prj/2team-GenPrj-frontend/editing/src/utils/additionalInfo.ts`

### 타입

- 편집 타입: `gen_prj/2team-GenPrj-frontend/editing/src/types/editor-core.ts`
- 홈 입력 타입: `gen_prj/2team-GenPrj-frontend/editing/src/types/home.ts`
- API 타입: `gen_prj/2team-GenPrj-frontend/editing/src/types/api.ts`
- 호환용 re-export: `gen_prj/2team-GenPrj-frontend/editing/src/types/editor.ts`

## 배경 생성 방식

현재 `editing`의 배경 모드는 이렇게 구분됩니다.

- `단색`
  - 사용자가 지정한 1개 색 그대로 배경 후보 생성
- `그라데이션`
  - 2~4색 이상도 가능
  - 선택한 색 순서를 유지한 다중 스톱 그라데이션 생성
- `다중색`
  - 단순 선형 그라데이션이 아니라
  - 면 분할 / 리본 / 버스트 / 포스터형 SVG 후보 생성
- `AI 이미지 생성`
  - Hugging Face img2img를 시도
  - 실패 시 폴백 후보 반환

관련 파일:

- 프런트 배경 옵션: `gen_prj/2team-GenPrj-frontend/editing/src/components/sidebar/BackgroundOptionsSection.tsx`
- 백엔드 생성 규칙: `gen_prj/2team-GenPrj-backend/src/services/backgroundService.js`
- SVG 패턴: `gen_prj/2team-GenPrj-backend/src/utils/assets.js`

## 왜 sessionStorage 단독이 아니라 fallback을 같이 썼는가

원래 `sessionStorage`가 제일 단순하지만, 브라우저 저장소는 origin 단위입니다.

즉 개발 환경에서:

- `initPage`가 `localhost:5173`
- `editing`이 `localhost:5174`

처럼 포트가 다르면 `sessionStorage`를 직접 공유할 수 없습니다.

그래서 현재 구현은:

- 같은 origin이면 `sessionStorage`
- 다른 포트면 `window.name`

순으로 읽게 만들었습니다.

이렇게 하면:

- 운영에서 같은 origin으로 묶여도 그대로 동작
- 개발에서 포트가 달라도 실제 연결 가능

## 확인 포인트

정상 동작 순서:

1. `initPage`에서 정보 입력
2. 초안 카드 선택
3. 브리지 payload 저장
4. `editing`으로 이동
5. `editing`이 payload 복원
6. 내부 초기 화면 없이 바로 템플릿/배경 단계 진입

## 현재 참고 사항

- `initPage`와 `editing`은 아직 완전히 하나의 라우터 앱으로 합쳐진 것은 아닙니다.
- 지금은 브리지 방식으로 두 앱을 연결한 상태입니다.
- `seatCount -> parkingSpaces`처럼 의미가 완전히 같은 필드는 아니므로, 필요하면 나중에 타입을 맞춰 재정리하는 것이 좋습니다.
- `hasDelivery`는 현재 `editing` 구조에 대응 필드가 없습니다.
- 이미지 data URL을 넘기므로 payload 크기는 제품 수가 많을수록 커질 수 있습니다.
