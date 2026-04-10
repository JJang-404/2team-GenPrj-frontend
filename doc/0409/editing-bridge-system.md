# Editing Bridge System (Token-based)

이 문서는 초기 페이지(`initPage`)에서 편집 페이지(`editing`)로 대용량 데이터를 안전하게 전달하기 위해 구현된 **토큰 기반 브릿지 시스템**에 대해 설명합니다.

## 1. 배경 및 문제점
- **기존 방식**: `sessionStorage` 또는 `window.name`을 사용하여 데이터를 전달했습니다.
- **문제점**: 고해상도 제품 이미지나 배경 데이터가 포함될 경우 브라우저의 저장 용량 제한(보통 5MB)을 초과하여 `QuotaExceededError (setItem exceeded the quota)`가 발생했습니다.

## 2. 해결 방안: 백엔드 브릿지 (Token 방식)
데이터를 브라우저에 직접 저장하는 대신, 백엔드 서버의 메모리에 임시 저장하고 고유한 **토큰**만 전달하는 방식으로 변경했습니다.

### 데이터 흐름
1. **[initPage]** 사용자가 디자인을 선택하면 편집용 페이로드를 생성합니다.
2. **[initPage]** 백엔드 API(`POST /api/bridge/editing`)를 호출하여 데이터를 전송합니다.
3. **[Backend]** 서버는 데이터를 메모리에 저장하고 무작위 토큰(UUID)을 발급합니다. (만료 시간: 10분)
4. **[initPage]** 발급받은 토큰을 포함한 URL로 이동합니다. (예: `/editing?token=8f3b...`)
5. **[editing]** 페이지 로드 시 URL에서 토큰을 추출합니다.
6. **[editing]** 백엔드 API(`GET /api/bridge/editing/:token`)를 통해 원본 데이터를 가져와 편집 환경을 복원합니다.

## 3. 주요 변경 파일 및 코드

### Frontend (initPage)
- **`react/src/modules/initPage/utils/editingBridge.js`**:
    - `storeEditingPayload` 함수가 비동기로 변경되었으며, 백엔드 API를 호출하여 토큰을 반환합니다.
- **`react/src/modules/initPage/App.jsx`**:
    - 편집 페이지 이동 시 `?token=${token}` 파라미터를 URL에 추가합니다.

### Frontend (Editing)
- **`react/src/modules/editing/utils/editingBridge.ts`**:
    - `readEditingBridgePayload` 함수가 비동기로 변경되었습니다.
    - URL에 토큰이 있을 경우 백엔드에서 데이터를 가져오는 로직이 추가되었습니다.
- **`react/src/modules/editing/App.tsx`**:
    - 브릿지 데이터를 읽어올 때 `await`를 사용하여 데이터 로딩을 보장합니다.

### Backend
- **`Backend/src/services/bridgeService.js`**:
    - 메모리 내 `Map`을 사용하여 토큰과 데이터를 매핑하고 TTL(Time-To-Live) 기반으로 자동 삭제합니다.
- **`Backend/src/routes/editorRoutes.js`**:
    - 브릿지 데이터를 생성(`POST`)하고 조회(`GET`)하는 라우트가 정의되어 있습니다.

## 4. 장점
- **용량 제한 해제**: 이미지 데이터 크기에 상관없이 안정적인 데이터 전달이 가능합니다.
- **보안 및 클린 URL**: 원본 데이터가 URL에 노출되지 않으며, 데이터 복원 후 URL 파라미터를 제거하여 깔끔한 상태를 유지합니다.
