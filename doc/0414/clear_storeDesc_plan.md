# 최종 광고 문구 초기화 — 수정 계획

## 목적

- `http://localhost:5173/` (initPage) 진입 시
- editing 화면의 **'처음으로'** 버튼 클릭 시

위 두 경우에 `genprj_store_info`의 `basicInfo.storeDesc` (최종 광고 문구)를 `''`으로 초기화한다.

---

## 수정 파일 및 위치

### 1. `react/src/server/api/storeInfo.js` — 메서드 추가

`StoreInfo` 클래스에 `clearStoreDesc()` 메서드를 추가한다.  
기존 저장 데이터를 읽어 `basicInfo.storeDesc`만 `''`으로 덮어쓰고 다시 저장한다.

```js
// 추가할 메서드 (buildAdPrompt 앞에 삽입)
clearStoreDesc() {
  try {
    const info = this.getStoreInfo();
    if (!info) return;
    const payload = {
      ...info,
      basicInfo: { ...info.basicInfo, storeDesc: '' },
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    console.log('[StoreInfo] 최종 광고 문구 초기화 완료');
  } catch (e) {
    console.error('[StoreInfo] 최종 광고 문구 초기화 실패:', e);
  }
}
```

---

### 2. `react/src/modules/initPage/App.jsx` — 마운트 시 초기화

컴포넌트가 처음 렌더될 때(initPage 진입 시) `clearStoreDesc()`를 호출한다.  
기존 `useEffect` 블록들 앞에 추가한다.

```js
// 추가 위치: App 컴포넌트 내부 useEffect 목록의 첫 번째로
useEffect(() => {
  storeInfo.clearStoreDesc();
}, []); // 마운트 시 1회만 실행
```

---

### 3. `react/src/modules/editing/App.tsx` — '처음으로' 버튼 핸들러

`handleBackToInitialPage` 함수에서 페이지 이동 전에 `clearStoreDesc()`를 호출한다.

**현재 코드** (App.tsx 약 458번째 줄):
```ts
const handleBackToInitialPage = () => {
  window.location.href = getInitPageUrl();
};
```

**수정 후**:
```ts
const handleBackToInitialPage = () => {
  storeInfo.clearStoreDesc();
  window.location.href = getInitPageUrl();
};
```

> `storeInfo`는 이미 파일 상단에 import되어 있으므로 별도 import 불필요.

---

## 수정 요약

| 파일 | 위치 | 변경 내용 |
|------|------|----------|
| `react/src/server/api/storeInfo.js` | `buildAdPrompt()` 앞 | `clearStoreDesc()` 메서드 추가 |
| `react/src/modules/initPage/App.jsx` | 컴포넌트 최상단 useEffect | `storeInfo.clearStoreDesc()` 마운트 시 호출 |
| `react/src/modules/editing/App.tsx` | `handleBackToInitialPage` | 이동 전 `storeInfo.clearStoreDesc()` 호출 |

---

## 흐름 정리

```
[initPage 진입]
  └─ useEffect([]) → storeInfo.clearStoreDesc()
       └─ genprj_store_info.basicInfo.storeDesc = ''

[editing → '처음으로' 클릭]
  └─ handleBackToInitialPage()
       └─ storeInfo.clearStoreDesc()   ← 이동 전 초기화
       └─ window.location.href = initPageUrl
            └─ initPage 마운트 → clearStoreDesc() 한 번 더 (이중 보호)
```
