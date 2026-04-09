# revise.md

## 목적

이 문서는 `gen_prj/2team-GenPrj-frontend/react` 통합 프론트에서 최근 반영한 수정사항을 별도로 정리한 문서입니다.  
특히 사용자가 이미 인지하고 있던 아래 항목 외의 후속 수정도 함께 기록합니다.

- 텍스트를 입력하지 않은 정보는 기본적으로 보이지 않도록 변경
- 단색/그라데이션/다중색 배경 후보 로직 수정
- 그라데이션/다중색을 2가지 색 기준으로 정리

아래는 그 외 추가로 반영된 수정사항입니다.

---

## 1. `initPage -> editing` 단일 프론트 통합

- `initPage`와 `editing`을 하나의 React 프로젝트로 통합
- 라우팅 구조:
  - `/` : initPage
  - `/editing` : editing
- 주요 구성:
  - `src/pages/InitPage.tsx`
  - `src/pages/EditingPage.tsx`
  - `src/modules/initPage/*`
  - `src/modules/editing/*`

의미:
- 더 이상 프런트 서버를 2개 띄우는 구조가 아니라, 같은 프런트 안의 1페이지/2페이지 구조로 동작

---

## 2. `initPage -> editing` 데이터 브리지 정리

- 디자인 선택 시 `initPage` 입력값을 `editing`에서 요구하는 payload로 변환
- `bridgeToken` + storage fallback을 통해 `/editing`으로 전달
- 대용량 이미지 전달 안정성을 높이기 위해 `blob:` 대신 `data URL` 위주로 정리

관련 파일:
- `src/modules/initPage/utils/editingBridge.js`
- `src/modules/editing/utils/editingBridge.ts`

---

## 3. 배경제거 이미지 전달 안정화

- `initPage`에서 배경제거 결과를 `blob:`로만 들고 있지 않도록 정리
- 잘린 투명 PNG 결과를 안전하게 넘길 수 있도록 처리

관련 파일:
- `src/modules/initPage/utils/removeBackground.js`
- `src/modules/initPage/utils/cropToBoundingBox.js`
- `src/modules/initPage/hooks/useProducts.js`

---

## 4. `editing`도 브라우저 내 배경제거 사용

이전:
- `editing`은 백엔드/Hugging Face 기반 `/images/remove-background`를 사용
- 토큰 권한 문제 시 에러 발생 가능

현재:
- `editing`도 `initPage`와 동일하게 `@imgly/background-removal` 기반 클라이언트 로컬 처리
- 앱 시작 시 preload 한 번만 수행

관련 파일:
- `src/main.tsx`
- `src/modules/editing/App.tsx`
- `src/modules/initPage/utils/removeBackground.js`
- `src/modules/initPage/config/backgroundRemoval.js`

효과:
- HF 권한 오류와 무관하게 프런트에서 직접 배경 제거 가능

---

## 5. `initPage` 배치와 `editing` 배치 동기화

문제:
- `initPage`에서 보던 초안 배치와 `editing` 배치가 달랐음

수정:
- 공통 제품 슬롯 정의를 분리
- `initPage` 미리보기와 `editing`이 같은 슬롯 좌표를 사용하도록 변경

관련 파일:
- `src/shared/draftLayout.ts`
- `src/modules/initPage/components/draft/DraftShared.jsx`
- `src/modules/editing/utils/editorFlow.ts`

효과:
- 사용자가 선택한 초안의 제품 배치가 `editing`에서도 더 비슷하게 재현됨

---

## 6. 텍스트 위치/회전/z-index 동기화

문제:
- 가게명, 문구, 요약 정보의 위치와 각도, 레이어 순서가 `initPage`와 달랐음

수정:
- 공통 텍스트 배치 정의에 다음 정보를 포함
  - `x`
  - `y`
  - `width`
  - `rotation`
  - `zIndex`
  - `align`

관련 파일:
- `src/shared/draftLayout.ts`
- `src/modules/editing/utils/editorFlow.ts`

효과:
- `editing`에서 가게명/문구가 더 비슷한 위치와 각도로 표시됨
- 타이틀이 객체 뒤가 아니라 위로 오도록 레이어 순서 보정

---

## 7. 타이포그래피 규칙 공통화

문제:
- 가게명 크기와 느낌이 `initPage`와 `editing`에서 달라 보였음

수정:
- 초안별/비율별 타이포 규칙을 별도 유틸로 분리
- `draftIndex`, `ratio`를 기준으로 `editing`도 같은 폰트 크기/line-height 사용

관련 파일:
- `src/shared/draftTypography.ts`
- `src/modules/editing/utils/editorFlow.ts`
- `src/modules/editing/App.tsx`

효과:
- `initPage`의 가게명 크기와 `editing`의 가게명 크기 차이를 줄임

---

## 8. `editing` 폰트 일치 및 폰트 변경 기능 추가

수정:
- `editing`에도 `ZenSerif` 폰트를 직접 선언
- 텍스트 선택 시 사이드바에서 글씨체 직접 변경 가능
- 배경 모드/템플릿/텍스트 역할 기준 추천 폰트 적용 버튼 추가

관련 파일:
- `src/modules/editing/styles/global.css`
- `src/modules/editing/components/sidebar/ElementInfoPanels.tsx`
- `src/modules/editing/utils/fontRecommendations.ts`

현재 제공 폰트 예시:
- Zen Serif
- Pretendard
- Noto Sans KR
- Georgia
- Arial Black

---

## 9. 입력하지 않은 값은 기본적으로 숨김

수정:
- 가게명 미입력 시 가게명 숨김
- 소개문구 미입력 시 메인 문구 숨김
- 상세 설명 미입력 시 숨김
- 금액 미입력 시 가격 텍스트 숨김
- 업종은 자동으로 상세문구에 넣지 않도록 제거
- 템플릿 기본 세로문구(`CHOCOLATE`, `MATCHA` 등) 숨김

관련 파일:
- `src/modules/editing/utils/editorFlow.ts`
- `src/modules/initPage/utils/editingBridge.js`

효과:
- 사용자가 입력한 값만 보이게 정리

---

## 10. 가격/통화 중복 표기 정리

문제:
- 금액이 없는데도 `원 / 원`, `원원` 같은 텍스트가 보였음

수정:
- 금액이 있을 때만 통화와 결합
- 가격 요약 생성 시 금액이 비어 있으면 통화만 단독으로 붙지 않도록 수정
- 추가 상품 캡션에서도 동일 규칙 적용

관련 파일:
- `src/modules/initPage/utils/editingBridge.js`
- `src/modules/editing/utils/editorFlow.ts`
- `src/modules/editing/components/sidebar/ElementInfoPanels.tsx`

---

## 11. 단색/그라데이션/다중색 초기 배경 유지

수정:
- `editing` 진입 직후 첫 배경은 `initPage`에서 보던 구조를 유지
- 단, `editing`에서 바꾼 현재 색상 토큰을 반영해 다시 계산 가능하도록 정리
- 배경 후보 생성 후에도 첫 후보는 초기 배경을 유지

관련 파일:
- `src/modules/editing/utils/initialBackground.ts`
- `src/modules/editing/App.tsx`
- `src/shared/backgroundStyle.ts`

---

## 12. 단색/그라데이션/다중색 규칙 정리

추가 수정:
- 단색:
  - 후보 목록을 굳이 보여주지 않고 바로 편집 화면 진입
  - `배경 후보 보기` 버튼도 숨김
- 그라데이션:
  - 2색 고정
- 다중색:
  - 2색 고정
  - 후보 생성 시 제3색/제4색이 끼어드는 구성 제거

관련 파일:
- `src/modules/editing/components/sidebar/BackgroundOptionsSection.tsx`
- `src/modules/editing/App.tsx`
- `gen_prj/2team-GenPrj-backend/src/services/backgroundService.js`

---

## 13. 템플릿 장식(shape/image) 숨김 규칙 강화

문제:
- 단색 배경인데도 원형 패널, 대각선 띠 같은 템플릿 장식이 남아 보였음

수정:
- 이미지 장식뿐 아니라 템플릿의 `shape` 장식도 decorative element로 취급
- `arch-panel`, `diagonal` 등 배경 장식 요소를 숨김 처리

관련 파일:
- `src/modules/editing/utils/editorFlow.ts`

효과:
- 단색/2색 배경을 쓸 때 템플릿 장식이 덜 끼어듦

---

## 14. 선택 요소의 앞/뒤 순서 변경 기능

수정:
- 텍스트와 이미지 패널 모두 `뒤로`, `앞으로` 버튼 추가
- 단순 `zIndex +/- 1`이 아니라 실제 최소/최대 기준으로 보내도록 조정

관련 파일:
- `src/modules/editing/components/sidebar/ElementInfoPanels.tsx`
- `src/modules/editing/components/Sidebar.tsx`
- `src/modules/editing/App.tsx`

효과:
- 사용자 객체와 텍스트가 실제로 앞/뒤로 명확히 이동

---

## 15. 선택 박스 시각 보정

수정:
- 텍스트 선택 시 wrapper 전체보다 실제 텍스트에 더 가깝게 점선이 보이도록 조정
- 이미지도 선택 시 이미지 쪽에 직접 점선이 보이도록 조정

관련 파일:
- `src/modules/editing/components/EditorCanvas.tsx`
- `src/modules/editing/styles/global.css`

참고:
- 현재는 “더 타이트한 선택 박스” 수준
- PNG의 실제 불투명 픽셀 외곽까지 완전히 따라가는 실루엣 선택은 아직 아님

---

## 16. `editing` 상품 사진 정보 확장

수정:
- 이미지 요소 선택 시 다음 항목 편집 가능
  - 이름
  - 금액
  - 통화(`원`, `$`)
  - 소개문구
  - 배경 제거
  - 객체 제거
  - 사진 수정

관련 파일:
- `src/modules/editing/components/sidebar/ElementInfoPanels.tsx`
- `src/modules/editing/types/editor-core.ts`

---

## 17. 추가 정보 아이콘 체계 정리

수정:
- 추가 정보 아이콘을 정해진 파일명 규칙으로 관리
- 상태별 yes/no 아이콘 파일 분리
- 주차 공간 수는 숫자 배지 포함 처리

관련 파일:
- `src/modules/editing/utils/additionalInfo.ts`
- `public/info-icons/*`

---

## 18. 현재 남아 있을 수 있는 한계

- `editing`은 여전히 “initPage 화면 자체 복제”가 아니라 “템플릿 편집기” 기반
- 따라서 위치/크기/회전은 많이 맞췄지만, 완전히 픽셀 단위 1:1 복제는 아님
- 템플릿 요소가 남아 있을 경우 일부 화면은 추가 보정이 더 필요할 수 있음

---

## 19. 관련 핵심 경로

- 통합 프론트 루트  
  `gen_prj/2team-GenPrj-frontend/react`

- initPage 모듈  
  `gen_prj/2team-GenPrj-frontend/react/src/modules/initPage`

- editing 모듈  
  `gen_prj/2team-GenPrj-frontend/react/src/modules/editing`

- 공통 레이아웃/배경/타이포 규칙  
  `gen_prj/2team-GenPrj-frontend/react/src/shared`

- 백엔드 배경 생성 로직  
  `gen_prj/2team-GenPrj-backend/src/services/backgroundService.js`
