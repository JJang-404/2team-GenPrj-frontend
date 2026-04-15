# storeDesc 혼용 버그 수정 패치 노트

> 작성일: 2026-04-15  
> 적용 경로: `D:\01.project\2team-GenPrj-frontend\react`

---

## 배경

`initPage`에서 아무것도 입력하지 않아도 GPT 호출이 발생하고,  
이전 세션의 광고 문구가 자동으로 채워지는 버그가 있었습니다.

### 핵심 원인
- `basicInfo.storeDesc` (AI 생성 광고 문구)와 `basicInfo.storeIntro` (사용자 직접 입력)가 혼용됨
- initPage 마운트 시 GPT를 자동 호출하는 useEffect가 항상 발동됨
- `editing` 화면에서 '처음으로' 클릭 시 localStorage 초기화가 없어 이전 데이터가 오염됨

---

## 수정 파일 목록

| 파일 | 수정 내용 |
|------|----------|
| `react/src/modules/initPage/App.jsx` | 자동 GPT useEffect 제거, 마운트 초기화 추가, handleSelectDesign 재설계 |
| `react/src/server/api/storeInfo.js` | `clearStoreDesc()` · `clearStoreIntro()` 추가, `buildAdPrompt()` 수정 |
| `react/src/modules/editing/App.tsx` | `handleBackToInitialPage`에 초기화 호출 추가 |
| `react/src/modules/initPage/components/sidebar/sections/BasicInfoSection.jsx` | `storeDesc` → `storeIntro` 바인딩 수정 |

---

## 변수 역할 정의

| 변수 | 의미 |
|------|------|
| `basicInfo.storeIntro` | 사용자가 직접 입력하는 **가게 소개 문구** (미입력 가능) |
| `basicInfo.storeDesc` | AI가 생성한 **최종 광고 문구** (`editing`의 `mainSlogan` 원본) |
| `projectData.mainSlogan` | editing 화면에서 표시되는 **최종 광고 문구** |

---

## 수정 내용 상세

### 1. `BasicInfoSection.jsx` — storeDesc → storeIntro 바인딩

```jsx
// 수정 전
value={basicInfo.storeDesc}
onChange={(e) => updateBasicInfo('storeDesc', e.target.value)}

// 수정 후
value={basicInfo.storeIntro ?? ''}
onChange={(e) => updateBasicInfo('storeIntro', e.target.value)}
```

> 사용자 입력 필드는 `storeIntro`에 바인딩해야 합니다.  
> `storeDesc`는 AI가 생성한 결과를 저장하는 전용 키입니다.

---

### 2. `initPage/App.jsx` — 자동 GPT useEffect 제거 및 마운트 초기화 추가

```javascript
// 제거: 입력 변경마다 GPT를 자동 호출하던 useEffect 전체 삭제
// useEffect(() => { ... }, [basicInfo.storeDesc, basicInfo.storeName, ...]);

// 추가: 마운트 시 이전 세션 광고 문구 초기화
useEffect(() => {
  storeInfo.clearStoreDesc();
  autoCopyKeyRef.current = '__init__';
}, []);
```

---

### 3. `initPage/App.jsx` — handleSelectDesign 재설계

"이 디자인 선택" 클릭 시에만 GPT를 호출하도록 변경.  
`storeIntro`가 입력되어 있으면 GPT 호출 없이 그대로 사용.

```javascript
const handleSelectDesign = async (idx) => {
  let finalStoreDesc = basicInfo.storeDesc;

  if (!basicInfo.storeIntro?.trim()) {
    // generateAdCopy()는 localStorage에서 읽으므로 호출 전에 먼저 저장
    storeInfo.saveStoreInfo({ basicInfo, products });

    try {
      const result = await callApi.generateAdCopy();
      if (!result?.ok) {
        console.warn('[InitPage] AI 광고 문구 생성 실패 (API 오류):', result?.error);
      } else {
        const generated = extractAdCopy(result);
        if (generated) {
          finalStoreDesc = generated;
          updateBasicInfo('storeDesc', generated);
        }
      }
    } catch (error) {
      console.warn('[InitPage] AI 광고 문구 생성 중 네트워크/연결 오류:', error);
    }
  }

  // storeIntro가 있으면 그대로 사용, 없으면 AI 생성 문구 사용
  const mergedBasicInfo = {
    ...basicInfo,
    storeDesc: basicInfo.storeIntro?.trim() ? basicInfo.storeIntro : finalStoreDesc,
  };

  storeInfo.saveStoreInfo({ basicInfo: mergedBasicInfo, products });

  const payload = await buildEditingPayload({
    options,
    basicInfo: mergedBasicInfo,  // ← mergedBasicInfo 전달 (기존: basicInfo)
    extraInfo,
    products,
    draftIndex: idx,
  });
  // ... editing 이동
};
```

**핵심 변경 사항:**
- GPT 호출 전 `storeInfo.saveStoreInfo()` 먼저 실행 (buildAdPrompt가 localStorage를 읽으므로)
- `storeIntro` 입력 시 GPT 미호출
- `buildEditingPayload`에 `mergedBasicInfo` 전달 (기존 버그: 원본 `basicInfo` 전달)
- API 오류/네트워크 오류 케이스별 콘솔 로그 추가

---

### 4. `storeInfo.js` — clearStoreDesc · clearStoreIntro 추가, buildAdPrompt 수정

```javascript
// 추가: clearStoreDesc()
clearStoreDesc() {
  // localStorage의 basicInfo.storeDesc를 '' 으로 초기화
}

// 추가: clearStoreIntro()
clearStoreIntro() {
  // localStorage의 basicInfo.storeIntro를 '' 으로 초기화
}

// 수정: buildAdPrompt() — storeDesc → storeIntro
// 수정 전
if (basicInfo?.storeDesc) lines.push(`가게소개: ${basicInfo.storeDesc}`);

// 수정 후
if (basicInfo?.storeIntro) lines.push(`가게 소개: ${basicInfo.storeIntro}`);
```

---

### 5. `editing/App.tsx` — handleBackToInitialPage 초기화 추가

```typescript
// 수정 전
const handleBackToInitialPage = () => {
  window.location.href = getInitPageUrl();
};

// 수정 후
const handleBackToInitialPage = () => {
  storeInfo.clearStoreDesc();   // AI 생성 광고 문구 초기화
  storeInfo.clearStoreIntro();  // 사용자 입력 소개 문구 초기화
  window.location.href = getInitPageUrl();
};
```

---

## 수정 후 흐름

```
[initPage 진입]
  → storeInfo.clearStoreDesc() : localStorage의 storeDesc 초기화
  → 사용자 업종·상품 소개 입력 (이 시점 GPT 호출 없음)

[사용자 "이 디자인 선택" 클릭]
  → storeIntro 입력 없음 → storeInfo.saveStoreInfo() → callApi.generateAdCopy()
  → storeIntro 입력 있음 → GPT 미호출, storeIntro를 그대로 storeDesc로 사용
  → buildEditingPayload({ basicInfo: mergedBasicInfo }) → editing 이동

[editing '처음으로' 클릭]
  → storeInfo.clearStoreDesc() + clearStoreIntro()
  → initPage 재진입 (GPT 자동 호출 없음)
```

---

## 주의사항

- `clearStoreDesc()` / `clearStoreIntro()`는 `storeInfo.js`에 새로 추가된 메서드입니다.  
  이전 버전 코드에서 이 메서드를 호출하면 `TypeError`가 발생합니다.
- `buildAdPrompt()`가 `storeIntro`를 읽도록 변경되었으므로,  
  GPT 호출 전 반드시 `storeInfo.saveStoreInfo({ basicInfo, products })`를 먼저 실행해야 합니다.
