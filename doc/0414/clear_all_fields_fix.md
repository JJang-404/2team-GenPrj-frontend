# 소개 문구 및 상품 설명 완전 초기화 방법

## 1. 현상 분석
현재 `App.jsx`의 `useEffect`는 컴포넌트가 화면에 나타난 **직후**에 실행됩니다. 하지만 `useDesignOptions`나 `useProducts` 훅은 그보다 **먼저** 로컬 스토리지에서 이전 데이터를 불러와 화면에 그려버립니다. 

또한, '가게 소개 문구' 외에 **'상품별 설명'**들도 초기화 대상에 포함되어야 할 것으로 보입니다.

## 2. 해결 방법: 로컬 스토리지 강제 초기화 (최우선 순위)

`App.jsx`의 `useEffect`보다 더 확실한 방법은, **훅(Hook)이 데이터를 읽어오기 전에 로컬 스토리지를 비우는 것**입니다.

### 수정 파일: `react/src/modules/initPage/App.jsx`

기존의 `useEffect` 방식 대신, 컴포넌트 정의 바깥(가장 상단)에서 **스크립트가 로드되는 즉시** 초기화 명령을 내리는 것이 가장 확실합니다.

```jsx
// react/src/modules/initPage/App.jsx 상단

import { callApi } from '../../server/api/callApi';
import { storeInfo } from '../../server/api/storeInfo';

// [추가] App 컴포넌트가 정의되기 전, 파일이 로드되자마자 실행
// 훅이 실행되어 데이터를 메모리에 올리기 전에 스토리지에서 삭제합니다.
if (typeof window !== 'undefined') {
  storeInfo.clearStoreDesc(); 
  // 필요하다면 여기서 다른 필드(예: 상품설명)도 초기화하는 메서드를 호출할 수 있습니다.
}

const App = () => {
  // ... 생략
```

### 수정 파일: `react/src/server/api/storeInfo.js` (추천)

`storeDesc` 뿐만 아니라 **상품 설명들도 모두 비우도록** 메서드를 보강하는 것이 좋습니다.

```javascript
clearStoreDesc() {
  try {
    const info = this.getStoreInfo();
    if (!info) return;

    const payload = {
      ...info,
      // 1. 가게 소개 문구 초기화
      basicInfo: { 
        ...info.basicInfo, 
        storeDesc: '' 
      },
      // 2. [추가] 모든 상품의 설명도 빈 값으로 초기화
      products: info.products?.map(p => ({
        ...p,
        description: '' 
      })) || [],
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    console.log('[StoreInfo] 모든 문구 필드 초기화 완료');
  } catch (e) {
    console.error('[StoreInfo] 초기화 실패:', e);
  }
}
```

## 3. 요약
1. `App.jsx` 내부의 `useEffect`는 이미 데이터가 로드된 후 실행되므로 늦을 수 있습니다.
2. `App.jsx` **파일 최상단**에서 `storeInfo.clearStoreDesc()`를 호출하여 훅이 실행되기 전에 스토리지를 비우세요.
3. `storeInfo.js`에서 `products` 배열 내부의 `description`들도 함께 `''`으로 만드는 로직을 추가하세요.
