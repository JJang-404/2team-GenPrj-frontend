# Frontend-Backend API 연동 가이드

이 문서는 `react/src/server` 폴더에 구현된 API 모듈을 사용하여 최종 백엔드(`Backend_final`)와 통신하는 방법과 구조를 설명합니다.

## 1. API 구조 개요

모든 API 모듈은 `baseApi.js`를 상속받아 일관된 인터페이스를 제공합니다.

- **`baseApi.js`**: 공통 axios 설정, GET/POST 메서드, 에러 핸들링을 담당합니다.
- **`adverApi.js`**: 광고 문구(GPT) 생성 관련 API.
- **`imageApi.js`**: 이미지 업로드, 조회, 다운로드 관련 API.
- **`modelApi.js`**: AI 이미지 생성 및 변환(Stable Diffusion) API.
- **`designApi.js`**: 편집된 디자인 프로필 저장 및 불러오기 API.
- **`callApi.js`**: **[중요]** 위 API들을 조합하여 복합적인 비즈니스 로직(예: 이미지 업로드 후 프로필 저장)을 처리하는 통합 모듈입니다.

## 2. 기본 사용 방법

### 2-1. 공통 응답 형식
모든 API 호출 결과는 다음과 같은 객체 구조를 반환합니다:
```javascript
{
  ok: true | false,       // 호출 성공 여부
  data: [...],            // 백엔드에서 받은 실제 데이터 (datalist)
  message: "성공 메시지",
  error: "에러 메시지",
  statusCode: 200         // HTTP 상태 코드
}
```

### 2-2. 광고 문구 생성 (`adverApi`)
사용자가 입력한 텍스트나 조건을 바탕으로 GPT 문구를 생성합니다.
```javascript
import { adverApi } from '@/server/api/adverApi';

const result = await adverApi.generateAdCopy("신선한 사과", "친근하게", "30대 주부", 3);
if (result.ok) {
  console.log(result.data); // 생성된 문구 배열
}
```

## 3. 고급 연동: `callApi` 활용

`callApi.js`는 여러 단계의 과정을 하나로 묶어주므로, 프론트엔드 컴포넌트에서는 가급적 `callApi`를 사용하는 것이 권장됩니다.

### 3-1. 디자인 프로필 통합 저장 (`saveDesignProfile`)
이미지 업로드와 메타데이터 저장을 한 번에 처리합니다.
- **과정**: AI 배경 이미지 존재 확인 -> 이미지 업로드 (`imageApi`) -> `image_id` 획득 -> 전체 디자인 정보 저장 (`designApi`).

### 3-2. AI 배경 생성 (`generateBackground`)
가게 정보(이름, 업종, 설명)를 바탕으로 `modelApi`에 보낼 프롬프트를 자동으로 구성하여 이미지를 생성합니다.

## 4. 백엔드 주소 설정 (`functions.js`)

API가 바라보는 백엔드 주소는 `react/src/server/common/functions.js`의 `getBackendUrl()`에서 결정됩니다.

- **개발 환경 (`npm run dev`)**: Vite 프록시(`/addhelper`)를 통해 전달됩니다.
- **배포 환경**: `.env` 파일의 `VITE_BACKEND_BASE_URL` 값을 따르며, 없을 경우 `defines.js`의 기본값(`https://gen-proj.duckdns.org/addhelper`)을 사용합니다.

## 5. Claude를 위한 구현 가이드 (새로운 API 추가 시)

1.  **API 정의**: `src/server/api/`에 새로운 클래스 파일을 만들고 `BaseApi`를 상속받습니다.
2.  **메서드 구현**: `this.get()` 또는 `this.post()`를 사용하여 엔드포인트를 연결합니다.
3.  **CallApi 통합**: 프론트엔드에서 여러 API를 순차적으로 불러야 한다면 `callApi.js`에 새 메서드를 추가하여 로직을 캡슐화합니다.
4.  **상태 관리 연동**: `src/server/common/storage.js`를 사용하여 API 호출 전후의 상태를 `localStorage`에 백업하도록 구현합니다.

## 6. 연동 확인 체크리스트
- [ ] 백엔드 서버(`Backend_final`)가 구동 중인가?
- [ ] 브라우저 개발자 도구의 Network 탭에서 `statusCode: 200`과 `ok: true`가 오는가?
- [ ] `.env` 파일에 필요한 API Key들이 올바르게 설정되어 있는가?
