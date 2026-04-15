# 최종 광고 문구 초기화 이슈 해결 방법

## 현상
- `editing`에서 `initPage`로 올 때 `localStorage`는 비워지지만, `initPage`의 React State(`basicInfo`)에는 이전 값이 남아있음.
- 이로 인해 AI가 새로운 문구를 생성하기 전까지 이전 문구가 화면에 노출되거나, 상태 값의 불일치가 발생함.

## 수정 사항

### 1. `react/src/modules/initPage/App.jsx` 수정 (핵심)

`useEffect`에서 로컬스토리지 초기화 뿐만 아니라 **React 상태값(`updateBasicInfo`)**도 명시적으로 비워줘야 합니다.

```jsx
// react/src/modules/initPage/App.jsx

// ... (기존 useEffect 목록 중 최상단에 추가)
useEffect(() => {
  // 1. 저장소(localStorage) 초기화
  storeInfo.clearStoreDesc();
  
  // 2. 화면 상태(React State) 초기화 (추가된 코드)
  // useDesignOptions에서 가져온 updateBasicInfo를 사용하여 
  // 현재 메모리에 로드된 storeDesc를 빈 값으로 만듭니다.
  updateBasicInfo('storeDesc', '');
  
  // 3. AI 생성 체크용 Ref 초기화
  autoCopyKeyRef.current = '';
}, []); // 마운트 시 1회만 실행
```

---

### 2. (참고) `react/src/server/api/storeInfo.js` 

현재 작성하신 `clearStoreDesc()` 메서드는 `localStorage`를 정확히 비우고 있으므로 수정할 필요가 없습니다.

```js
clearStoreDesc() {
  try {
    const info = this.getStoreInfo();
    if (!info) return;
    const payload = {
      ...info,
      basicInfo: { ...info.basicInfo, storeDesc: '' }, // 이 코드가 잘 작동하고 있음
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
  } catch (e) { ... }
}
```

---

## 결론
`initPage`는 진입 시점에 `localStorage`에서 데이터를 읽어와서 초기 State를 잡기 때문에, 진입 직후에 **`updateBasicInfo('storeDesc', '')`**를 실행해주는 것이 가장 확실한 방법입니다.
