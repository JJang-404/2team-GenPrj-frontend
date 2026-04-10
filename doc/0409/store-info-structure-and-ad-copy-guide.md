# 가게 정보 저장 구조 변경 및 AI 광고 문구 고도화 가이드

이 문서는 `genprj_store_info`의 데이터 구조 변경 사항과, 상품 소개문구를 활용한 AI 광고 문구 생성 로직에 대해 설명합니다.

---

## 1. 데이터 저장 구조 변경 (`genprj_store_info`)

기존에는 주소, 주차 정보 등 부가적인 편의시설 정보를 저장했으나, 상업용 광고 문구 생성의 효율성을 높이기 위해 **상품 소개문구(소개문구)** 중심으로 구조를 변경했습니다.

### 변경 사항
- **추가 정보 제외**: 주차공간, 애견동반, 노키즈존, 흡연구역, 엘리베이터, 주소 등은 더 이상 `genprj_store_info`에 저장되지 않으며 프롬프트에서도 제외됩니다.
- **상품 정보 포함**: `products` 배열이 추가되어 각 상품의 이름과 소개문구를 보관합니다.

### 저장된 데이터 구조 예시
```json
{
  "basicInfo": {
    "storeName": "그린 카페",
    "industry": "커피 전문점",
    "storeDesc": "도심 속 작은 숲"
  },
  "products": [
    {
      "name": "말차 라떼",
      "description": "제주산 유기농 말차를 사용한 진한 풍미",
      "showDesc": true
    }
  ]
}
```

---

## 2. AI 광고 문구 프롬프트 생성 로직

`storeInfo.js`의 `buildAdPrompt()` 메서드는 위 데이터를 바탕으로 다음과 같이 프롬프트를 구성합니다.

1.  **가게 기본 정보**: 가게이름, 업종, 가게소개 포함.
2.  **활성화된 소개문구 리스트**:
    - 상품의 '소개문구' 버튼이 활성화(`showDesc: true`)된 항목만 수집합니다.
    - 소개문구 내용이 비어있지 않은 경우에만 리스트 형태로 프롬프트 하단에 나열합니다.

---

## 3. 기술적 구현 및 API 패턴 (`CallApi.js`)

"CallApi 패턴"을 적용하여 광고 문구 생성 로직을 캡슐화했습니다.

### `callApi.generateAdCopy()`
- 이 전용 메서드는 내부적으로 `storeInfo.buildAdPrompt()`를 호출하여 프롬프트를 만들고, `adverApi`를 통해 서버와 통신합니다.
- 편집 페이지(`App.tsx`)의 `handleGenerateSlogan`은 이제 이 단일 메서드만 호출하여 결과를 처리합니다.

---

## 4. 관련 파일

- **[storeInfo.js](file:///d:/01.project/2team-GenPrj-frontend_United/United1_1/react/src/server/api/storeInfo.js)**: 프롬프트 빌드 로직 수정 및 데이터 구조 정의.
- **[callApi.js](file:///d:/01.project/2team-GenPrj-frontend_United/United1_1/react/src/server/api/callApi.js)**: `generateAdCopy` 통합 인터페이스 추가.
- **[initPage/App.jsx](file:///d:/01.project/2team-GenPrj-frontend_United/United1_1/react/src/modules/initPage/App.jsx)**: 디자인 선택 시 `products`를 포함하여 정보를 저장하도록 수정.
- **[editing/App.tsx](file:///d:/01.project/2team-GenPrj-frontend_United/United1_1/react/src/modules/editing/App.tsx)**: 개선된 `callApi` 연동 방식으로 문구 생성 기능 교체.
