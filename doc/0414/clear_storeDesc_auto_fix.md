# AI 자동 생성 충돌 해결 방법

## 원인 분석
1. `useEffect(..., [])`가 실행되어 `storeDesc`를 `""`로 비웁니다.
2. 동시에 `autoCopyKeyRef.current = ""`로 초기화됩니다.
3. 바로 아래에 있는 **AI 생성 `useEffect`**가 실행됩니다.
4. 이때 `basicInfo.storeName` 등이 이미 입력되어 있다면, `autoCopyKeyRef.current("")`와 `requestKey(현재정보)`가 다르다고 판단하여 **즉시 새로운 문구를 생성**해버립니다.
5. 결과적으로 사용자는 문구가 지워진 것을 인지하기도 전에 새로운 문구가 채워지는 것을 보게 됩니다.

## 해결 방법

페이지 진입 시 문구를 비울 때, **현재 입력값들의 상태를 `autoCopyKeyRef`에 미리 저장**하여 AI가 "아, 이 정보들로는 이미 문구를 만들었구나"라고 착각하게 만들어야 합니다.

### `react/src/modules/initPage/App.jsx` 수정

```jsx
// 1. 마운트 시 초기화 전용 useEffect 수정
useEffect(() => {
  // 1) 저장소 초기화
  storeInfo.clearStoreDesc();
  
  // 2) 화면 상태 초기화
  updateBasicInfo('storeDesc', '');
  
  // 3) 핵심: 현재의 이름/업종/상품 정보를 반영한 Key를 생성하여 Ref에 저장
  // 이렇게 하면 AI 생성 useEffect가 "이미 실행된 적이 있다"고 판단하여 즉시 재생성하지 않습니다.
  const currentRequestKey = JSON.stringify({
    storeName: basicInfo.storeName ?? '',
    industry: basicInfo.industry ?? '',
    products: products.map((product) => ({
      description: product.description ?? '',
      showDesc: Boolean(product.showDesc),
    })),
  });
  
  autoCopyKeyRef.current = currentRequestKey; 
}, []); // 마운트 시 1회 실행
```

## 기대 효과
- 페이지 진입 시 소개 문구는 `""` (빈 값)이 됩니다.
- AI는 현재 정보를 기반으로 **다시 자동으로 생성하지 않습니다.** (이미 했다고 생각함)
- 사용자가 **가게 이름을 수정하거나 상품 설명을 바꿀 때만** AI가 다시 작동하게 됩니다.
