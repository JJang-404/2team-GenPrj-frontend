# [보고서] '가게 소개 문구' 및 '최종 광고 문구' 데이터 필드 분리 계획

## 1. 개요 및 목적
현재 `basicInfo.storeDesc` 하나의 필드에 사용자가 입력한 '소개 문구'와 AI가 생성한 '최종 광고 문구'가 동시에 저장되어 데이터 충돌 및 유실이 발생하고 있습니다. 이를 **`storeIntro` (입력용)**와 **`storeDesc` (결과용)**로 분리하여 데이터의 안정성과 사용자 편의성을 높입니다.

## 2. 데이터 구조 변경 (genprj_store_info)

| 기존 필드명 | 변경 후 필드명 | 용도 설명 | UI 라벨 (예시) |
| :--- | :--- | :--- | :--- |
| `storeDesc` | **`storeIntro`** | 사용자가 직접 입력하는 원본 소개글 | 가게 소개 문구 |
| (신규 필드) | **`storeDesc`** | AI가 생성한 최종 결과물 또는 확정 문구 | 최종 광고 문구 |

---

## 3. 파일별 수정 가이드

### ① `react/src/server/common/defines.js` (필드 정의 및 초기값 추가)
UI에서 사용하는 키 값을 명확히 분리하고, 기본 상태 객체(Default State)에도 필드를 추가합니다.

```javascript
// [필드 정의 수정]
export const AI_BACKGROUND_PROMPT_FIELDS = [
	{ no: 1, label: '업종', key: 'industry' },    // 중복 제거 후 1번으로
	{ no: 2, label: '가게 소개 문구', key: 'storeIntro' }, // storeDesc -> storeIntro로 변경
	{ no: 3, label: '최종 광고 문구', key: 'storeDesc' },  // 결과용 키 유지/추가
];

// [기본값 수정] - 반드시 storeIntro를 추가해야 에러가 발생하지 않습니다.
export const DEFAULT_BASIC_INFO = {
	industry: '',
	storeIntro: '',
	storeDesc: '', 
};
```

### ② `react/src/server/api/storeInfo.js` (데이터 처리 로직)
AI 프롬프트를 만들 때 **AI가 만든 결과(`storeDesc`) 대신 사용자가 쓴 원본(`storeIntro`)**을 참조하도록 수정합니다.

```javascript
// buildAdPrompt 메서드 수정
buildAdPrompt() {
  const info = this.getStoreInfo();
  if (!info) return '';
  const { basicInfo, products } = info;
  const lines = [];

  if (basicInfo?.industry) lines.push(`업종: ${basicInfo.industry}`);

  // [수정 핵심] AI 결과물(storeDesc)이 아닌 사용자의 원본 입력(storeIntro)을 프롬프트 재료로 씁니다.
  if (basicInfo?.storeIntro) lines.push(`가게소개: ${basicInfo.storeIntro}`);

  // ... (상품 정보 처리 로직은 동일)
  return lines.join('\n');
}

// clearStoreDesc 메서드 수정
clearStoreDesc() {
  try {
    const info = this.getStoreInfo();
    if (!info) return;

    const payload = {
      ...info,
      basicInfo: { 
        ...info.basicInfo, 
        storeIntro: '', // [수정] 원본 소개글도 페이지 진입 시 초기화
        storeDesc: ''  // [수정] AI 생성 결과 초기화
      },
      // 모든 상품의 설명도 함께 초기화하여 깨끗한 상태로 시작합니다.
      products: info.products?.map(p => ({
        ...p,
        description: '' 
      })) || [],
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    console.log('[StoreInfo] 모든 광고 관련 문구 초기화 완료');
  } catch (e) {
    console.error('[StoreInfo] 초기화 실패:', e);
  }
}
```

### ③ `react/src/modules/initPage/App.jsx` (AI 생성 로직)
가게 이름(`storeName`)을 감지 대상에서 제외하고, 새롭게 분리된 `storeIntro`를 감지하여 AI가 작동하도록 수정합니다.

```javascript
// [1. 초기화 및 중복 방지 Key 생성]
useEffect(() => {
  storeInfo.clearStoreDesc();
  updateBasicInfo('storeDesc', '');
  
  // storeName 대신 storeIntro를 사용하여 초기 Key 설정
  const currentRequestKey = JSON.stringify({
    industry: basicInfo.industry ?? '',
    storeIntro: basicInfo.storeIntro ?? '',
    products: products.map((p) => ({
      description: p.description ?? '',
      showDesc: Boolean(p.showDesc),
    })),
  });
  autoCopyKeyRef.current = currentRequestKey; 
}, []);

// [2. AI 자동 생성 타이머 부분]
const timer = window.setTimeout(() => {
  void (async () => {
    try {
      const result = await callApi.generateAdCopy();
      const generated = extractAdCopy(result);
      if (generated) {
        // [수정] 생성된 결과물은 최종 결과 필드인 storeDesc에 담습니다.
        // 입력 필드인 storeIntro는 그대로 유지됩니다.
        updateBasicInfo('storeDesc', generated);
      }
    } catch (error) { ... }
  })();
}, 400);
```

> **주의**: `useEffect`의 의존성 배열(`deps`)에서도 `basicInfo.storeName`을 제거하고 `basicInfo.storeIntro`를 추가해야 합니다.

### ④ UI 컴포넌트 연결 (`Sidebar`, `BasicInfoSection` 등)
사용자의 입력창이 `storeIntro`를 바라보도록 연결을 바꿉니다.

*   **초기 화면 (initPage)**: 사용자가 타이핑하는 곳 -> `basicInfo.storeIntro`
*   **편집 화면 (editing)**: 최종 결과물이 보이는 곳 -> `basicInfo.storeDesc`

---

## 4. 개선된 프로세스 흐름 (Flow)

1.  **[입력]** 사용자가 `initPage`에서 **'가게 소개 문구'**를 입력하면 `storeIntro`에 저장됩니다.
2.  **[생성]** AI는 `storeIntro`를 읽어서 멋진 문장을 만듭니다.
3.  **[결과]** 생성된 문장은 **'최종 광고 문구'**(`storeDesc`)에 자동으로 채워집니다.
4.  **[초기화]** 페이지 새로고침 시, 결과물(`storeDesc`)만 지우고 사용자가 입력한 `storeIntro`는 남겨둘 수 있어 사용자가 다시 타이핑할 필요가 없습니다.

## 5. 기대 효과
*   **데이터 충돌 방지**: 입력값과 출력값이 섞이지 않아 로직이 깔끔해집니다.
*   **사용자 경험 개선**: AI 결과가 마음에 들지 않아도 사용자가 썼던 원본 글이 남아있어 수정이 용이합니다.
*   **명확한 초기화**: 무엇을 지우고 무엇을 남길지 정밀하게 제어할 수 있습니다.
