# 가게 정보 저장 및 주차장 명칭 변경 결과 보고서

## 1. 개요
가게 정보 저장 시 로그가 출력되지 않던 문제를 해결하고, '좌석 수'와 관련된 모든 명칭 및 변수를 '주차장 공간 수'로 변경했습니다.

## 2. 주요 변경 사항

### 2.1 명칭 및 변수명 변경 (`seatCount` -> `parkingCount`)
- **대상 파일**:
    - `modules/initPage/constants/design.js`
    - `modules/initPage/components/sidebar/sections/ExtraInfoSection.jsx`
    - `modules/initPage/utils/editingBridge.js`
    - `server/api/storeInfo.js`
    - `server/common/defines.js`
    - `modules/initPage/components/draft/DraftShared.jsx`
- **변경 내용**:
    - 변수: `seatCount` -> `parkingCount`, `showSeatCount` -> `showParkingCount`
    - 라벨: "좌석 공간 수" -> "주차장 공간 수"
    - 프롬프트: "좌석수 X석" -> "주차공간 X대"

### 2.2 저장 로직 및 디버깅 보강 (`initPage/App.jsx`)
- `handleSelectDesign` 함수 시작 부분에 디자인 선택 이벤트 발생 로그를 추가했습니다.
- `storeInfo.saveStoreInfo` 호출 직전에 저장 시도 로그를 추가하여 동작 여부를 명확히 확인할 수 있게 했습니다.

## 3. 결과 확인 방법
1. **초기 페이지** 사이드바의 **추가 정보** 섹션에서 "주차장 공간 수" 항목이 정상적으로 표시되는지 확인합니다.
2. 디자인 버튼 클릭 시 브라우저 콘솔(F12)에 아래 로그가 순서대로 찍히는지 확인합니다.
    - `[App] 디자인 선택 이벤트 발생 - 인덱스: 0`
    - `[App] 가게 정보 저장 시도...`
    - `[StoreInfo] 가게 정보 저장 완료: { ... }`

## 4. 참고 사항
- 로컬 스토리지 키(`genprj_store_info`)는 유지되지만 내부 데이터 구조가 변경되었습니다. 이전 데이터와의 충돌을 방지하기 위해 브라우저 캐시를 지우거나 새로고침 후 테스트하는 것을 권장합니다.
