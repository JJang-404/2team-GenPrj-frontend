# AI Ad-Gen Platform: United Project (Frontend)

AI를 활용한 고품질 광고 이미지 및 문구 생성 플랫폼의 프론트엔드 프로젝트입니다.

## 프로젝트 개요
본 프로젝트는 사용자가 입력한 가게 정보와 제품 이미지를 바탕으로, 상업용 수준의 광고 배경과 카피를 자동으로 생성하는 도구를 제공합니다.

## 🛠 기술 스택
- **Framework**: React v18+ (Vite)
- **Styling**: TailwindCSS, Vanilla CSS
- **HTTP Client**: Axios (BaseApi 기반 추상화)
- **State Management**: Custom Hooks (`useDesignOptions`, `useProducts`)
- **Data Persistence**: LocalStorage, IndexedDB

## 주요 기능 (Major Features)

### 1. AI 배경 생성 (AI Background Generation)
- **기능**: 선택된 제품과 어울리는 4가지 스타일의 배경을 병렬로 생성합니다.
- **주요 스타일**: 고급스러운(Elegant), 빈티지(Vintage), 세련된(Sophisticated), 카툰화(Cartoon).
- **프롬프트**: 시스템 기본 프롬프트 의존성을 제거하고, 오직 사용자의 입력 키워드와 지정된 스타일 특성만을 결합하여 생성합니다.

### 2. AI 광고 문구 생성 (AI Ad Copy Generation)
- **기능**: 가게의 메타데이터를 분석하여 문맥에 맞는 광고 카피를 생성합니다.
- **데이터 연동**: `storeInfo.js`를 통해 이전 페이지에서 입력한 가게 정보를 자동으로 수집합니다.
- **최적화**: 주차 공간, 노키즈존, 흡연 구역 보유 여부 등 사용자가 선택한 편의 시설 정보가 프롬프트에 정교하게 반영됩니다.

### 3. 데이터 브리지 시스템 (Data Bridge System)
- **Metadata Bridge**: 페이지 전환 시 유지되어야 하는 가게 기본 정보 및 편의 시설 정보는 `localStorage`를 통해 관리합니다.
- **Asset Bridge**: 고해상도 이미지와 같이 용량이 큰 데이터는 `IndexedDB` 또는 서버측 토큰 방식을 통해 전달하여 `QuotaExceededError`를 방지합니다.

## 백엔드 연동 (Backend Integration)

### API 아키텍처
- 모든 API 요청은 `BaseApi.js` 클래스를 상속받아 구현됩니다.
- **Base URL 설정**: `src/server/common/defines.js` 및 `functions.js`에서 환경에 따른 백엔드 주소를 관리합니다.

### 주요 API 모듈
- `callApi.js`: 이미지 생성, 배경 제거 등 모델 서버와의 통신을 담당합니다.
- `adverApi.js`: OpenAI/LLM 기반의 광고 문구 생성 요청을 처리합니다.
- `storeInfo.js`: 프론트엔드 전반에서 가게 정보를 관리하고 AI용 프롬프트를 빌드하는 유틸리티입니다.

## 개발 가이드

### 설치 및 초기화
```bash
# 종속성 설치
npm install

# 로컬 개발 서버 실행
npm run dev
```

### 최근 수정 사항 (Update History)
- **UI/UX 개선**: '좌석 수' 명칭을 '주차장 공간 수'로 변경하여 비즈니스 적합성 향상.
- **안정성 확보**: 로컬 스토리지 저장 시 이미지 데이터를 제외하여 브라우저 저장소 용량 초과 오류 해결.
- **가독성 강화**: AI 문구 생성 시 사용자가 선택한 정보만 프롬프트에 포함되도록 필터링 로직 고도화.

---
**Note**: 본 프로젝트는 백엔드 서버(FastAPI 기반)와 함께 구동되어야 AI 생성 기능이 정상적으로 동작합니다. 백엔드 주소는 `.env` 또는 `defines.js`에서 확인하십시오.
