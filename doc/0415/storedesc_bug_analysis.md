# storeDesc 혼용 버그 분석 및 수정 방향

> 작성일: 2026-04-15  
> 대상 파일: `initPage/App.jsx`, `storeInfo.js`, `BasicInfoSection.jsx`, `editing/App.tsx`

---

## 1. 문제 요약

아무것도 입력하지 않은 상태에서 initPage를 열어도  
`[CallApi] AI 광고 문구 생성 요청 프롬프트:` 로그가 찍히며 GPT 호출이 발생하는 현상.  
그리고 '소개 문구 (미입력 시 AI 문구 자동 생성)' 필드에 이전에 생성된 값이 자동으로 채워지는 현상.

---

## 2. 변수 개념 정의 (목표 상태)

| 변수 | 위치 | 의미 |
|------|------|------|
| `basicInfo.storeIntro` | initPage → basicInfo | 사용자가 직접 입력하는 **가게 소개 문구** (미입력 가능) |
| `basicInfo.storeDesc` | initPage → basicInfo | AI가 생성한 **최종 광고 문구** (editing의 `mainSlogan` 원본) |
| `projectData.mainSlogan` | editing | editing 화면에서 표시되는 **최종 광고 문구** |

---

## 3. 현재 코드의 문제점 (5가지)

---

### 문제 1 — `BasicInfoSection.jsx`에서 `storeDesc`를 잘못 바인딩

**파일:** `react/src/modules/initPage/components/sidebar/sections/BasicInfoSection.jsx`

```jsx
// 현재 (잘못됨)
<textarea
  placeholder="가게 소개 문구 (미입력 시 AI 문구 자동 생성)"
  value={basicInfo.storeDesc}          // ← storeDesc를 사용
  onChange={(e) => updateBasicInfo('storeDesc', e.target.value)}
/>
```

**원인:**  
`storeDesc`는 AI가 생성하는 '최종 광고 문구' key인데,  
사용자 직접 입력 '가게 소개 문구'에 `storeDesc`를 바인딩하고 있다.  
`storeIntro`를 써야 한다.

**올바른 바인딩:**
```jsx
// 수정 후
value={basicInfo.storeIntro}
onChange={(e) => updateBasicInfo('storeIntro', e.target.value)}
```

---

### 문제 2 — initPage `App.jsx` 마운트 시 `storeDesc` 초기화 로직 오작동

**파일:** `react/src/modules/initPage/App.jsx` (55~72줄)

```javascript
// 현재 — 마운트 useEffect
useEffect(() => {
  updateBasicInfo('storeDesc', '');   // ← storeDesc를 빈값으로 초기화
  ...
}, []);
```

**문제 A:** `storeDesc`를 `''`으로 초기화하면,  
두 번째 useEffect의 의존성 `[basicInfo.storeDesc, ...]`가 변화를 감지하여  
**AI 광고 문구 생성 트리거가 즉시 발동**한다.

**문제 B:** `callApi.generateAdCopy()`는 내부에서 `storeInfo.buildAdPrompt()`를 호출하는데,  
이 함수는 React 상태가 아닌 **localStorage**에서 데이터를 읽는다.  
따라서 React 상태에서 `storeDesc`를 비워도,  
localStorage에는 이전 editing 세션에서 저장된 상품 소개문구(`products.description`)가  
남아있기 때문에 `hasPromptSource` 조건이 통과되어 GPT가 호출된다.

**문제 C:** `autoCopyKeyRef`를 초기화할 때 `basicInfo`와 `products`를 읽는데,  
이 시점은 마운트 직후라 아직 useState의 초기값(빈 상태)이다.  
그런데 두 번째 useEffect가 실행되는 시점에는 상태가 그대로이므로  
`requestKey !== autoCopyKeyRef.current` 조건이 통과되어 GPT가 호출된다.

---

### 문제 3 — '처음으로' 버튼 클릭 시 `clearStoreDesc()` 미호출

**파일:** `react/src/modules/editing/App.tsx` (424~426줄)

```typescript
// 현재
const handleBackToInitialPage = () => {
  window.location.href = getInitPageUrl();  // clearStoreDesc() 호출 없음
};
```

editing에서 AI로 생성된 `mainSlogan`은 `handleMainSloganChange()`를 통해  
`storeInfo.saveStoreInfo({ basicInfo: { storeDesc: value } })` 로 localStorage에 저장된다.  

'처음으로'를 눌러 initPage로 돌아갈 때 이 값이 지워지지 않으면,  
initPage에서 AI 광고 문구 생성 시 **이전 문구가 프롬프트에 포함**되어  
불필요한 GPT 호출과 오염된 프롬프트가 생성된다.

---

### 문제 4 — `storeInfo.buildAdPrompt()` 중복 라인

**파일:** `react/src/server/api/storeInfo.js` (93~95줄)

```javascript
// 현재 — storeIntro가 두 번 추가됨
if (basicInfo?.storeIntro) lines.push(`가게소개: ${basicInfo.storeIntro}`);
if (basicInfo?.storeIntro) lines.push(`사용자 입력 소개: ${basicInfo.storeIntro}`); // 중복!
```

두 번째 줄은 조건도 같고 내용도 동일 데이터여서 GPT 프롬프트에 같은 내용이 두 번 들어간다.

---

### 문제 5 — initPage의 `clearStoreDesc()` 주석 처리

**파일:** `react/src/modules/initPage/App.jsx` (30~32줄)

```javascript
// 현재 — 주석으로 비활성화됨
// if (typeof window !== 'undefined') {
//   storeInfo.clearStoreDesc();
// }
```

이 코드가 주석 처리되어 있어서 initPage 진입 시 localStorage의 광고 문구가 초기화되지 않는다.  
하지만 이 방식(모듈 스코프 즉시 실행)은 React 렌더 사이클 밖이어서 적절하지 않다.  
`useEffect(() => {...}, [])` 안에서 호출해야 한다.

---

## 4. 전체 흐름도 (문제 발생 경로)

```
[editing 화면]
  ↓ handleMainSloganChange("팥과 슈크림이...붕어빵")
  ↓ storeInfo.saveStoreInfo({ basicInfo: { storeDesc: "팥과 슈크림이...", industry: "붕어빵" }, products: [...] })
  ↓ localStorage("genprj_store_info") 에 저장

['처음으로' 클릭]
  ↓ handleBackToInitialPage() → window.location.href = '/'
  ↓ clearStoreDesc() 미호출 → localStorage에 이전 값 그대로 남음

[initPage 마운트]
  ↓ useEffect #1: updateBasicInfo('storeDesc', '') → React 상태만 초기화
  ↓ useEffect #2: basicInfo.storeDesc 변화 감지 → 트리거
  ↓   hasPromptSource 체크 → localStorage의 products.description 읽음 → true
  ↓   callApi.generateAdCopy() 호출
  ↓   storeInfo.buildAdPrompt() → localStorage에서 industry, products 읽음
  ↓   GPT 호출 → "팥과 슈크림이..." 포함된 프롬프트로 불필요한 AI 요청 발생
```

---

## 5. 수정 방향

### 수정 1 — `BasicInfoSection.jsx`: `storeDesc` → `storeIntro` : 완료

```jsx
// 수정 전
value={basicInfo.storeDesc}
onChange={(e) => updateBasicInfo('storeDesc', e.target.value)}

// 수정 후
value={basicInfo.storeDesc}
onChange={(e) => updateBasicInfo('storeIntro', e.target.value)}
```

---

### 수정 2 — `editing/App.tsx`: '처음으로' 버튼에 `clearStoreDesc()` 추가

```typescript
// 수정 전
const handleBackToInitialPage = () => {
  window.location.href = getInitPageUrl();
};

// 수정 후
const handleBackToInitialPage = () => {
  storeInfo.clearStoreDesc();           // ← 추가
  window.location.href = getInitPageUrl();
};
```

---

### 수정 3 — `initPage/App.jsx`: 마운트 useEffect 재설계

```javascript
// 수정 전
useEffect(() => {
  updateBasicInfo('storeDesc', '');
  ...
}, []);

// 수정 후
useEffect(() => {
  // 1. localStorage의 광고 문구 초기화 (이전 세션 오염 방지)
  storeInfo.clearStoreDesc();

  // 2. React 상태도 초기화 (두 번째 useEffect 의존성 변화 방지를 위해 storeDesc만)
  //    단, 이미 ''인 초기값이므로 굳이 updateBasicInfo 호출 불필요
  //    autoCopyKeyRef도 의미없는 초기 key로 세팅
  autoCopyKeyRef.current = '__init__';
}, []);
```

> **핵심:** `updateBasicInfo('storeDesc', '')` 호출 자체가 두 번째 useEffect를 트리거하므로,  
> 마운트 시에는 `storeDesc` 상태를 건드리지 않고 `autoCopyKeyRef`로만 방어한다.

---

### 수정 4 — `storeInfo.js`: `buildAdPrompt()` 중복 라인 제거
@react\src\server\api\storeInfo.js
```javascript
// 수정 전
if (basicInfo?.storeIntro) lines.push(`가게소개: ${basicInfo.storeIntro}`);
if (basicInfo?.storeIntro) lines.push(`사용자 입력 소개: ${basicInfo.storeIntro}`); // 삭제

// 수정 후
if (basicInfo?.storeIntro) lines.push(`가게 소개: ${basicInfo.storeIntro}`);
```

---

### 수정 5 — `initPage/App.jsx`: AI 광고 문구 생성 useEffect #2 제거

현재 useEffect #2는 `basicInfo.storeDesc`, `basicInfo.industry`, `products` 등의 변화를 감지해  
사용자가 입력 중일 때도 자동으로 GPT를 호출한다.  
**이 useEffect를 완전히 제거**하고, GPT 호출 시점을 "이 디자인 선택" 버튼 클릭으로 이전한다.

```javascript
// 수정 전 — 제거 대상 (useEffect #2 전체 삭제)
useEffect(() => {
  if (basicInfo.storeDesc?.trim()) {
    autoCopyKeyRef.current = '';
    return;
  }
  const hasPromptSource = ...;
  if (!hasPromptSource) return;
  // ... GPT 호출
}, [basicInfo.storeDesc, basicInfo.storeName, basicInfo.industry, products, updateBasicInfo]);
```

---

### 수정 6 — `initPage/App.jsx`: GPT 호출을 `handleSelectDesign`으로 이전

"이 디자인 선택" → 확인 모달 "네" → `handleSelectDesign()` 순으로 실행된다.  
이 함수 안에서 `storeIntro`가 비어 있을 때만 GPT를 호출하도록 수정한다.

```javascript
// 수정 전
const handleSelectDesign = async (idx) => {
  setSelectedDesigns([idx]);
  storeInfo.saveStoreInfo({ basicInfo, products });

  try {
    const payload = await buildEditingPayload({ options, basicInfo, extraInfo, products, draftIndex: idx });
    const token = await storeEditingPayload(payload);
    window.location.href = token ? `${getEditingAppUrl()}?token=${token}` : getEditingAppUrl();
  } catch (error) { ... }
};

// 수정 후
const handleSelectDesign = async (idx) => {
  setSelectedDesigns([idx]);

  // storeIntro가 공백인 경우에만 GPT로 storeDesc 생성
  let finalStoreDesc = basicInfo.storeDesc;
  if (!basicInfo.storeIntro?.trim()) {
    try {
      const result = await callApi.generateAdCopy();
      const generated = extractAdCopy(result);
      if (generated) {
        finalStoreDesc = generated;
        updateBasicInfo('storeDesc', generated);
      }
    } catch (error) {
      console.warn('[InitPage] AI 소개문구 자동 생성 실패:', error);
    }
  }

  // storeIntro가 입력된 경우 storeDesc에도 동일하게 복사 (mainSlogan으로 전달)
  const mergedBasicInfo = {
    ...basicInfo,
    storeDesc: basicInfo.storeIntro?.trim() ? basicInfo.storeIntro : finalStoreDesc,
  };

  storeInfo.saveStoreInfo({ basicInfo: mergedBasicInfo, products });

  try {
    const payload = await buildEditingPayload({
      options,
      basicInfo: mergedBasicInfo,
      extraInfo,
      products,
      draftIndex: idx,
    });
    const token = await storeEditingPayload(payload);
    window.location.href = token ? `${getEditingAppUrl()}?token=${token}` : getEditingAppUrl();
  } catch (error) {
    console.error('[editing 브리지 실패]', error);
    alert(`편집 페이지로 데이터를 넘기지 못했습니다.\n${error instanceof Error ? error.message : ''}`);
  }
};
```

> **핵심:** `storeIntro`가 있으면 그것을 `storeDesc`(= `mainSlogan`)로 직접 사용.  
> `storeIntro`가 없을 때만 GPT를 호출해 `storeDesc`를 채운 뒤 편집 페이지로 이동.

---

### 수정 7 — `editing/App.tsx`: '처음으로' 클릭 시 `storeIntro`도 초기화

```typescript
// 수정 전
const handleBackToInitialPage = () => {
  storeInfo.clearStoreDesc();
  window.location.href = getInitPageUrl();
};

// 수정 후
const handleBackToInitialPage = () => {
  storeInfo.clearStoreDesc();           // storeDesc 초기화
  storeInfo.clearStoreIntro();          // storeIntro도 초기화 (← 추가)
  window.location.href = getInitPageUrl();
};
```

> `clearStoreIntro()`가 `storeInfo.js`에 없으면 아래와 같이 추가:
> ```javascript
> clearStoreIntro() {
>   const data = this.loadStoreInfo();
>   if (data?.basicInfo) {
>     data.basicInfo.storeIntro = '';
>     localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
>   }
> }
> ```

---

## 6. 수정 파일 목록 및 우선순위

| 우선순위 | 파일 | 수정 내용 | 효과 |
|---------|------|----------|------|
| ★★★ | `BasicInfoSection.jsx` | `storeDesc` → `storeIntro` 바인딩 수정 | 사용자 입력이 올바른 key에 저장됨 |
| ★★★ | `initPage/App.jsx` | useEffect #2 전체 제거 | 입력 중 자동 GPT 호출 완전 차단 |
| ★★★ | `initPage/App.jsx` | `handleSelectDesign`에 GPT 호출 로직 이전 (`storeIntro` 공백 시에만) | 정확한 시점에만 GPT 호출 |
| ★★★ | `initPage/App.jsx` | 마운트 useEffect에서 `storeInfo.clearStoreDesc()` 호출, `updateBasicInfo('storeDesc', '')` 제거 | initPage 진입 시 중복 GPT 호출 방지 |
| ★★★ | `editing/App.tsx` | `handleBackToInitialPage`에 `clearStoreDesc()` + `clearStoreIntro()` 추가 | '처음으로' 클릭 시 두 필드 모두 초기화 |
| ★★ | `storeInfo.js` | `clearStoreIntro()` 함수 추가 | '처음으로' 클릭 시 storeIntro 초기화 가능 |
| ★★ | `storeInfo.js` | `buildAdPrompt()` 중복 라인 제거 | GPT 프롬프트 품질 향상 |

---

## 7. 의도한 최종 흐름 (수정 후)

```
[initPage 진입]
  ↓ useEffect #1: storeInfo.clearStoreDesc() → localStorage의 storeDesc 초기화
  ↓               autoCopyKeyRef.current = '__init__' 세팅

[사용자 업종 입력 "붕어빵", 상품 소개문구 입력 "팥과 슈크림이..."]
  ↓ 이 시점에서는 GPT 호출 없음
  ↓ 사용자가 직접 '가게 소개 문구'(storeIntro)를 입력할 수 있음

[사용자 "이 디자인 선택" 클릭]
  ↓ storeIntro(가게 소개 문구)가 공백인 경우에만 GPT 호출하여 storeDesc 생성
  ↓ storeIntro가 입력되어 있으면 GPT 호출 없이 storeIntro를 그대로 사용
  ↓ storeInfo.saveStoreInfo({ basicInfo: { industry, storeIntro, storeDesc }, products })
  ↓ editingBridge payload: mainSlogan = storeDesc (AI 생성 문구) 또는 storeIntro (사용자 입력)

[editing 화면]
  ↓ AdInfoSection: "최종 광고 문구" = mainSlogan 표시
  ↓ "AI 문구" 버튼 클릭 → callApi.generateAdCopy() → 새 문구 생성

[editing '처음으로' 클릭]
  ↓ storeInfo.clearStoreDesc() → localStorage의 storeDesc 초기화
  ↓ storeIntro(가게 소개 문구)도 초기화 → 빈 값으로 리셋
  ↓ window.location.href = '/'
  ↓ initPage 재진입 → 위 흐름 반복 (GPT 자동 호출 없음)
```

> **핵심 원칙**
> - GPT 호출 시점: "이 디자인 선택" 클릭 + `storeIntro` 공백인 경우에만
> - initPage 입력 중에는 GPT 호출 없음
> - '처음으로' 클릭 시 `storeDesc`와 `storeIntro` 모두 초기화 (GPT 호출 없음)

---

## 8. editing 화면 "AI 문구" 버튼 UX 개선

### 8-1. 현재 문제

- editing 진입 시 "AI 문구" 버튼이 항상 활성화되어 있음
- 클릭하면 initPage에서 이미 사용한 것과 **동일한 프롬프트**로 GPT 재호출 → 불필요한 비용 낭비
- 사용자가 추가로 입력한 텍스트가 프롬프트에 반영되지 않음

---

### 8-2. 변경할 UX 흐름

```
[editing 진입]
  ↓ "AI 문구" 버튼: 비활성화(disabled) 상태
  ↓ 버튼 하단 안내 메시지 표시:
      "AI로 광고 문구를 변경하려면 하단 텍스트 추가로 내용을 입력해보세요"

[사용자 — '요소 추가' → '텍스트 추가']
  ↓ 사이드바에 '텍스트 내용' 텍스트박스 표시
  ↓ placeholder: "(텍스트 입력 시 AI 문구가 활성화 됩니다.)"
  ↓ 실제 클릭 시 빈 값으로 시작 (placeholder일 뿐, value = '')
  ↓ 텍스트 입력 → "AI 문구" 버튼 활성화

[사용자 — '요소 추가' → '상품 사진 추가']
  ↓ 사이드바에 '소개문구' 텍스트박스 표시
  ↓ placeholder: "(텍스트 입력 시 AI 문구가 활성화 됩니다.)"
  ↓ 실제 클릭 시 빈 값으로 시작 (value = '')
  ↓ 소개문구 입력 → "AI 문구" 버튼 활성화

[사용자 활성화된 "AI 문구" 버튼 클릭]
  ↓ 기존 정보 + 새로 입력된 텍스트를 합쳐 프롬프트 구성
  ↓ callApi.generateAdCopy(extraContext) 호출
  ↓ 생성된 문구 → '최종 광고 문구' 업데이트
```

---

### 8-3. "AI 문구" 버튼 활성화 조건

| 조건 | 활성화 여부 |
|------|-----------|
| 텍스트 추가 요소 없음 + 상품 소개문구 없음 | 비활성화 |
| '텍스트 추가'의 '텍스트 내용'에 1자 이상 입력 | **활성화** |
| '상품 사진 추가'의 '소개문구'에 1자 이상 입력 | **활성화** |
| 위 두 조건 모두 해당 | **활성화** |

> 판단 기준: editing 화면의 canvas 요소 중 `type === 'text'`인 요소의 `textContent` 또는  
> `type === 'product'`인 요소의 `productDescription` 중 하나라도 비어있지 않으면 활성화.

---

### 8-4. 활성화 후 프롬프트 구성 방식

기존 `storeInfo.buildAdPrompt()`는 localStorage만 읽는다.  
"AI 문구" 버튼 클릭 시에는 **editing 화면에서 새로 입력된 텍스트를 추가**하여 프롬프트를 구성해야 한다.

```
[프롬프트 구성 순서]
  1. 업종: basicInfo.industry (localStorage)
  2. 가게 소개: basicInfo.storeIntro (localStorage, 있을 경우)
  3. 기존 광고 문구: mainSlogan (editing의 현재 값 — 참고용)
  4. 추가된 텍스트 요소: canvas 요소 중 type === 'text'의 텍스트 내용
  5. 추가된 상품 소개문구: canvas 요소 중 type === 'product'의 productDescription
```

```javascript
// 호출 방식 예시 (editing/App.tsx)
const handleGenerateAdCopy = async () => {
  // canvas 요소에서 추가 컨텍스트 수집
  const extraTexts = elements
    .filter((el) => el.type === 'text' && el.textContent?.trim())
    .map((el) => el.textContent.trim());

  const extraProductDescs = elements
    .filter((el) => el.type === 'product' && el.productDescription?.trim())
    .map((el) => el.productDescription.trim());

  const extraContext = {
    currentSlogan: mainSlogan,   // 현재 광고 문구를 참고용으로 포함. 불필요 시 이 줄 주석 처리
    addedTexts: extraTexts,
    addedProductDescs: extraProductDescs,
  };

  const result = await callApi.generateAdCopy(extraContext);
  // ... mainSlogan 업데이트
};
```

```javascript
// 프롬프트 빌드 예시 (callApi.js 또는 storeInfo.js)
buildAdPromptWithExtra(extraContext = {}) {
  const base = this.buildAdPrompt();               // 기존 localStorage 기반 프롬프트
  const lines = base ? [base] : [];

  // 현재 광고 문구 참고용 포함 — 불필요 시 아래 블록 주석 처리
  // ↓↓↓ 참고용 현재 문구 시작 ↓↓↓
  if (extraContext.currentSlogan?.trim()) {
    lines.push('');
    lines.push(`[현재 광고 문구 - 참고용]: ${extraContext.currentSlogan.trim()}`);
  }
  // ↑↑↑ 참고용 현재 문구 끝 ↑↑↑

  if (extraContext.addedTexts?.length > 0) {
    lines.push('');
    lines.push('[추가된 텍스트 요소]');
    extraContext.addedTexts.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  }

  if (extraContext.addedProductDescs?.length > 0) {
    lines.push('');
    lines.push('[추가된 상품 소개문구]');
    extraContext.addedProductDescs.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
  }

  return lines.join('\n');
}
```

> `callApi.generateAdCopy()`가 현재 인자를 받지 않으므로,  
> `extraContext`를 받아 `buildAdPromptWithExtra()`를 호출하도록 수정 필요.

---

### 8-5. placeholder 구현 방식

`value`와 `placeholder`를 분리하여 구현한다.  
안내 문구는 `placeholder` 속성에만 존재하고, `value`는 항상 사용자 입력값 그대로.

```jsx
// '텍스트 추가' 요소의 '텍스트 내용' 입력란
<textarea
  placeholder="(텍스트 입력 시 AI 문구가 활성화 됩니다.)"
  value={selectedElement.textContent ?? ''}
  onChange={(e) => onChangeElement(selectedElement.id, { textContent: e.target.value })}
/>

// '상품 사진 추가' 요소의 '소개문구' 입력란
<textarea
  className="sidebar__textarea sidebar__textarea--compact"
  placeholder="(텍스트 입력 시 AI 문구가 활성화 됩니다.)"
  value={selectedElement.productDescription ?? ''}
  onChange={(event) => onChangeElement(selectedElement.id, { productDescription: event.target.value })}
/>
```

> `value={... ?? ''}`는 이미 적용되어 있으므로 **`placeholder` 속성만 추가**하면 된다.

---

### 8-6. 수정 파일 목록 (추가분)

| 우선순위 | 파일 | 수정 내용 |
|---------|------|----------|
| ★★★ | `editing/App.tsx` | "AI 문구" 버튼 초기 비활성화, 활성화 조건 로직 추가 |
| ★★★ | `editing/App.tsx` | `handleGenerateAdCopy`에 `extraContext` 수집 및 전달 |
| ★★★ | `callApi.js` | `generateAdCopy(extraContext?)` 인자 추가, 프롬프트에 extraContext 반영 |
| ★★ | 텍스트/상품 요소 사이드바 컴포넌트 | '텍스트 내용', '소개문구' textarea에 placeholder 추가 |
| ★★ | `editing/App.tsx` | "AI 문구" 버튼 하단 안내 메시지 컴포넌트 추가 |

---

*이 문서를 검토 후 각 파일을 순서대로 수정하세요.*
