# 2026-04-19 AI 기능 통합 및 모듈화 보고서

본 보고서는 `United1_7` 브랜치에서 완성된 고퀄리티 AI 이미지 생성 파이프라인을 `United1_8` 브랜치의 최신 UI 레이아웃에 통합한 내역을 설명합니다.

---

## 1. 개요
*   **목적**: `United1_8` 팀원의 UI 작업물을 100% 보존하면서, `United1_7`의 AI 핵심 기능을 안정적으로 이식함.
*   **기술적 지향점**: `App.tsx` 파일의 비대화를 방지하고 가독성 및 유지보수성을 극대화하기 위해 **Custom Hook** 기반의 모듈화 방식을 채택함.

---

## 2. 주요 변경 사항

### [모듈화] AI 디자인 시스템 커스텀 훅 (`useAiDesignSystem`)
*   **파일**: `react/src/modules/editing/hooks/useAiDesignSystem.ts` [NEW]
*   **기능**: 배경 이미지의 밝기를 분석하여 텍스트 가독성을 위한 최적의 색상(Black/White)을 자동으로 설정함.
*   **효과**: `App.tsx`에서 복잡한 분석 로직을 분리하여 코드 가독성을 높임.

### [AI 최적화] 업종별 프롬프트 자동 연동
*   **기능**: 사용자가 입력한 업종 데이터(카페, 식당 등)를 분석하여 생성 프롬프트를 자동으로 조립함.
*   **연동**: `App.tsx`에서 배경 생성 요청 시 `industry` 데이터를 자동으로 전달하도록 수정함.

### [UI 보존] App.tsx 최소 수정
*   **수정 사항**: 기존 UI 렌더링 코드는 건드리지 않고, 커스텀 훅을 등록하는 코드 단 1줄과 API 인자를 추가하는 부분만 수정함.
*   **효과**: 팀원이 작성한 `EditorCanvas`, `WireframeChoiceCard` 등의 레이아웃 로직이 완벽하게 유지됨.

---

## 3. 관련 파일 목록

| 분류 | 파일 경로 | 주요 역할 |
| :--- | :--- | :--- |
| **Hook** | `.../hooks/useAiDesignSystem.ts` | **[NEW]** 배경 밝기 분석 및 대비 자동화 |
| **Utility** | `.../utils/imageAnalysis.ts` | **[NEW]** 이미지 픽셀 밝기 분석 엔진 |
| **Constants**| `.../constants/prompts.ts` | **[NEW]** 업종별 씬 프롬프트 및 키워드 |
| **API** | `.../server/api/callApi.js` | 업종별 프롬프트 조립 로직 적용 |
| **API** | `.../server/api/modelApi.js` | ComfyUI 비동기 폴링 로직 적용 |
| **Main** | `.../editing/App.tsx` | 모듈화된 훅 장착 및 로직 통합 |

---

## 4. 향후 가이드
*   **이미지 분석 알고리즘**을 수정하려면 `imageAnalysis.ts`를 수정하십시오.
*   **자동 색상 전환 정책**을 변경하려면 `useAiDesignSystem.ts`를 수정하십시오.
*   **업종별 프롬프트**를 추가하려면 `prompts.ts`에 키워드를 추가하십시오.

---
**2team-GenPrj AI 통합 완료 (2026-04-19)**
