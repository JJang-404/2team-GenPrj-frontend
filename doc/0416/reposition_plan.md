# [Guide] 타입별 광고 문구(슬로건) 위치 변경 가이드

사용자 요청에 따라 Type 1, 2는 **하단**, Type 3, 4는 **상단**으로 문구 위치를 조정하기 위한 수정 계획입니다.

## 1. 수정이 필요한 파일 목록

| 목적 | 파일 경로 |
|---|---|
| **Type 2 수정** | `react/src/modules/initPage/components/wireframe/SingleCompactLayout.jsx` |
| **Type 3 수정** | `react/src/modules/initPage/components/wireframe/OverlapGroupLayout.jsx` |
| **Type 4 수정** | `react/src/modules/initPage/components/wireframe/HalfCropGroupLayout.jsx` |
| **메인 프리뷰 동기화** | `react/src/modules/editing/utils/wireframeTextPlacements.ts` |

---

## 2. 상세 수정 방법 (How to modify)

### A. 구도 선택 카드(Thumbnails) 수정
`initPage` 폴더의 레이아웃 컴포넌트들을 수정하여 카드 내 위치를 변경합니다.

*   **Type 2 (SingleCompactLayout)**:
    -   상단 헤더 영역에 있는 `<SloganText ... />` (Line 102 부근) 코드를 제거합니다.
    -   하단에 이미 배치된 `<SloganText ... />`는 유지합니다.
*   **Type 3 (OverlapGroupLayout)**:
    -   **슬로건(Slogan)**: 하단(`absolute bottom-0`)에서 상단 헤더(`relative z-30`) 내부의 `StoreTitle` 위/아래로 이동합니다.
    -   **가게이름(Store Name)**: 상단 헤더의 `<StoreTitle ... />`을 하단(`absolute bottom-0`) 영역으로 이동시키고 **왼쪽 정렬**을 적용합니다.
*   **Type 4 (HalfCropGroupLayout)**:
    -   **슬로건(Slogan)**: 하단에서 상단 헤더 영역으로 이동합니다.
    -   **가게이름(Store Name)**: 하단 영역으로 이동하며, 글씨 크기를 대폭 키우고(Footer 위 영역까지) **중앙 정렬**을 적용합니다.

### B. 메인 프리뷰(Canvas) 좌표 수정
`wireframeTextPlacements.ts` 파일에서 `mainSlogan`과 `storeName`의 `y`, `x` 값을 조정합니다.

*   **Type 2 (Index 1)**: 
    -   `mainSlogan`: `y: 92%` (하단)로 변경.
*   **Type 3 (Index 2)**: 
    -   `mainSlogan`: `y: 15%` (상단)로 변경.
    -   `storeName`: `x: 4%`, `y: 92%` (하단 왼쪽)로 변경.
*   **Type 4 (Index 3)**: 
    -   `mainSlogan`: `y: 15%` (상단)로 변경.
    -   `storeName`: `x: 5%`, `y: 85%`, `width: 90%`, `fontSize: 48` (하단 중앙 대형)로 변경 예정.

---

## 3. 주의 사항 및 질문

*   **Type 3/4의 가게이름 위치**: 문구가 상단으로 올라오면 가게 이름과 겹치거나 나란히 배치되어야 합니다. 현재 계획은 가게 이름 바로 아래에 문구가 오도록 배치하는 것입니다.
*   **좌표값 미세 조정**: % 좌표는 실제 화면을 보면서 `y: 15%`가 상단 헤더의 적절한 위치인지 미세 조정이 필요할 수 있습니다.

---
**보고서 내용 확인 후 승인해 주시면 위 가이드에 따라 파일 수정을 시작하겠습니다.**
