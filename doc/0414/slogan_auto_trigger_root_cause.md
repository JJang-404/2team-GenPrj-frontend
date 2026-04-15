# AI 광고 문구 자동 호출 진짜 원인 분석

## 결론 요약

문제의 원인은 **initPage가 아닌 editing 페이지**에 있습니다.  
editing의 자동 슬로건 생성 타이머가 '처음으로' 클릭 이후에도 경쟁조건(race condition)으로 실행되고,  
`clearStoreDesc()`가 `industry`를 지우지 않아서 백엔드에 실제 AI 요청이 발생합니다.

---

## 원인 1 (핵심): editing 자동 슬로건 타이머 race condition

### 코드 위치: `react/src/modules/editing/App.tsx` (line 209–240)

```ts
useEffect(() => {
  if (!projectData) return;
  if (projectData.mainSlogan?.trim()) {
    autoCopyKeyRef.current = '';
    return;
  }

  const hasPromptSource =
    Boolean(projectData.storeName?.trim()) ||
    Boolean(projectData.industry?.trim()) ||    // ← '커피숍' 있으면 true
    projectData.products.some(...);

  if (!hasPromptSource) return;

  // ...

  const timer = window.setTimeout(() => {
    void handleGenerateSlogan();     // ← callApi.generateAdCopy() 호출
  }, 250);                           //   250ms 타이머

  return () => window.clearTimeout(timer);
}, [projectData]);
```

`projectData.mainSlogan`이 비어 있고 `industry = '커피숍'`이면 **250ms 타이머**가 시작됩니다.

사용자가 **250ms 이내에 '처음으로'를 클릭**하면:

```
[250ms 타이머 진행 중]
        ↓ (사용자 클릭)
handleBackToInitialPage()
  └─ storeInfo.clearStoreDesc()    ← localStorage 일부 초기화
  └─ window.location.href = '/'    ← 페이지 이동 시작

[250ms 경과]
  └─ 타이머 발동 (페이지가 아직 완전히 언로드되지 않음)
  └─ handleGenerateSlogan()
     └─ callApi.generateAdCopy()   ← 백엔드 호출 발생!
```

React 컴포넌트 cleanup(`clearTimeout`)이 실행되기 전에 타이머가 터지는 경쟁조건 발생.  
이것이 `callApi.js:383`이 **4번** 로그되는 이유이기도 합니다  
(React 18 Strict Mode가 effects를 개발 모드에서 2회 실행 × 복수의 projectData 변경 = 4회).

---

## 원인 2: clearStoreDesc()가 `industry`를 지우지 않음

### 코드 위치: `react/src/server/api/storeInfo.js` (line 60–85)

```js
clearStoreDesc() {
  const payload = {
    ...info,
    basicInfo: {
      ...info.basicInfo,
      storeDesc: ''        // ← storeDesc만 초기화
                           //   industry: '커피숍' 은 그대로 남음!
    },
    products: info.products?.map(p => ({ ...p, description: '' })) || [],
  };
  localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
}
```

초기화 후 `genprj_store_info` 상태:
```json
{
  "basicInfo": {
    "storeName": "ABC카페",
    "industry": "커피숍",   ← 삭제되지 않음
    "storeDesc": ""
  },
  "products": [{ "description": "" }]
}
```

---

## 원인 3: buildAdPrompt()가 industry만으로도 non-empty를 반환

### 코드 위치: `react/src/server/api/storeInfo.js` (line 91–118)

```js
buildAdPrompt() {
  const info = this.getStoreInfo();
  if (!info) return '';  // ← info가 null이면 ''(빈 문자열) 반환

  const { basicInfo } = info;
  if (basicInfo?.industry) lines.push(`업종: ${basicInfo.industry}`);  // '커피숍' 존재
  // ...
  return lines.join('\n');  // ← '업종: 커피숍' 반환 (non-empty!)
}
```

---

## 원인 4: generateAdCopy()의 guard가 통과됨

### 코드 위치: `react/src/server/api/callApi.js` (line 377–387)

```js
async generateAdCopy() {
  const prompt = storeInfo.buildAdPrompt();
  if (!prompt) {
    return { ok: false, error: '...' };   // ← '' 이어야 여기서 멈춤
  }
  // prompt = '업종: 커피숍' → non-empty → 아래로 진행!
  console.log('[CallApi] AI 광고 문구 생성 요청 프롬프트:\n', prompt);
  const result = await adverApi.generateAdCopy(prompt);  // ← 백엔드 실제 호출
  return result;
}
```

`clearStoreDesc()` 후에도 `industry`가 남아 있어 `buildAdPrompt()`가 `'업종: 커피숍'`을 반환.  
`if (!prompt)` guard를 통과 → **백엔드 AI 호출 발생**.  
→ AI가 `업종: 커피숍`만으로 "한 잔의 온기가 머무는 동네 커피숍..." 생성.

---

## 전체 흐름

```
① editing 페이지에서 mainSlogan = '' (비어있음)
   └─ auto-slogan useEffect 발동
   └─ projectData.industry = '커피숍' → hasPromptSource = true
   └─ 250ms 타이머 시작

② 사용자, 250ms 이내에 '처음으로' 클릭
   └─ clearStoreDesc() 실행
      └─ storeDesc = '', industry = '커피숍' 유지   ← 문제
   └─ window.location.href = '/'

③ 250ms 경과 (타이머 발동, 페이지 아직 살아있음)
   └─ handleGenerateSlogan()
   └─ callApi.generateAdCopy()
   └─ buildAdPrompt() → '업종: 커피숍'   ← industry 때문에 non-empty
   └─ if (!prompt) guard 통과
   └─ 백엔드 AI 호출 → "한 잔의 온기가..." 생성
   console: "4callApi.js:383 ... 업종: 커피숍"

④ initPage 로드 완료
   └─ 모듈 레벨 clearStoreDesc() 실행
   console: "[StoreInfo] 모든 문구 필드 초기화 완료"
```

> **DevTools Preserve Log가 켜져 있으면** ③(editing 컨텍스트 로그)과  
> ④(initPage 컨텍스트 로그)가 같은 콘솔에 섞여 보입니다.

---

## callApi.generateAdCopy() 허용 호출 위치 (목표)

| 호출 위치 | 허용 여부 | 설명 |
|-----------|-----------|------|
| `initPage/App.jsx` useEffect (소개문구 미입력 시 자동) | ✅ 유지 | `basicInfo.storeDesc` 비어있고 입력값 있을 때 |
| `editing/App.tsx` 'AI 문구' 버튼 → `handleGenerateSlogan` | ✅ 유지 | 사용자가 명시적으로 버튼 클릭 |
| `editing/App.tsx` 자동 슬로건 `useEffect` 타이머 | ❌ 제거 | **이것이 현재 문제의 원인** |

---

## 수정 내용

---

### Fix 1 (필수): editing 자동 슬로건 useEffect 전체 제거

**파일**: `react/src/modules/editing/App.tsx`

**제거할 코드** (line 209–240):
```ts
// ↓ 이 useEffect 블록 전체 삭제
useEffect(() => {
  if (!projectData) return;
  if (projectData.mainSlogan?.trim()) {
    autoCopyKeyRef.current = '';
    return;
  }

  const hasPromptSource =
    Boolean(projectData.storeName?.trim()) ||
    Boolean(projectData.industry?.trim()) ||
    projectData.products.some((product) => product.showDesc && product.description?.trim());

  if (!hasPromptSource) return;

  const requestKey = JSON.stringify({
    storeName: projectData.storeName ?? '',
    industry: projectData.industry ?? '',
    products: projectData.products.map((product) => ({
      description: product.description ?? '',
      showDesc: Boolean(product.showDesc),
    })),
  });

  if (autoCopyKeyRef.current === requestKey) return;
  autoCopyKeyRef.current = requestKey;

  const timer = window.setTimeout(() => {
    void handleGenerateSlogan();
  }, 250);

  return () => window.clearTimeout(timer);
}, [projectData]);
// ↑ 이 useEffect 블록 전체 삭제
```

이 useEffect를 제거하면 `handleGenerateSlogan()`은 오직 **'AI 문구' 버튼 클릭**에서만 호출됩니다.  
(`onGenerateSlogan={handleGenerateSlogan}` 으로 Sidebar에 연결된 버튼)

**추가로 제거할 코드** (line 139): `autoCopyKeyRef`는 위 useEffect에서만 사용하므로 함께 제거.
```ts
// ↓ 삭제
const autoCopyKeyRef = useRef('');
```

---

### Fix 2 (필수): clearStoreDesc() → localStorage 키 전체 삭제

**파일**: `react/src/server/api/storeInfo.js`

**현재 코드 (문제)**:
```js
clearStoreDesc() {
  // storeDesc와 description만 지우고 industry는 남김
  // → buildAdPrompt()가 '업종: 커피숍' 반환 → AI guard 통과
}
```

**수정 후**:
```js
clearStoreDesc() {
  try {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('[StoreInfo] 가게 정보 초기화 완료');
  } catch (e) {
    console.error('[StoreInfo] 초기화 실패:', e);
  }
}
```

`localStorage.removeItem` → `getStoreInfo()` → `null` → `buildAdPrompt()` → `''`  
→ `callApi.generateAdCopy()`의 `if (!prompt)` guard 작동 → 백엔드 호출 없음.

---

## 수정 후 callApi.generateAdCopy() 호출 경로

```
[initPage]
  소개문구 입력란 비어있고 storeName/industry 입력 있음
    → useEffect 타이머(400ms)
    → callApi.generateAdCopy()   ✅

[editing]
  'AI 문구' 버튼 클릭
    → handleGenerateSlogan()
    → callApi.generateAdCopy()   ✅

[editing 자동 useEffect]
    → 제거됨                     ❌ (더 이상 존재하지 않음)
```

---

## 수정 대상 파일 요약

| 파일 | 수정 내용 |
|------|----------|
| `react/src/modules/editing/App.tsx` | 자동 슬로건 `useEffect` (line 209–240) 전체 삭제, `autoCopyKeyRef` (line 139) 삭제 |
| `react/src/server/api/storeInfo.js` | `clearStoreDesc()` 내부를 `localStorage.removeItem(this.STORAGE_KEY)`로 교체 |
