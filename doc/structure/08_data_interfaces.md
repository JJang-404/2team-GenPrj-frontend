# 08. 인터페이스 / 데이터 구조 연결 보고서

- 대상: 프로젝트 전역의 타입/인터페이스, 그리고 그들 사이를 잇는 데이터 흐름
- 역할: "어떤 구조체가 있고, 그들이 어디서 어떻게 다른 구조체로 바뀌어서
  다음 단계로 넘어가는가" 를 하나의 지도로 묶어주는 인덱스 문서.
- 상위 문서: `00_overview.md § 3` (데이터 계보)
- 관련 문서:
  - 경계 페이로드 저장/복원 매커니즘: [07_bridge.md](07_bridge.md)
  - EditorElement 생성·변환 상세: [04a_editor_flow_detail.md](04a_editor_flow_detail.md)
  - App 상태 생명주기: [03a_editing_state_chain.md](03a_editing_state_chain.md)
  - Shared 프리셋: [06_shared.md](06_shared.md)
  - Wireframe 엔진: [04_wireframe_engine.md](04_wireframe_engine.md)

---

## 1. 왜 이 보고서인가

이 프로젝트는 **입력 → 브리지 → 편집 → 렌더 → 추출** 5단계 각각에서
자기 영역에 최적화된 타입을 따로 정의해 둔다. 각각 의미는 맞지만, 서로
다른 형식으로 같은 개념을 가리키는 경우가 많다 (예: "제품" 은 초안
화면에선 `extraInfo`/`products` 페어로, 편집에선 `HomeProductInput` 로,
캔버스에선 `EditorElement(kind:'image')` + 여러 텍스트 요소로 표현).

그래서 "어디서 무엇이 바뀌는가?" 를 한눈에 보려면 타입 전체를
데이터 흐름 순으로 정렬해서 보는 지도가 필요하다. 이 문서가 그 지도다.

---

## 2. 5단계 데이터 파이프라인 개요

```
┌──────────────┐  buildEditingPayload   ┌─────────────────────┐
│ Stage 1      │ ─────────────────────> │ Stage 2             │
│ InitPage     │   (snake/kebab 관용    │ Bridge Payload      │
│ form state   │    JS camelCase 변환,  │ (HomeProjectData)   │
│              │    image blob→dataURL) │                     │
└──────────────┘                        └─────────┬───────────┘
                                                  │
                                        readEditingBridgePayload
                                                  │
                                                  v
┌──────────────┐  handleStartFromHome   ┌─────────────────────┐
│ Stage 3      │ <───────────────────── │ projectData 수신    │
│ App.tsx      │   (1회 seed, local     │ 상태가 아직 비었음  │
│ useState set │    변수 캡처로 stale   │                     │
│ × 13+ calls  │    state 회피)         │                     │
└──────┬───────┘                        └─────────────────────┘
       │
       │ createElementsFromWireframe
       │ + applyElementVisibilityRules
       v
┌──────────────┐
│ Stage 4      │  EditorElement[]
│ Canvas render│  (drag/resize 편집 대상)
│ EditorCanvas │
└──────┬───────┘
       │
       │ exportPoster (html2canvas/jspdf)
       v
┌──────────────┐
│ Stage 5      │  PNG / PDF 바이너리
│ File export  │
└──────────────┘
```

각 단계에 **그 단계 고유 타입** 이 하나씩 붙는다:

| Stage | 핵심 타입 | 파일 | 생성 주체 |
|-------|-----------|------|-----------|
| 1. 입력 | `options`, `basicInfo`, `extraInfo`, `products[]` (anonymous) | `initPage/...` | InitPage 각 입력 필드 |
| 2. 브리지 | `EditingBridgePayload` = `{ projectData: HomeProjectData }` | `editing/utils/editingBridge.ts`, `initPage/utils/editingBridge.js` | `buildEditingPayload` |
| 3. 편집 상태 | `HomeProjectData` + 23개 useState (`elements`, `additionalInfoVisibility`, ...) | `editing/App.tsx`, `editing/types/home.ts` | `handleStartFromHome` seed |
| 4. 캔버스 | `EditorElement[]` + `BackgroundCandidate[]` + `TemplateDefinition[]` | `editing/types/editor-core.ts`, `editing/types/api.ts` | `createElementsFromWireframe`, `applyElementVisibilityRules` |
| 5. 추출 | DOM snapshot → `Blob` / `File` | `editing/utils/exportPoster.ts` | `exportCurrentPoster` |

---

## 3. Stage 1 — InitPage 입력 (암묵 타입)

InitPage 는 TypeScript 가 아닌 JS 이므로 공식 타입 선언이 없다. 실질적
계약은 [`initPage/utils/editingBridge.js`](../../react/src/modules/initPage/utils/editingBridge.js) 의
`buildEditingPayload({ options, basicInfo, extraInfo, products })` 인자에서
역추정 가능:

```js
options = {
  ratio: '4:5' | '1:1' | '9:16',
  bgType: '단색' | '그라데이션' | '다중색' | 'AI 생성',
  brandColor: '#RRGGBB',
  startColor, endColor: '#RRGGBB',   // gradient
  gradientAngle: number (0..360),    // gradient
  splitPosition: number (0..100),    // 다중색
  splitDirection: 'horizontal' | 'vertical',
}

basicInfo = {
  storeName: string,
  industry: string,
  storeDesc: string,   // ← editing 쪽 mainSlogan 으로 개명
}

extraInfo = {
  parkingCount: number,   // Math.max(0, parseInt(...)) — 항상 ≥ 0 정수
  petFriendly: boolean,
  isNoKids: boolean,
  hasSmokingArea: boolean,
  hasElevator: boolean,
  phone: string,            // ← editing 쪽 phoneNumber
  address: string,

  // 표시 토글. InitPage/bridge/editing 3축이 모두 같은 `view*` 이름을 공유한다.
  viewParking, viewPet, viewPhone, viewAddress,
  viewNoKids, viewSmoking, viewElevator: boolean,
}

products[] = [{
  id: number,
  name, price, currency, description: string,
  image: string | null,       // blob: 또는 data: URL
  isAiGen, showName, showPrice, showDesc: boolean,
  imageLeftHalf?, imageRightHalf?: string,          // Type 4 prebake
  imageNaturalWidth?, imageNaturalHeight?: number,  // Type 3 AR
}]
```

> **draftIndex 는 payload 입력에 없다.** 과거에는 `buildEditingPayload` 에
> `draftIndex` 인자가 있어 `options.draftIndex` + top-level 에 이중 기록했으나,
> 현재 initPage 는 Type 0 카드만 노출하므로 제거되었다. 편집 진입 후
> `handleSelectLayoutVariant` 가 `options.draftIndex` 를 mutate 하는 내부
> 전환 경로는 그대로 유지된다.
>
> **`sampleCount` 도 payload 에 없다.** 드래프트 카드 개수는 InitPage 내부에서만
> 의미가 있는 값이라 [`initPage/constants/design.js`](../../react/src/modules/initPage/constants/design.js)
> 의 `SAMPLE_COUNT` 모듈 상수로 분리했다. 편집 모듈은 이 값을 소비하지 않으며,
> `HomeProjectOptions` 에도 더 이상 선언되지 않는다.

핵심 변환 포인트:
- `blob:` URL 은 `normalizeProductImage` 에서 dataURL 로 변환 + PNG bbox 크롭
- `bgType` 한글은 `BG_TYPE_TO_EDITING_MODE` (단색→solid, 그라데이션→gradient,
  다중색→pastel, AI 생성→ai-image) 로 `options.concept` 에 기록
- `show*` 는 모두 `Boolean(...)` 강제 캐스팅 후 `view*` 로 개명

---

## 4. Stage 2 — Bridge Payload

### 4.1 `EditingBridgePayload` (최상위 래퍼)

[`editing/utils/editingBridge.ts:44-46`](../../react/src/modules/editing/utils/editingBridge.ts#L44-L46)

```ts
export interface EditingBridgePayload {
  projectData: HomeProjectData;
}
```

전송 채널 4종 (백엔드 token → IndexedDB → sessionStorage → window.name) 의
내용물은 항상 이 형태다. 채널 자체의 세부는 [07_bridge.md](07_bridge.md) 참조.

### 4.2 `HomeProjectData` — 편집 세션의 "진실"

[`editing/types/home.ts:79-88`](../../react/src/modules/editing/types/home.ts#L79-L88)

```ts
HomeProjectData = {
  options:        HomeProjectOptions
  storeName:      string
  industry:       string
  mainSlogan:     string
  details:        string
  products:       HomeProductInput[]
  additionalInfo: HomeAdditionalInfo
  zonePositions?: ZonePositions   // 초안 drag 결과, 없으면 기본값 사용
}
```

이 인터페이스는 편집 모듈의 **"props" 역할** 을 한다. `App.tsx` 는 이것을
`projectData` state 에 그대로 넣고, 거의 모든 편집 함수가 이 값을 읽어
elements/visibility/typography 등을 파생시킨다.

### 4.3 HomeProjectData 하위 타입 4종

#### `HomeProjectOptions`
[`types/home.ts:49-61`](../../react/src/modules/editing/types/home.ts#L49-L61)

| 필드 | 타입 | 출처 | 소비자 |
|------|------|------|--------|
| `draftIndex?` | `number` (0..3) | **payload에는 미포함** — 편집 내부 `handleSelectLayoutVariant` 가 mutate | `createElementsFromWireframe` 의 type 분기 |
| `ratio` | `'4:5'\|'1:1'\|'9:16'` | InitPage 비율 | `ratioToCanvasAR`, `getDraftTypography`, mainZone 계산 |
| `concept` | `BackgroundMode` (enum) | `bgType` 매핑 결과 | `backgroundMode` state 초기값 |
| `brandColor` | `#RRGGBB` | InitPage 컬러픽 | 가게명 폰트 컬러 / gradient seed |
| `bgType` | `'단색'\|'그라데이션'\|'다중색'\|'AI 생성'` | InitPage | initial background sync (solid/gradient) |
| `startColor`, `endColor` | `#RRGGBB` | gradient/다중색 | `buildInitialBackgroundCandidate`, getSharedBgStyle |
| `gradientAngle` | `number` | gradient | getSharedBgStyle |
| `splitPosition`, `splitDirection` | `0..100`, `'horizontal'\|'vertical'` | 다중색 | getSharedBgStyle |

#### `HomeProductInput`
[`types/home.ts:9-30`](../../react/src/modules/editing/types/home.ts#L9-L30)

제품 1건의 원자 표현. 다음 6개 하위 개념이 한 객체에 섞여 있다:

| 하위 개념 | 필드 | 용도 |
|----------|------|------|
| 식별 | `id: number`, `name` | EditorElement `id: 'product-${id}'` 키 |
| 가격/설명 | `price`, `currency`, `description` | 제품 메타 텍스트 요소 (name/price/desc 3종) |
| 이미지 원본 | `image: string\|null` | data/blob URL |
| AI / 표시 토글 | `isAiGen`, `showName`, `showPrice`, `showDesc` | 사이드바 체크박스 + 텍스트 요소 가시성 |
| 좌표 오버라이드 | `transform?: ProductTransform\|null` | InitPage 에서 드래그한 결과 (없으면 템플릿 기본) |
| 프리베이크 캐시 | `imageLeftHalf?`, `imageRightHalf?`, `imageNaturalWidth?`, `imageNaturalHeight?` | Type 3 AR / Type 4 반크롭 |

#### `HomeAdditionalInfo`
[`types/home.ts:32-47`](../../react/src/modules/editing/types/home.ts#L32-L47)

7개 데이터 필드 + 7개 view* flag 의 **병렬 구조**. 이 대응은 § 6.2 에
상세 서술.

> **`parkingSpaces` 는 `number` 다** (과거 `string` 이었으나 변경). 입력
> 단계에서 `Math.max(0, parseInt(...))` 로 항상 ≥ 0 정수가 보장되므로 중간
> string 변환은 불필요한 왕복 변환이었다. 소비자 (`additionalInfo.ts`,
> `editorFlow.shouldShowAdditionalInfoText`) 는 `> 0` 검사만 하며 템플릿
> 리터럴에서는 자동 stringification 으로 렌더된다.

#### `ZonePositions`
[`types/home.ts:63-77`](../../react/src/modules/editing/types/home.ts#L63-L77)

```ts
ZonePosition = { x, y, width, align?, rotation?, zIndex? }
ZonePositions = { store, slogan, details, summary }
```

**부재 시 fallback**: `getDefaultZonePositions(draftIndex)` 가
`LEGACY_TEXT_PLACEMENTS[draftIndex]` 에서 기본값을 만들어 돌려준다
([`editorFlow.ts:60-101`](../../react/src/modules/editing/utils/editorFlow.ts#L60-L101)).

### 4.4 Bridge 경계에서 일어나는 네이밍 rename 표

buildEditingPayload 가 JS 관용 form key → editing 표준 key 로 바꾸는 지점:

| InitPage 입력 key | HomeProjectData key | 비고 |
|--------------------|---------------------|------|
| `basicInfo.storeDesc` | `.mainSlogan` | "소개 문구" 의미 명확화 |
| `extraInfo.parkingCount` | `.additionalInfo.parkingSpaces` | 둘 다 `number`; `Number(... ) \|\| 0` 으로 NaN 방어 |
| `extraInfo.phone` | `.additionalInfo.phoneNumber` | — |
| `extraInfo.isNoKids` | `.additionalInfo.noKidsZone` | — |
| `extraInfo.hasSmokingArea` | `.additionalInfo.smokingArea` | — |
| `extraInfo.hasElevator` | `.additionalInfo.elevator` | — |
| `extraInfo.view{Parking,Pet,Phone,Address,NoKids,Smoking,Elevator}` | `.additionalInfo.view{…동일…}` | **1:1 pass-through** — InitPage/bridge/editing 3축 이름 통일 (§ 6.2) |

이 테이블에 누락이 생기면 "체크박스는 있는데 켜지지 않음" / "AI 생성 버튼이
비활성" 등 UX 버그가 조용히 발생한다.

---

## 5. Stage 3/4 — 편집/캔버스 타입

### 5.1 `EditorElement` — 캔버스 원자

[`editing/types/editor-core.ts:7-38`](../../react/src/modules/editing/types/editor-core.ts#L7-L38)

```ts
EditorElement = {
  id: string               // ← "서브 도메인 식별자" — § 6.3 참조
  kind: 'text'|'image'|'shape'
  label: string            // 사이드바 표시용 한글 (예: '가게명', '소개 문구')
  x, y, width, height, rotation: number   // 퍼센트 좌표
  zIndex: number

  // kind === 'text'
  text?, fontFamily?: string
  fontSize?, fontWeight?, lineHeight?, letterSpacing?: number
  color?: string, align?: 'left'|'center'|'right'

  // kind === 'image'
  imageUrl?: string
  imageFit?: 'contain'|'cover'

  // 제품 메타 (텍스트 요소에 제품 정보 장착)
  productName?, productPrice?, productDescription?: string
  priceCurrency?: '원'|'$'

  // kind === 'shape'
  shapeCss?: string, borderRadius?: number, border?: string

  // 공통
  opacity?, shadowStrength?: number
  hidden?, locked?: boolean
}
```

**하나의 interface 에 3 kind 가 union 으로 공존** 하므로, 소비자는 항상
`kind` 를 분기해서 옵셔널 필드를 읽어야 한다. TypeScript 관점에서는
discriminated union 으로 쪼개는 리팩터가 가능하지만, drag/resize 공통
유틸이 모든 필드를 범용으로 접근해야 해서 현재는 단일 interface 유지.

### 5.2 `TemplateDefinition`

[`editor-core.ts:40-51`](../../react/src/modules/editing/types/editor-core.ts#L40-L51)

`BootstrapResponse.templates[]` 로 들어오는 서버(또는 bootstrap fixture)
템플릿. `elements: EditorElement[]` 필드를 통해 **이 자체가 "초기
elements 의 블루프린트"** 이기도 하다.

현재 실행 경로는 템플릿보다 wireframe 기반 생성(`createElementsFromWireframe`)
을 우선 사용하므로, Template 경로는 `mapProjectDataToTemplate` 에서만 등장
(디자이너 컨셉 프리셋용 legacy).

### 5.3 API 인터페이스 4종

[`types/api.ts`](../../react/src/modules/editing/types/api.ts)

```ts
BootstrapResponse = {
  templates: TemplateDefinition[]
  sidebarRecommendations: SidebarRecommendation[]
}

BackgroundCandidate = {
  id: string
  name: string
  mode: BackgroundMode                       // 생성 시 모드 (solid/gradient/pastel/ai-image)
  cssBackground: string                      // 바로 style.background 로 적용 가능
  imageUrl?: string                          // ai-image 모드만
  note: string                               // 프리셋 설명
  translatedPrompt, negativePrompt: string   // 재생성 UX 용
}

GenerateBackgroundRequest = {
  templateId: string
  backgroundMode: BackgroundMode
  promptKo: string
  guideImage?, guideSummary?: string         // Image-to-Image + 문맥 요약
}

GenerateBackgroundResponse = {
  translatedPrompt, negativePrompt: string
  candidates: BackgroundCandidate[]
}

RemoveBackgroundResponse = {
  imageDataUrl, maskDataUrl: string
  label: string, score: number | null
}
```

`BackgroundMode = 'solid'|'gradient'|'pastel'|'ai-image'` ([editor-core.ts:3](../../react/src/modules/editing/types/editor-core.ts#L3))
는 이 4곳 + HomeProjectOptions.concept + App 의 `backgroundMode` state 모두의
**공통 도메인 enum**.

### 5.4 Wireframe 레이어 타입

[`editing/utils/wireframeLayout.ts`](../../react/src/modules/editing/utils/wireframeLayout.ts) +
[`wireframeTextPlacements.ts`](../../react/src/modules/editing/utils/wireframeTextPlacements.ts):

```ts
WireframeRect            = { x, y, width, height }                     // percent, mainZone 내부
WireframeDerivedLayout   = { productSlots: WireframeRect[], storeName, mainSlogan }
WireframeProductPlacement = { rect: WireframeRect, imageUrlOverride?, halfSide?, zIndex? }
WireframeTextRect        = { x, y, width, height }                     // canvas 전체 기준
WireframeTypeTextPlacement = { storeName: WireframeTextRect, mainSlogan, productMeta }
FrameZone                = { x, y, w, h }   // outerFrameZones mainZone 바운딩
SlotMeta                 = { Cx, Cy, sw, sh }                           // wireframe JSON 내부 형식
```

**3단계 좌표 공간 주의**:
- `WireframeDerivedLayout.productSlots` / `WireframeProductPlacement.rect`: **mainZone 기준 0..100%**
- `WireframeTextRect`: **canvas 전체 기준 0..100%**
- `EditorElement.{x,y,width,height}`: **canvas 전체 기준 0..100%**

이를 섞어 쓰면 배치가 엉뚱하게 튄다. `createElementsFromWireframe` 의
아래 산술이 그 변환 경계다:

```ts
// mainZone % → canvas %
rect = {
  x: mainZone.x + (p.rect.x / 100) * mainZone.w,
  y: mainZone.y + (p.rect.y / 100) * mainZone.h,
  width:  (p.rect.width  / 100) * mainZone.w,
  height: (p.rect.height / 100) * mainZone.h,
};
```

### 5.5 App.tsx 상태 타입 (발췌)

23개 useState 중 특히 타입 주의가 필요한 3개:

```ts
elements: EditorElement[]                             // 편집의 진실
selectedElementIds: string[]                          // EditorElement.id 참조
additionalInfoVisibility: Record<string, boolean>     // key 는 한국어 레이블 (§ 6.2)
```

나머지 20개는 [03a_editing_state_chain.md § 1](03a_editing_state_chain.md) 에 상세.

---

## 6. "공유 식별자" 3종 규약

여러 레이어가 동일 key/도메인에 의존하는 핵심 3개. 깨지면 그 layer 들
중 하나가 반드시 조용히 어긋난다.

### 6.1 `draftIndex` — 4타입 enum (0..3)

```
0 → Type1 SingleLarge
1 → Type2 SingleCompact
2 → Type3 OverlapGroup
3 → Type4 HalfCropGroup
```

공통 진입점들:
- 페이로드: **더 이상 payload에 시딩되지 않음** — payload 진입 시점엔 항상 `0` 가정. 편집 내부에서 `handleSelectLayoutVariant` 가 `projectData.options.draftIndex` 를 mutate 하면 이후 로직이 그 값을 읽는다.
- Legacy: `LEGACY_TEXT_PLACEMENTS[draftIndex]` (editorFlow.ts:60-89)
- Wireframe 텍스트: `WIREFRAME_TEXT_PLACEMENTS[draftIndex as 0|1|2|3]`
- Wireframe 제품 슬롯: `getWireframeSlots(type = draftIndex+1, count, hasSlogan)` — **1 base 로 +1 offset**
- Shared: `getDraftProductSlots(draftIndex, count)`, `getDraftTypography(draftIndex, ratio)`
- 배치 분기: `applyDraftLayoutVariant` (Type 3 overlap, Type 4 halfcrop 전용 경로)

주의:
- `draftIndex` 는 위치마다 0-base / 1-base 가 섞여 쓰인다. wireframe JSON
  쪽만 1-base (type), 나머지는 0-base (draftIndex).
- 정규화는 `typeIndex = (((draftIndex % 4) + 4) % 4) as 0|1|2|3` 이
  [`editorFlow.ts:93-114`](../../react/src/modules/editing/utils/editorFlow.ts#L93-L114) 에 두 번 나와 있다.

### 6.2 `ADDITIONAL_INFO_ITEMS` — `view*` 통일 state key 체계

단일 소스: [`utils/additionalInfo.ts:11-19`](../../react/src/modules/editing/utils/additionalInfo.ts#L11-L19)

```ts
export const ADDITIONAL_INFO_ITEMS = [
  { viewKey: 'viewParking',  label: '주차 공간 수',        dataField: 'parkingSpaces' },
  { viewKey: 'viewPet',      label: '애견 동반 가능 여부', dataField: 'petFriendly'   },
  { viewKey: 'viewNoKids',   label: '노키즈존',            dataField: 'noKidsZone'    },
  { viewKey: 'viewSmoking',  label: '흡연 구역 존재 여부', dataField: 'smokingArea'   },
  { viewKey: 'viewElevator', label: '엘리베이터 존재 여부', dataField: 'elevator'     },
  { viewKey: 'viewPhone',    label: '전화번호',            dataField: 'phoneNumber'   },
  { viewKey: 'viewAddress',  label: '주소',                dataField: 'address'       },
] as const;

export type AdditionalInfoKey = typeof ADDITIONAL_INFO_ITEMS[number]['viewKey'];
export const ADDITIONAL_INFO_KEYS: readonly AdditionalInfoKey[] =
  ADDITIONAL_INFO_ITEMS.map((item) => item.viewKey);
```

**3축 병렬 구조 ("표시 의도"의 세 가지 표현)**:

세 축은 모두 "이 항목을 보여줄지 여부"라는 동일 의미를 서로 다른 레이어에서
표현한다. 과거에는 세 축이 서로 다른 이름 규약을 썼으나, 현재는 모두
`view*` 접두어로 통일되었다.

| 축 | 레이어 | state key |
|----|--------|-----------|
| show 축 | InitPage 로컬 상태 (`extraInfo`) | `view*` (`viewParking`, `viewPet`, …) |
| view 축 | bridge 페이로드 / `HomeAdditionalInfo` 타입 | `view*` (동일 이름) |
| 표시(Display) 축 | editing 런타임 상태 `additionalInfoVisibility` | `AdditionalInfoKey` (= `view*` 문자열) |

셋 모두 같은 문자열을 state key 로 쓰기 때문에, InitPage → bridge →
editing 경로 전체에서 **이름 변환 없이 1:1 pass-through** 된다.

**"데이터 축" 은 별도 축이 아니라 위 3축이 공통으로 가리키는 실제 값**
(=`HomeAdditionalInfo` 내부의 `parkingSpaces`, `petFriendly`, `noKidsZone`,
`smokingArea`, `elevator`, `phoneNumber`, `address`) 이다. `dataField` 는
이 공통 참조 대상을 `ADDITIONAL_INFO_ITEMS` 메타데이터로 남겨둔 것이다.

`label` 은 오직 UI 표시(사이드바 / 아이콘 라벨 / 자동 생성된 텍스트 요소의
EditorElement.label) 용이며, **state key 로는 절대 쓰지 않는다**.

| viewKey (state key) | 실제 데이터 필드 | UI 표시 label |
|---------------------|----------------|----------------|
| `viewParking` | `parkingSpaces: number` | 주차 공간 수 |
| `viewPet` | `petFriendly: boolean` | 애견 동반 가능 여부 |
| `viewNoKids` | `noKidsZone: boolean` | 노키즈존 |
| `viewSmoking` | `smokingArea: boolean` | 흡연 구역 존재 여부 |
| `viewElevator` | `elevator: boolean` | 엘리베이터 존재 여부 |
| `viewPhone` | `phoneNumber: string` | 전화번호 |
| `viewAddress` | `address: string` | 주소 |

참조가 일어나는 곳:
- **bridge pass-through**: [`initPage/utils/editingBridge.js:197-203`](../../react/src/modules/initPage/utils/editingBridge.js#L197-L203) — InitPage `extraInfo.viewX` 를 그대로 `HomeAdditionalInfo.viewX` 로 복사
- **payload → editing 상태 seed**: [`App.tsx handleStartFromHome`](../../react/src/modules/editing/App.tsx#L427-L440) 의 `seededVisibility` (1:1 pass-through)
- **viewKey → 아이콘/표시 텍스트**: [`utils/additionalInfo.ts`](../../react/src/modules/editing/utils/additionalInfo.ts) 의 `getAdditionalInfoIcon(projectData, key)` / `getAdditionalInfoDisplayText(projectData, key)` switch
- **viewKey → 요소 생성**: [`editorFlow.createAdditionalInfoElements(projectData, viewKey, visibility)`](../../react/src/modules/editing/utils/editorFlow.ts) — 내부에서 `getAdditionalInfoLabel(viewKey)` 로 UI 표시용 label 을 파생

### 6.3 `EditorElement.id` — slug 규약

App 전체에서 특정 요소를 찾을 때 id 의 prefix 패턴을 사용한다. 현재
관찰되는 prefix 규약:

| prefix | 의미 | 생성 위치 |
|--------|------|-----------|
| `fallback-store-name` | 가게명 (단일) | `createElementsFromWireframe` |
| `fallback-main-slogan` | 메인 슬로건 (단일) | `createElementsFromWireframe` |
| `fallback-details` | 상세 설명 (단일) | `createElementsFromWireframe` |
| `fallback-product-summary` | (legacy) 제품 요약 | `mapProjectDataToTemplate` |
| `product-${productId}` | 제품 이미지 | `createElementsFromWireframe` |
| `product-${productId}-name\|price\|desc` | 제품 메타 텍스트 | `buildProductTextElements` |
| `info-text-${slugInfoKey(viewKey)}` / `info-image-${slugInfoKey(viewKey)}` | 부가정보 텍스트/아이콘 (slug = 1-based `ADDITIONAL_INFO_KEYS` index) | `createAdditionalInfoElements` |
| `custom-text-${ts}` | 사용자 추가 텍스트 | `createCustomTextElement` |
| `custom-image-${ts}` | 사용자 업로드 이미지 | `createCustomImageElement` |

`slugInfoKey(viewKey)` 는 `ADDITIONAL_INFO_KEYS.indexOf(viewKey) + 1` 의
문자열 표현(1-base 인덱스)이다. `id` 재매칭 시 같은 배열을 역인덱스로 다시
조회하므로 `ADDITIONAL_INFO_ITEMS` 배열 순서가 암묵적 계약이다.

---

## 7. 4종 병존 좌표계

좌표 정보를 담는 interface 가 이 프로젝트에는 **4종류** 있다. 이름도 비슷하고
필드도 유사해서 자주 혼동의 원인이 된다:

| 타입 | 필드 | 기준 좌표계 | 주 용도 |
|------|------|-------------|---------|
| `DraftSlot` (shared) | `x, y, width, height, rotation` | canvas 0..100% | InitPage 드래프트 카드의 제품 배치 |
| `ZonePosition` (home.ts) | `x, y, width, align?, rotation?, zIndex?` | canvas 0..100% | 초안에서 사용자가 드래그한 store/slogan/details/summary 텍스트 영역 |
| `LegacyTextRect` (editorFlow) | `x, y, width, rotation?, zIndex?, align?` | canvas 0..100% | ZonePositions fallback (템플릿 기본) |
| `WireframeRect` (wireframeLayout) | `x, y, width, height` | **mainZone 0..100%** | wireframe 슬롯/텍스트 배치 |

`ZonePosition` 과 `LegacyTextRect` 는 사실상 같은 스키마를 두 interface 로
정의한다 — 의도는 "런타임 사용자 입력" vs "컴파일 타임 상수" 분리. 물리
모양은 같다.

`WireframeRect` 만 **기준 좌표계가 다르다** — mainZone 을 추출한 다음
거기 상대 좌표. 이 타입에서 캔버스 좌표로 변환할 때만
`mainZone.{x,y,w,h}` 를 곱/더해준다 (§ 5.4 마지막 코드 스니펫).

FrameZone 은 또 하나의 별개 타입이지만, 좌표 저장이 아니라 "어느
영역을 가리키는 박스" 라 실제 렌더 좌표는 아니다.

---

## 8. 타입별 변경 충격 전파표

한 타입을 바꿨을 때 깨질 수 있는 위치를 빠르게 점검하기 위한 체크리스트.

| 변경 대상 | 반드시 수정해야 하는 위치 |
|-----------|------------------------|
| `HomeAdditionalInfo` 필드 추가 | (1) `ADDITIONAL_INFO_ITEMS` 엔트리(`viewKey` / `label` / `dataField`), (2) `buildEditingPayload.additionalInfo` 블록 (InitPage `view*` pass-through 포함), (3) `handleStartFromHome.seededVisibility`, (4) `additionalInfo.getAdditionalInfoIcon/DisplayText` switch, (5) `editorFlow.shouldShowAdditionalInfoIcon/Text` switch, (6) InitPage `DEFAULT_EXTRA_INFO` 의 `view*` 기본값, (7) (`FOOTER_TEXT_KEYS` / `FOOTER_ICON_KEYS` 중 해당 위치에 포함할지 결정) |
| `HomeProductInput` 필드 추가 | (1) `buildEditingPayload.products.map`, (2) `createElementsFromWireframe` 의 `EditorElement` 조립부, (3) `ElementInfoPanels` 사이드바 상세, (4) `projectEditor.updateProjectProduct` (존재 시) |
| `EditorElement` 필드 추가 | (1) drag/resize 공통 경로 (전체 필드 copy 해야 함), (2) `exportPoster` 렌더링, (3) `cloneTemplateElements`, (4) `ElementInfoPanels` 사이드바 패널 kind 분기 |
| `BackgroundMode` 값 추가 | (1) `editor-core.ts` enum, (2) `BG_TYPE_TO_EDITING_MODE` (역매핑 포함), (3) `buildInitialBackgroundCandidate`, (4) `queuedBackgroundGeneration` effect 분기, (5) `getSharedBgStyle` (shared) |
| `draftIndex` 값 확장 (Type 5 등) | (1) `LEGACY_TEXT_PLACEMENTS` 배열, (2) `WIREFRAME_TEXT_PLACEMENTS` 맵, (3) `getDraftTypography` switch, (4) `DRAFT_LAYOUTS` 배열, (5) wireframeSlots.json 에 type=5 추가, (6) `applyDraftLayoutVariant` 분기, (7) `computeWireframeProductPlacements` 분기. 참고: payload 진입점은 항상 `draftIndex = 0` 이므로 **편집 내부 Type 전환 경로만** 확장하면 된다. |
| `parkingSpaces` 타입/범위 변경 | (1) `HomeAdditionalInfo.parkingSpaces` 타입, (2) `buildEditingPayload` 의 `Number(extraInfo.parkingCount) || 0`, (3) initPage `extraInfo.parkingCount` 입력 파서 `Math.max(0, parseInt(...) \|\| 0)`, (4) `getAdditionalInfoIcon / getAdditionalInfoDisplayText` 의 `> 0` 비교, (5) `editorFlow` 의 visibility 판정 |
| `ZonePositions` 키 추가 (예: 'banner') | (1) `ZonePositions` interface, (2) `getDefaultZonePositions`, (3) `LEGACY_TEXT_PLACEMENTS` 각 엔트리, (4) `createElementsFromWireframe` 의 키별 push 블록, (5) export 에서 누락된 zone fallback 처리 |
| `TemplateDefinition` 필드 추가 | (1) `bootstrap.ts` fixture, (2) (사용 시) `mapProjectDataToTemplate`, (3) BootstrapResponse 소비 지점 전체 |

---

## 9. 연결된 타입 전체 맵 (시각화)

```
                   InitPage form inputs
                           │
                           │ buildEditingPayload()
                           v
         ┌──────── EditingBridgePayload ────────┐
         │                                       │
         │                               HomeProjectData
         │                                       │
      ┌──┴──────────────────┬─────────────────┬──┴───────┬────────────────┐
      v                     v                 v          v                v
  HomeProjectOptions   HomeProductInput[]  HomeAdditionalInfo  ZonePositions?  mainSlogan/storeName/...
  (draftIndex?: 내부 편집에서 mutate — payload에는 없음)
      │                     │                 │              │
      │                     │                 └─ view* ×7    │
      │                     │                                │
  BackgroundMode        ProductTransform                  ZonePosition ×4
      │
      │  (동일 enum)
      v
  App.tsx backgroundMode state ◄──── App.tsx projectData state ──── handleStartFromHome
                                              │
                                              │ createElementsFromWireframe
                                              v
                                        EditorElement[] ──── selectedElementIds[]
                                              │
                  ┌───────────────────────────┼────────────────────────┐
                  v                           v                        v
          applyElementVisibilityRules   applyDraftLayoutVariant   exportPoster
                  │                           │                        │
                  v                           v                        v
          renderElements (useMemo)    Type 3/4 overlap/crop        PNG / PDF
                  │
                  v
          EditorCanvas DOM
```

---

## 10. 관련 경로 매트릭스

| 타입 | 정의 위치 | 생산자 | 주 소비자 |
|------|-----------|--------|-----------|
| `EditingBridgePayload` | `editing/utils/editingBridge.ts:44` | `initPage/utils/editingBridge.buildEditingPayload` | `App.tsx` effect E2 |
| `HomeProjectData` | `editing/types/home.ts:79` | 위와 동일 | App.tsx, editorFlow, projectEditor |
| `HomeProductInput` | `editing/types/home.ts:9` | buildEditingPayload.products.map | createElementsFromWireframe, productImagePrebake |
| `HomeAdditionalInfo` | `editing/types/home.ts:32` | buildEditingPayload.additionalInfo | shouldShowAdditionalInfoText/Icon, createAdditionalInfoElements, additionalInfo.getIcon/DisplayText |
| `HomeProjectOptions` | `editing/types/home.ts:49` | buildEditingPayload.options | initialBackground.buildInitialBackgroundCandidate, editorFlow typography |
| `ZonePositions` | `editing/types/home.ts:63` | InitPage drag 결과 (payload) 또는 `getDefaultZonePositions` | createElementsFromWireframe, applyDraftLayoutVariant |
| `EditorElement` | `editing/types/editor-core.ts:7` | createElementsFromWireframe / mapProjectDataToTemplate | EditorCanvas, exportPoster, ElementInfoPanels |
| `TemplateDefinition` | `editing/types/editor-core.ts:40` | data/bootstrap.ts | api/client.fetchBootstrap → App state |
| `BackgroundCandidate` | `editing/types/api.ts:3` | generateBackgrounds API + initialBackground | BackgroundCard, EditorCanvas 배경 |
| `BootstrapResponse` | `editing/types/api.ts:14` | fetchBootstrap | App 의 useState 초기화 |
| `WireframeRect` | `editing/utils/wireframeLayout.ts:34` | deriveWireframeLayout, computeWireframeProductPlacements | createElementsFromWireframe |
| `WireframeProductPlacement` | `editing/utils/wireframeLayout.ts:117` | computeType3PairLayout / computeType4HalfCropLayout / ComputeWireframeProductPlacements | createElementsFromWireframe |
| `WireframeTypeTextPlacement` | `editing/utils/wireframeTextPlacements.ts:30` | `WIREFRAME_TEXT_PLACEMENTS` 상수 | deriveWireframeLayout |
| `FrameZone` | `initPage/components/wireframe/outerFrameZones` (re-export via wireframeBridge) | computeMainZoneDynamic | createElementsFromWireframe 의 좌표 변환 |
| `DraftSlot` | `shared/draftLayout.ts:1` | `getDraftProductSlots` | buildEditingPayload product.transform seed |
| `DraftTypography` (implicit) | `shared/draftTypography.ts:1` | getDraftTypography | createElementsFromWireframe fontSize 세팅 |

---

## 11. 이 문서의 유지 관리 규칙

- HomeProjectData 하위 필드가 추가/삭제되면 이 파일 § 4.3, § 4.4, § 8 을
  같은 PR 에서 업데이트.
- 새 EditorElement.id slug prefix 가 추가되면 § 6.3 테이블 업데이트.
- 새 타입을 `types/` 에 추가하면 § 10 매트릭스에 한 줄 추가.
- 좌표계가 하나 더 생기면 (예: 3D / 축척 변환) § 7 확장.

이 규칙을 어기면 이 문서는 **타입이 있는 위치의 지도일 뿐**이 되어,
실제로는 이미 드리프트한 상태가 된다. 원래의 목적인 "파이프라인을 한눈에
보는 지도" 역할을 유지하려면 타입 변경 시 동시 수정이 필수.
