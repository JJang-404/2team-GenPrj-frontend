# [긴급] 데이터 유실 및 API 연동 실패 원인 분석 리포트 (0414)

## 1. 현상 분석
- `initPage`에서 정보를 입력하고 '이 디자인 선택'을 눌렀으나, `editing` 페이지에서 데이터가 보이지 않음.
- `F12` 개발자 도구의 LocalStorage(`genprj_store_info`)가 비어 있거나 연동되지 않음.
- API 호출(`CallApi`)이 발생하지 않거나 `[StoreInfo] 초기화 완료` 로그가 남지 않음.

## 2. 근본 원인 (Root Cause)

### 2.1 파일 로드 시 강제 초기화 (Critical)
`react/src/modules/initPage/App.jsx` 파일 28-32라인에 있는 코드가 원인입니다.
```javascript
if (typeof window !== 'undefined') {
  storeInfo.clearStoreDesc();
}
```
이 코드는 React의 생명주기와 상관없이 **JS 파일이 브라우저에 로드되자마자 실행**됩니다. 
사용자가 페이지를 이동하려고 할 때 브라우저가 리소스를 다시 로드하거나 실행하는 과정에서 **방금 저장한 `genprj_store_info`를 삭제**해버립니다.

### 2.2 파괴적인 초기화 방식 (`removeItem`)
최근 수정에서 `clearStoreDesc()`가 `localStorage.removeItem()`을 사용하도록 변경되었습니다.
이로 인해 데이터가 삭제되면 `industry`, `storeName` 등이 모두 사라져, `editing` 페이지에서 AI 문구를 생성하기 위한 최소한의 정보조차 남지 않게 됩니다.

## 3. 해결 방안 (Action Plan)

### Step 1: `initPage/App.jsx` 전역 초기화 코드 제거
파일 상단에 위치한 `storeInfo.clearStoreDesc()` 호출을 완전히 삭제합니다. 초기화는 React 컴포넌트 내부의 `useEffect`에서 관리되어야 합니다.

### Step 2: `storeInfo.js` 초기화 로직 복구 및 개선
`clearStoreDesc()`가 모든 데이터를 삭제하는 대신, **광고 문구(`storeDesc`)만 비우고 나머지 정보(업종 등)는 유지**하도록 수정합니다. 이렇게 해야 `editing` 페이지로 넘어갔을 때 AI가 남아있는 정보를 바탕으로 문구를 새로 생성할 수 있습니다.

### Step 3: `editing/App.tsx` 탈출 시점에만 명시적 초기화
'처음으로' 버튼을 누를 때만 데이터를 삭제하도록 하여, 페이지 간 이동 시 데이터가 보존되도록 합니다.

## 4. 기대 효과
- `initPage` → `editing` 이동 시 데이터가 완벽하게 보존됩니다.
- `editing` 페이지 진입 시 로컬스토리지 정보를 기반으로 AI 광고 문구 생성이 정상 작동합니다.
- 불필요한 데이터 증발 현상이 사라집니다.
