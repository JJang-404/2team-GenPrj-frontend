# Footer 및 Type 2 레이아웃 수정값 백업 (2026-04-17)

팀원 코드와 동기화(Pull) 후 다시 적용할 때 아래 수치를 참고하세요.

## 1. Type 2 (컴팩트 헤더) 레이아웃 조정
- **목적**: 하단 Footer 영역 확보를 위해 슬로건 위치 상향
- **수정 위치**: `editorFlow.ts` -> `LEGACY_TEXT_PLACEMENTS[1]`
- **수정 값**: `slogan: { x: 0, y: 80, width: 100, align: 'center' }` (기존 92에서 80으로 변경)

## 2. Footer (주소/전화번호) 최적화 좌표
라운드 테두리 잘림 방지를 위해 안전 여백(x: 5, width: 90)과 수직 스택을 적용했습니다.

### 2.1 주소 (Address)
- **좌표**: `x: 5, y: 92.5, width: 90, height: 7`
- **정렬**: `align: 'center'`
- **색상**: `#000000`

### 2.2 전화번호 (Phone)
- **좌표**: `x: 5, y: 96, width: 90, height: 7`
- **정렬**: `align: 'center'`
- **색상**: `#000000`

## 3. 주요 로직 (재구현 가이드)
### 3.1 추가 정보 자동 생성 (`editorFlow.ts`)
- `createElementsFromWireframe` 함수 하단에 `additionalInfoLabels.forEach`를 돌려 데이터가 있을 경우 `createAdditionalInfoElements`를 호출하고 `elements` 배열에 `push` 하는 로직 필요.

### 3.2 프리뷰 연동 (`SingleCompactLayout.jsx`)
- 파일 상단에 `const DEFAULT_TEXT_COLOR = '#000000';` 정의.
- `return` 문 하단에 주소와 전화번호를 위한 별도의 `absolute div` 두 개 추가 (위 백업 좌표 사용).

### 3.3 정렬 버그 수정
- `createAdditionalInfoElements` 함수 내부에서 `align: 'left'`를 `align: 'center'`로 반드시 수정.
