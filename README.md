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
- **Wireframe Type 4 Half-Crop 복구 (2026-04-14)**: `WireframeChoiceCard` 4번째 카드의 반쪽 크롭 썸네일이 `object-fit: contain`으로 잘못 변경되어 있던 회귀를 `cover` + `left/right center`로 원복. 상세 내역은 [`doc/0414/wireframe_halfcrop_restoration_report.md`](doc/0414/wireframe_halfcrop_restoration_report.md) 참조.
- **United1_5 선택적 머지 (2026-04-14)**: `feature/United1_5`의 `ba6441a` 커밋에서 (a) 다중 선택 UX(`Ctrl/Meta + 클릭`으로 여러 요소 토글 및 동시 드래그), (b) 타입별 상품명·가격 오프셋 테이블(`productMeta`), (c) 배경 프롬프트 영어 전환만 선별적으로 반영. `storeName` / `mainSlogan` 좌표 재배치는 의도되지 않은 변경으로 판단하여 수용하지 않음. 상세 내역은 [`doc/0414/united1_5_selective_merge_report.md`](doc/0414/united1_5_selective_merge_report.md) 참조.
- **United1_6 업데이트 (2026-04-15)**: 
    - **AI 광고 문구 생성 흐름 개선**: `initPage` 로딩 시 불필요하게 호출되던 GPT API를 **'디자인 선택하기'** 버튼 클릭 시점으로 지연(Lazy-load)시켜 성능 및 비용 최적화. 메인 프리뷰 내 문구 중복 노출 오류 해결.
    - **메인 프리뷰 - 선택 카드 간 동기화 고도화**: 
        - `ResizeObserver`를 이용한 **동적 폰트 스케일링** 도입 (580px 기준 비율 유지).
        - 텍스트 박스 너비 로직(`fit-content`) 일원화로 메인 프리뷰와 선택 카드 간의 **위치 정합성(Position Sync)** 확보.
        - 구도 선택(Type 1, 2) 시 제품 이미지의 가로세로비(AR) 스케일링을 `initPage`와 동일하게 적용.
    - 상세 내역은 [`doc/0415/work_summary.md`](doc/0415/work_summary.md) 참조.
- **United1_8 계층형 Wireframe 구조 (2026-04-16)**:
    - **계층 구조 전환**: 기존 전체 캔버스(1000×1250) 기준 wireframe을 **outer frame zone + inner wireframe** 계층 구조로 전환. 로고/소개 문구/footer는 독립 요소로 분리하고, 제품 슬롯은 main zone(1000×850) 내부에서만 배치.
    - **Zone 위치 상태 관리**: `ZonePositions` 타입을 도입하여 각 zone(store, slogan, details, summary)의 위치를 React state로 관리. Type별 기본 위치는 `getDefaultZonePositions()`로 생성.
    - **EditorElement 직접 생성**: 템플릿 시스템을 거치지 않고 `createElementsFromWireframe()`이 wireframe zone 좌표 + 제품 슬롯에서 직접 `EditorElement[]` 생성. WireframeChoiceCard/main preview/BackgroundCard 간 레이아웃 일관성 확보.
    - **Type 4 half-crop 간격 수정**: editing 모듈의 `wireframeLayout.ts`에서 `CANVAS_HW_RATIO`를 전체 캔버스 비율(1.25)에서 main zone 비율(0.85)로 수정하여 main preview/BackgroundCard에서 반쪽 크롭 이미지 간 불필요한 간격 제거.
    - **9:16 Reflow 지원**: 세로 비율에서 로고 상단 고정, footer/소개 문구 하단 앵커, main zone 세로 중앙 배치.
    - 상세 내역은 [`doc/0416/hierarchical_wireframe_spec.md`](doc/0416/hierarchical_wireframe_spec.md) 참조.

---
**Note**: 본 프로젝트는 백엔드 서버(FastAPI 기반)와 함께 구동되어야 AI 생성 기능이 정상적으로 동작합니다. 백엔드 주소는 `.env` 또는 `defines.js`에서 확인하십시오.
