# AI 광고 문구 자동 생성 원인 분석

## 증상

editing 화면 → '처음으로' 클릭 → initPage 진입 시 콘솔 출력:

```
[StoreInfo] 모든 문구 필드 초기화 완료
4callApi.js:383 [CallApi] AI 광고 문구 생성 요청 프롬프트: 업종: 커피숍
```

clearStoreDesc()를 실행했음에도 AI가 호출되고, 심지어 삭제된 업종 정보가 프롬프트에 포함됨.

---

## 원인 1 (핵심): autoCopyKeyRef 중복 방지 키 포맷 불일치

### 코드 위치: `react/src/modules/initPage/App.jsx`

두 useEffect가 서로 **다른 필드명**으로 키를 생성하고 있어 중복 방지 로직이 완전히 무력화됨.

**useEffect #1 (deps: [])** — 초기화 시 키 설정 (line 68–75)
```js
const currentRequestKey = JSON.stringify({
  industry: basicInfo.industry ?? '',
  storeIntro: basicInfo.storeIntro ?? '',   // ← storeIntro 사용
  products: products.map((p) => ({ ... })),
});
autoCopyKeyRef.current = currentRequestKey;
```

**useEffect #2 (AI 생성 트리거)** — AI 호출 전 키 비교 (line 94–104)
```js
const requestKey = JSON.stringify({
  storeName: basicInfo.storeName ?? '',     // ← storeName 사용 (다름!)
  industry: basicInfo.industry ?? '',
  products: products.map((product) => ({ ... })),
});

if (autoCopyKeyRef.current === requestKey) return;  // 절대 일치하지 않음
```

**결과**: `autoCopyKeyRef.current`에는 `storeIntro` 포함 키가 들어있고, `requestKey`는 `storeName` 포함 키를 만들어 비교한다. JSON 문자열이 다르므로 **두 키는 절대 일치하지 않는다**. → 중복 방지 로직(`return`) 이 영원히 작동하지 않음.

---

## 원인 2: updateBasicInfo가 useEffect #2를 매 렌더마다 재실행시킴

### 코드 위치: `react/src/modules/initPage/App.jsx` / `react/src/modules/initPage/hooks/useDesignOptions.js`

useEffect #1에서 `updateBasicInfo('storeDesc', '')` 호출 → React state 업데이트 → 재렌더 발생.  
`useDesignOptions.js`의 `updateBasicInfo`는 `useCallback` 없이 매 렌더마다 새 함수 참조 생성.

```js
// useDesignOptions.js
const updateBasicInfo = (key, value) =>
  setBasicInfo((prev) => ({ ...prev, [key]: value }));
// ↑ 매 렌더마다 새 참조 → deps에 포함된 useEffect #2가 재실행됨
```

useEffect #2의 deps:
```js
}, [basicInfo.storeDesc, basicInfo.storeName, basicInfo.industry, products, updateBasicInfo]);
//                                                                            ^^^^^^^^^^^^^^^^
//                                                              매 렌더마다 새 참조 → 매번 재실행
```

**결과**: 원인 1로 이미 깨진 중복 방지를 매 렌더마다 다시 시도하게 됨. `hasPromptSource`가 true인 상황에서는 무조건 AI 호출.

---

## 원인 3: clearStoreDesc()가 업종(industry)을 지우지 않음

### 코드 위치: `react/src/server/api/storeInfo.js`

현재 `clearStoreDesc()`는 `storeDesc`와 `products.description`만 초기화하고, `industry`와 `storeName`은 그대로 유지:

```js
clearStoreDesc() {
  const payload = {
    ...info,
    basicInfo: { 
      ...info.basicInfo,
      storeDesc: ''   // ← storeDesc만 지움
                      // industry: '커피숍' 는 그대로 남음
    },
    products: info.products?.map(p => ({ ...p, description: '' })) || [],
  };
  localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
  console.log('[StoreInfo] 모든 문구 필드 초기화 완료');
}
```

**결과**: `callApi.generateAdCopy()` → `storeInfo.buildAdPrompt()` → localStorage 읽기 → `업종: 커피숍` 포함된 프롬프트 생성. 초기화를 했음에도 AI가 이전 업종 정보를 그대로 사용함.

---

## 전체 실행 흐름 (버그 발생 시나리오)

```
① editing에서 mainSlogan 변경
   └─ handleMainSloganChange() → storeInfo.saveStoreInfo({ industry: '커피숍', storeDesc: '...' })
      → localStorage genprj_store_info = { industry: '커피숍', storeDesc: '...' }

② '처음으로' 클릭
   └─ handleBackToInitialPage()
      └─ storeInfo.clearStoreDesc()
         → storeDesc = '', industry = '커피숍' 유지 (원인 3)
      └─ window.location.href = initPageUrl

③ initPage 신규 로드
   └─ module-level: storeInfo.clearStoreDesc() (storeDesc 이미 '')
   └─ useDesignOptions: basicInfo = { storeName:'', industry:'', storeDesc:'' }

④ useEffect #1 실행 (deps: [])
   └─ storeInfo.clearStoreDesc() 재호출
   └─ updateBasicInfo('storeDesc', '') → 재렌더 트리거
   └─ autoCopyKeyRef.current = '{"industry":"","storeIntro":"","products":[...]}'
                                          ↑ storeIntro 포맷

⑤ 재렌더 발생 → updateBasicInfo 새 참조 생성 → useEffect #2 재실행 (원인 2)

⑥ useEffect #2 실행
   └─ basicInfo.storeDesc = '' → 계속 진행
   └─ hasPromptSource 확인 (React 상태 기준)
      └─ 엣지케이스: basicInfo에 비어있지 않은 값 존재 시 → true
   └─ requestKey = '{"storeName":"","industry":"","products":[...]}'
                              ↑ storeName 포맷
   └─ autoCopyKeyRef.current ≠ requestKey → 중복 방지 실패 (원인 1)
   └─ setTimeout 400ms 후 callApi.generateAdCopy() 실행
      └─ buildAdPrompt() → localStorage 읽기 → '업종: 커피숍' (원인 3)
```

---

## 수정 방향

### Fix 1 (필수): useEffect #1의 키 포맷을 useEffect #2와 동일하게 맞추기

**파일**: `react/src/modules/initPage/App.jsx`

```js
// useEffect #1 내부 — storeName을 사용하도록 수정
const currentRequestKey = JSON.stringify({
  storeName: basicInfo.storeName ?? '',   // storeIntro → storeName으로 변경
  industry: basicInfo.industry ?? '',
  products: products.map((p) => ({
    description: p.description ?? '',
    showDesc: Boolean(p.showDesc),
  })),
});
autoCopyKeyRef.current = currentRequestKey;
```

### Fix 2 (필수): updateBasicInfo를 useCallback으로 안정화

**파일**: `react/src/modules/initPage/hooks/useDesignOptions.js`

```js
// useCallback으로 감싸서 함수 참조 안정화
const updateBasicInfo = useCallback((key, value) =>
  setBasicInfo((prev) => ({ ...prev, [key]: value })),
[]);
```

### Fix 3 (권장): clearStoreDesc 호출 중복 제거

`clearStoreDesc()`가 여러 곳에서 흩어져 호출되면 디버깅이 어렵고 불필요한 I/O가 발생합니다. **초기화 책임**을 명확히 분리합니다.

**1. `react/src/modules/initPage/App.jsx` 수정**
- 모듈 레벨(파일 상단) 호출만 남겨 모든 진입 경로를 방어합니다.
- `useEffect` 내부에서는 `storeInfo.clearStoreDesc()` 호출을 **제거**합니다.

```js
// [파일 상단] 유지 - URL 직접 입력 등 모든 진입 시 스토리지 강제 초기화
if (typeof window !== 'undefined') {
  storeInfo.clearStoreDesc(); 
}

const App = () => {
  useEffect(() => {
    // storeInfo.clearStoreDesc(); ← 제거 (상단에서 이미 실행됨)
    
    updateBasicInfo('storeDesc', ''); // 상태 초기화에만 집중
    
    const currentRequestKey = JSON.stringify({ ... });
    autoCopyKeyRef.current = currentRequestKey; 
  }, []);
  // ...
}
```

**2. `react/src/modules/editing/App.tsx` 수정**
- 페이지 이동 직전에 호출하던 로직을 제거해도 무방합니다. (어차피 `initPage` 로드 시점에 위 모듈 레벨 코드가 실행되기 때문)

```ts
const handleBackToInitialPage = () => {
  // storeInfo.clearStoreDesc(); ← 제거 가능 (initPage에서 보장함)
  window.location.href = getInitPageUrl();
};
```

**결과**: 초기화 로직이 `initPage` 파일 상단 한 곳으로 집약되어 관리가 용이해집니다.

---

## 관련 파일

| 파일 | 문제 |
|------|------|
| `react/src/modules/initPage/App.jsx` | useEffect #1/#2 키 포맷 불일치, 중복 clearStoreDesc 호출 |
| `react/src/modules/initPage/hooks/useDesignOptions.js` | updateBasicInfo useCallback 미적용 |
| `react/src/server/api/storeInfo.js` | clearStoreDesc가 industry를 지우지 않아 stale 프롬프트 생성 |
