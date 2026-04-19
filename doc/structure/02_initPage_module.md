# 02. InitPage 모듈 보고서

- 대상: `react/src/modules/initPage/**`
- 역할: 사용자 입력(가게 정보·제품·배경·비율) 수집 → 4종 draft 미리보기 →
  선택 → editing 모듈로 bridge payload 전달.
- 관련 상위 문서: `00_overview.md § 5.1`, `07_bridge.md`, `04_wireframe_engine.md`

initPage 는 "조립 테이블"이다. 실제 편집은 하지 않는다. 입력값을 모아서 미리보기
4장을 보여주고, 하나를 집어 editing 으로 넘기는 단방향 플로우만 관리한다.

---

## 1. 디렉토리 레이아웃

```
modules/initPage/
├── App.jsx                # 모듈 루트: 상태 오케스트레이션 + 모달 플로우
├── index.css              # 모듈 전역 스타일 (Tailwind base 포함)
├── components/
│   ├── sidebar/
│   │   ├── Sidebar.jsx                 # 왼쪽 설정 패널 컨테이너
│   │   ├── sections/
│   │   │   ├── BasicInfoSection.jsx    # 가게 이름/업종/소개문구
│   │   │   ├── ProductsSection.jsx     # 제품 추가/삭제/업로드/정면화/배경제거
│   │   │   ├── ExtraInfoSection.jsx    # 주차/반려/금연/엘베/전화/주소
│   │   │   └── BgSection.jsx           # 비율·배경타입·색상·개수
│   │   ├── ProductCard.jsx             # 개별 제품 블록
│   │   └── ui/VisibilityToggle.jsx     # 라벨 옆의 '표시' 토글
│   ├── draft/
│   │   ├── DraftCard.jsx               # draft 1장 (type 1~4 래퍼 + 상단 StoreTitle)
│   │   ├── DraftLayouts.jsx            # type별 JSX 분기 (type2/3/4 등)
│   │   └── DraftShared.jsx             # StoreTitle / SloganText 공통 소컴포넌트
│   └── wireframe/                      # 와이어프레임 레이아웃 엔진 (별도 보고서)
├── hooks/
│   ├── useProducts.js                  # 제품 배열 상태 + 배경제거 파이프라인
│   └── useDesignOptions.js             # options/basicInfo/extraInfo + AI 배경 생성
├── utils/
│   ├── editingBridge.js                # editing 모듈로 payload 빌드/저장 (bridge 쓰기)
│   ├── removeBackground.js             # @imgly 배경 제거 래퍼
│   ├── cropToBoundingBox.js            # 투명 영역 자동 크롭
│   ├── bgStyles.js                     # 배경 유형별 CSS 스타일 유틸
│   └── ratioStyles.js                  # 비율별 패딩/사이즈 토큰
├── config/
│   └── backgroundRemoval.js            # @imgly 모델 설정 (preload 대상)
└── constants/
    └── design.js                       # DEFAULT_*, FONT_STYLES, RATIOS, createProduct 등
```

`.ts` 파일은 `components/wireframe/outerFrameZones.ts` 단 하나 (TypeScript 전환
이 절반쯤 진행된 상태). 나머지는 JSX/JS.

---

## 2. 상태 모델

초기화는 전부 App.jsx 에서 커스텀 훅 두 개로 분기한다.

### 2.1 `useProducts`

```js
const [products, setProducts] = useState([createProduct()]);
const [isRemovingBg, setIsRemovingBg] = useState({}); // { [id]: bool }
const [isFirstRun, setIsFirstRun] = useState(true);
```

제공 함수:

| 함수 | 의미 |
|------|------|
| `addProduct()` | `createProduct()` 하나를 배열 끝에 추가 |
| `removeProduct(id)` | 최소 1개는 남기고 삭제 |
| `updateProduct(id, field, value)` | 얕은 shallow update |
| `handleProductImage(id, e)` | input[type=file] 선택 시 FileReader 로 dataURL 화 |
| `handleRemoveBackground(id, imageSrc)` | `removeBgPipeline(imageSrc)` → `updateProduct(id, 'image', ...)` |

### 2.2 `useDesignOptions`

```js
const [options, setOptions]   = useState(DEFAULT_OPTIONS);  // ratio, concept, bgType, 색상, ...
const [basicInfo, setBasic]   = useState(DEFAULT_BASIC_INFO); // storeName, industry, storeDesc
const [extraInfo, setExtra]   = useState(DEFAULT_EXTRA_INFO); // 주차/반려/... + 표시 여부
const [aiImageUrl, setAiUrl]  = useState(null);
```

제공 함수:

| 함수 | 의미 |
|------|------|
| `updateOption(key, value)` | `bgType` 변경 시 `concept` 을 `BG_TYPE_TO_CONCEPT` 로 동기화, `bgType='AI 생성'` 이면 자동 AI 이미지 생성 트리거 |
| `updateBasicInfo` / `updateExtraInfo` | shallow update |
| `generateAiDesc` | 임시로 0.8s 후 로컬 더미 문구를 주입하는 플레이스홀더 |
| `generateAiBgImage(basicInfo)` | `callApi.generateBackground` 호출 → `aiImageUrl` 에 blob URL 세팅 |

`inputData = { storeName, mainSlogan: storeDesc }` 는 `DraftLayouts` 하위
호환용으로 노출된다 (`DraftCard` 가 이 이름을 참조).

---

## 3. App.jsx 흐름

```
마운트 시
 └─ storeInfo.clearStoreDesc()   // 이전 세션 광고 문구 초기화

Sidebar 에서 값 변경
 └─ useProducts / useDesignOptions 훅 호출

DraftCard 4장 렌더 (orderedIndices 기반)
 └─ 선택된 idx 가 있으면 맨 앞으로 재정렬

"이 디자인 선택" 클릭
 └─ handleRequestSelect(idx) → setPendingIdx(idx)
 └─ ConfirmNextStepModal 표시

모달 "네" 클릭
 └─ handleConfirmYes → handleSelectDesign(pendingIdx)
     ├─ (basicInfo.storeIntro 가 비어있고 storeDesc 도 비었으면)
     │   └─ storeInfo.saveStoreInfo → callApi.generateAdCopy → 추출
     ├─ storeInfo.saveStoreInfo(mergedBasicInfo, products)   // localStorage
     ├─ buildEditingPayload({ options, basicInfo, extraInfo, products })
     │   ├─ blob URL → data URL
     │   ├─ PNG 투명 영역 크롭
     │   ├─ getDraftProductSlots(0, activeWithImage.length) 로          ← Type 0 고정
     │   │  각 이미지에 transform 좌표 부여
     │   ├─ additionalInfo.parkingSpaces = Number(extraInfo.parkingCount) || 0
     │   └─ bgType → editing concept 매핑
     ├─ storeEditingPayload(payload)
     │   ├─ POST /api/bridge/editing → { token }
     │   ├─ 실패 시 IndexedDB 저장 (5MB 제한 없음)
     │   └─ 최후 sessionStorage
     ├─ getEditingAppUrl() (`VITE_EDITING_URL` ?? '/editing')
     └─ window.location.href = `${baseUrl}?token=${token}`  (풀 리로드)
```

확인 모달 "아니요" → `setPendingIdx(null)` 로 그냥 닫고 initPage 에 머문다.

---

## 4. 사이드바 섹션

`components/sidebar/Sidebar.jsx` 는 props 드릴링으로 하위 섹션에 핸들러를
전달한다. 섹션은 펼침/접힘을 위한 `isExpanded` 스타일만 공유하고, 각자
독립된 상태 편집 권한을 가진다.

| 섹션 | 편집 대상 | 비고 |
|------|-----------|------|
| BasicInfoSection | `basicInfo.storeName/industry/storeDesc` | `storeIntro` 를 placeholder 로 제공, AI 문구 생성 버튼 |
| ProductsSection | `products[]` (여러 ProductCard 나열) | 제품 개수는 UI 상 N 제한 없으나 draft 레이아웃은 최대 3개만 실제 슬롯 보유 |
| ExtraInfoSection | `extraInfo` | 각 항목별 `show*` 토글로 포스터 표시 제어 |
| BgSection | `options.ratio/bgType/concept/startColor/endColor/gradientAngle/splitPosition/splitDirection/brandColor` | `bgType` 이 '그라데이션' 일 때만 `gradientAngle` 노출 등 분기 UI |

`VisibilityToggle` 은 "제품 이름 표시", "가격 표시" 같은 boolean 토글을 일관성
있게 만드는 UI 원자.

---

## 5. Draft 카드 렌더 (`components/draft/`)

`DraftCard.jsx` 는 하나의 draft 미리보기(캔버스 1장). `idx` 가 0~3 이면
해당 wireframe type 이 매핑된다.

- `DraftCard` 내부에서 `draftLayout.ts` 의 `getDraftProductSlots(idx, count)`
  로 제품 배치를 잡고, `DraftLayouts` 에서 type별(`SingleLargeLayout` /
  `SingleCompactLayout` / `OverlapGroupLayout` / `HalfCropGroupLayout`)로
  분기해 렌더한다.
- 실제 wireframe 엔진은 `components/wireframe/` 이며, 상세는 별도 보고서
  (`04_wireframe_engine.md`).
- `DraftShared.jsx` 는 `StoreTitle` (위쪽 큰 가게명 텍스트) 와 `SloganText`
  (슬로건) 를 제공. editing 쪽의 JSX 레이아웃들도 이 두 컴포넌트를 그대로 import
  해서 사용한다 → 타이포 일관성 유지.

---

## 6. 배경 제거 파이프라인

`utils/removeBackground.js` 는 클라이언트 사이드 배경 제거 플로우를 감싼다.

```
dataURL / blob URL
  ↓ @imgly/background-removal (WebAssembly, WebGPU 선호)
투명 PNG blob
  ↓ URL.createObjectURL
blob URL
```

`useProducts.handleRemoveBackground` 가 `isRemovingBg[id]` 를 true 로 올리고
해당 제품의 `image` 를 교체한다. `isFirstRun` 은 첫 번째 호출일 때 사용자에게
"모델 다운로드 중" 문구를 보여주기 위함.

`utils/cropToBoundingBox.js` 는 `editingBridge.js` 쪽에서도 재호출되어 bridge
전달 전에 투명 여백을 한 번 더 잘라낸다 (전송량 감소).

---

## 7. 중요 상수 (`constants/design.js`)

- `DEFAULT_OPTIONS` — `ratio='4:5'`, `bgType='단색'`, 기본 색상
  팔레트(`startColor='#FF4757'`, `endColor='#4A90E2'`).
- `SAMPLE_COUNT` — 드래프트 카드 표시 개수 상수. 현재 `1` (원래 4). `options` 상태에서 분리된 모듈 상수이며, payload 에 실리지 않고 InitPage 내부에서만 사용된다.
- `DEFAULT_BASIC_INFO` / `DEFAULT_EXTRA_INFO` — 빈 문자열/falsy 기반.
- `FONT_STYLES` — `<style>` 로 주입되는 웹폰트 `@import`. (JSX 에서 `<style>{FONT_STYLES}</style>` 로 사용)
- `RATIOS` — `['4:5', '9:16', '1:1']`.
- `CURRENCIES` — `['원', '$', ...]`
- `BG_TYPE_TO_CONCEPT` — 한글 label → editing `concept` 식별자 매핑 (`'단색'→'solid'` 등).
- `createProduct()` — 빈 제품 기본값. id 는 `Date.now()` 기반 (충돌 가능성 낮음).

---

## 8. editing 과의 경계

initPage 는 editing 의 내부 구조를 모른다. 두 모듈 사이의 계약은 다음 두 가지뿐.

1. **`editingBridge.js` 가 쓰는 payload 스키마** — `buildEditingPayload` 가
   만들고, editing 의 `utils/editingBridge.ts.readEditingBridgePayload()` 가
   읽는다. 스키마는 editing 쪽 `types/home.ts.HomeProjectData`.
2. **`getEditingAppUrl()` 이 반환하는 경로** — `VITE_EDITING_URL` 혹은 `/editing`.

`shared/draftLayout.ts` 의 `getDraftProductSlots` 는 이 두 모듈이 모두 참조해
같은 제품 배치를 낸다. 이 덕분에 initPage 의 미리보기와 editing 의 초기 캔버스
배치가 시각적으로 일치한다.

---

## 9. 흔히 마주치는 수정 포인트

| 요청 | 주 수정 위치 | 참고 |
|------|--------------|------|
| 기본 색상/비율 변경 | `constants/design.js.DEFAULT_OPTIONS` | bgType/concept 매핑도 같이 확인 |
| 제품 필드 추가 | `constants/design.js.createProduct` + `ProductCard.jsx` + bridge `buildEditingPayload` + editing `types/home.ts.HomeProductInput` | 4곳 동기화 필요 |
| Draft 레이아웃 튜닝 | `shared/draftLayout.ts` 우선 (initPage + editing 동시 반영) | 단일 레이어 수정이 가장 안전 |
| 사이드바 섹션 순서 변경 | `components/sidebar/Sidebar.jsx` | 섹션 각자 독립이므로 순서만 바꿔도 무해 |
| AI 광고문구 프롬프트 조정 | `server/api/callApi.js.generateAdCopy` + `adverApi` | initPage 로컬이 아님에 주의 |

---

## 10. 관련 경로 빠른 참조

- [modules/initPage/App.jsx](../../react/src/modules/initPage/App.jsx)
- [modules/initPage/hooks/useProducts.js](../../react/src/modules/initPage/hooks/useProducts.js)
- [modules/initPage/hooks/useDesignOptions.js](../../react/src/modules/initPage/hooks/useDesignOptions.js)
- [modules/initPage/constants/design.js](../../react/src/modules/initPage/constants/design.js)
- [modules/initPage/utils/editingBridge.js](../../react/src/modules/initPage/utils/editingBridge.js)
- [modules/initPage/utils/removeBackground.js](../../react/src/modules/initPage/utils/removeBackground.js)
- [modules/initPage/components/draft/DraftCard.jsx](../../react/src/modules/initPage/components/draft/DraftCard.jsx)
- [modules/initPage/components/sidebar/Sidebar.jsx](../../react/src/modules/initPage/components/sidebar/Sidebar.jsx)
