# [최종] 브리지 데이터 연동 및 Backend_final 통합 가이드

이 문서는 `initPage`에서 `editingPage`로 이동할 때 **좌표, 크기, 크롭 정보, 스타일** 등의 상세 데이터가 유실되지 않도록 보장하고, 최종 백엔드인 `Backend_final`(FastAPI)과 연동하는 방법을 정의합니다.

---

## 1. 현재 연동 상태 및 누락 항목 (Data Gap)

현재 시스템은 이미지 원본과 텍스트 내용만 전달할 뿐, 사용자가 편집한 **배치 정보**를 모두 버리고 있습니다.

### 1-1. 반드시 추가해야 할 데이터 항목
- **텍스트 요소**: `x`, `y`, `fontSize`, `fontFamily`, `color`, `fontWeight`
- **이미지 요소**: `x`, `y`, `width`, `height`, `rotation`
- **크롭 정보**: `cropX`, `cropY`, `cropW`, `cropH` (이미지를 자른 경우의 시작점과 크기)

---

## 2. 최종 백엔드 (`Backend_final`) 연동 및 검증

최종적으로 모든 데이터는 `Backend_final`(FastAPI) 서버를 거치게 됩니다.

### 2-1. 백엔드 연동 절차
1.  **API 엔드포인트**: `POST https://gen-proj.duckdns.org/addhelper/bridge/editing` (예시)
2.  **데이터 저장**: FastAPI의 `bridgeService.py`는 전달받은 고해상도 이미지와 좌표 데이터를 메모리(`dict` 또는 `Redis`)에 UUID 토큰과 함께 저장합니다.
3.  **데이터 조회**: 에디팅 페이지 진입 시 `GET /addhelper/bridge/editing/{token}`을 통해 전체 패키지를 다시 불러옵니다.

### 2-2. 연동 확인 방법 (Verification)
연동이 원활한지 확인하려면 다음 단계를 수행하세요:
1.  **브라우저 개발자 도구 (F12) -> Network 탭**: 
    - '디자인편집' 버튼 클릭 시 `editing` 호출의 **Payload**를 확인합니다. 
    - 위에서 말한 `x, y, cropX` 등의 값이 JSON에 포함되어 있는지 봅니다.
2.  **API 수동 호출**: 
    - 발급받은 토큰을 가지고 브라우저 주소창에 `http://localhost:4000/api/bridge/editing/{토큰}`을 직접 입력해 봅니다.
    - 백엔드가 저장한 데이터가 내가 보낸 데이터와 일치하는지 확인합니다.
3.  **서버 로그 확인**: 
    - `Backend_final` 터미널에서 `INFO: Remote bridge data stored for token: ...`와 같은 로그가 찍히는지 확인합니다.

---

## 4. 알려진 한계점 및 기술적 해결 방안 (Technical Solutions)

기존에 식별된 한계점들을 다음과 같은 방식으로 극복합니다.

### 4-1. x, y, width, height 데이터 유실 해결
- **원인**: `initPage`의 드래그/리사이즈 결과가 `products` 상태에 반영되지 않거나, 전송 시 제외됨.
- **해결**: 
    - `useProducts.js`에 `updateTransform(id, {x, y, w, h})` 액션을 추가합니다.
    - `DraftCard`의 드래그 종료(`onDragStop`) 시점에 해당 좌표를 상태로 동기화합니다.
    - `buildEditingPayload`에서 이 정보를 최종 JSON에 포함시킵니다.

### 4-2. 대용량 이미지 유실 (Backend Down 시 폴백 문제) 해결
- **문제**: 백엔드 장애 시 `sessionStorage`로 폴백하지만, 5MB 제한 때문에 대용량 이미지는 여전히 저장이 불가능함.
- **해결 방안 A (IndexedDB 사용)**:
    - `sessionStorage` 대신 용량 제한이 거의 없는(수백 MB 가능) **IndexedDB**를 폴백 저장소로 사용합니다. `localforage` 같은 라이브러리를 쓰거나 브라우저 기본 API로 구현 가능합니다.
- **해결 방안 B (전송 전 리사이징/압축)**:
    - 배경 제거 후 이미지를 전송하기 직전, 캔버스를 이용해 **최대 해상도를 제한(예: 2000px 이하)**하거나 **WebP/JPEG 압축**을 진행하여 데이터 크기를 물리적으로 줄입니다.
- **해결 방안 C (Bounding Box Crop)**:
    - 투명한 배경을 제외하고 실제 객체가 있는 부분만 잘라내어 전송 데이터 크기를 최소화합니다.

---

## 5. Claude를 위한 최종 구현 프롬프트 (확장판)

> **Claude에게 전달할 메시지:**
> "너는 전문 풀스택 개발자야. 데이터 유실 및 용량 제한 문제를 완벽히 해결해줘:
> 
> 1. **좌표 시스템 완성**: `DraftCard`에서 사용자가 움직인 모든 좌표(`x, y, width, height`)가 `useProducts` 상태를 거쳐 `buildEditingPayload`에 담기도록 해.
> 2. **강력한 폴백 시스템**: 백엔드 접속 불가 시 `sessionStorage` 대신 **IndexedDB**에 데이터를 임시 저장하는 로직을 `editingBridge.js`에 구현해줘. 이를 통해 5MB 이상의 이미지도 로컬에서 안전하게 넘길 수 있어야 해.
> 3. **이미지 경량화**: 배경 제거 후 `cropToBoundingBox` 로직을 적용해서 불필요한 투명 영역을 제거하고 전송해.
> 4. **에디터 복원 우선순위**: `editingPage`는 데이터를 복원할 때, 템플릿의 기본 좌표보다 전달받은 `payload`의 좌표를 무조건 우선시하도록 `mapProjectDataToTemplate` 로직을 수정해줘."

---

## 6. 결론 및 주의사항
- **데이터 무결성**: 어떠한 상황(백엔드 장애, 대용량 이미지)에서도 사용자가 공들여 맞춘 배치와 이미지가 사라지지 않게 하는 것이 최우선 목표입니다.
- **최우선순위**: 사용자가 `initPage`에서 이미지를 옮겼다면, 에디팅 페이지의 템플릿 위치보다 **사용자의 좌표**가 항상 우선되어야 합니다.
