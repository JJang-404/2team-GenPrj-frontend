# 07. InitPage ↔ Editing 브리지 보고서

- 대상:
  - [initPage/utils/editingBridge.js](../../react/src/modules/initPage/utils/editingBridge.js) — **write side**
  - [editing/utils/editingBridge.ts](../../react/src/modules/editing/utils/editingBridge.ts) — **read side**
- 역할: InitPage 에서 수집한 프로젝트 데이터(`HomeProjectData`)를 Editing 페이지
  로드 시 복원할 수 있도록 **3계층 폴백 채널**(클라이언트-사이드 only)로 전달한다.

> **히스토리 노트 (백엔드 토큰 경로 제거)**: 과거에는 최상위 채널로 FastAPI
> `POST/GET /api/bridge/editing` 을 썼으나, 해당 엔드포인트는 백엔드에 존재한
> 적이 없어 항상 404 → IndexedDB 폴백으로 흐르고 있었다. 기능상 동치이며
> 404 로그만 소음이었으므로 호출 자체를 제거했다.
- 상위 문서: `00_overview.md § 5`, `02_initPage_module.md § 8`, `03_editing_module.md § 12`

이 레이어는 SPA 라우팅 대신 **풀 페이지 전환** 을 전제로 한다. 따라서 단순히
"state 를 편집 페이지에 넘긴다" 가 아니라, 브라우저 탭/스토리지/네트워크
전환 간에도 데이터가 살아남게 만드는 조심스러운 계약이 필요하다.

---

## 1. 왜 3계층 폴백인가

각 전달 채널은 실패 시나리오가 다르다:

| 채널 | 장점 | 실패 시나리오 |
|------|------|---------------|
| **IndexedDB** | 5MB 제한 없음, 대량 이미지 포함 가능 | Safari ITP / 사파리 프라이빗 모드 제한 |
| **sessionStorage** | 항상 사용 가능 | **5MB 제한**, 제품 이미지 다 포함 시 초과 위험 |
| **window.name** | 스토리지 완전 차단 환경에서도 동작 | 2MB 정도 한계, 탭 reload 에만 살아남음 |

이 셋을 **병렬이 아닌 직렬**로 시도한다. 쓰기는 위→아래, 읽기도 위→아래
우선순위. 한쪽에 저장된 payload 는 한 번 읽히면 **즉시 삭제**되어 "두 번째
새로고침에서 이전 편집이 재생" 되는 버그를 방지한다.

> payload 는 전적으로 **same-origin 클라이언트 스토리지**에 머무른다.
> 서브도메인 분리 배포 시에는 별도 채널(예: 백엔드 토큰 엔드포인트)을 다시
> 도입해야 한다 — § 8 보안 메모 참조.

---

## 2. 계약: `EditingBridgePayload`

```ts
interface EditingBridgePayload {
  projectData: HomeProjectData;  // 03 보고서 § 10 의 타입
}
```

- `projectData` : 가게/제품/부가정보 **+ options.ratio/concept** 등 편집 페이지가
  반드시 필요로 하는 모든 필드.

> **draftIndex 는 더 이상 payload에 없다.** 과거에는 init 에서 사용자가 고른
> draft 카드 인덱스 (0-3) 를 top-level + `options.draftIndex` 에 이중 기록했으나,
> 현재 initPage 는 Type 0 카드만 노출하므로 제거되었다. 편집 내부의 Type 전환
> (`handleSelectLayoutVariant`) 은 `options.draftIndex` 를 mutate 하는 경로로
> 계속 유지된다 — 즉 필드 자체는 `HomeProjectOptions` 에 선택적으로 남아있고
> payload 경계에서만 시딩을 하지 않는다.

**타입은 edit 쪽에만 선언되어 있다** (`types/home.ts`). init 쪽은 JS 이므로
빌더 내부에서 구조를 직접 조립한다 — 둘 간 드리프트는 수동 검증 필요.

### 2.1 `additionalInfo` — 데이터 필드 + view* 가시성 플래그

`projectData.additionalInfo` 는 두 종류의 필드를 한 객체에 담는다:

| 분류 | 필드 | 타입 | 의미 |
|------|------|------|------|
| **데이터** | `parkingSpaces` | `number` | 주차 공간 수 (`Math.max(0, parseInt)` 으로 항상 ≥ 0 정수) |
| | `petFriendly` | `boolean` | 반려동물 동반 가능 여부 |
| | `noKidsZone` | `boolean` | 노키즈존 여부 |
| | `smokingArea` | `boolean` | 흡연 구역 존재 여부 |
| | `elevator` | `boolean` | 엘리베이터 존재 여부 |
| | `phoneNumber` | `string` | 전화번호 |
| | `address` | `string` | 주소 |
| **가시성(view*)** | `viewParking` | `boolean` | 주차 정보 canvas 표시 여부 |
| | `viewPet` | `boolean` | 반려동물 정보 표시 여부 |
| | `viewNoKids` | `boolean` | 노키즈존 표시 여부 |
| | `viewSmoking` | `boolean` | 흡연 구역 표시 여부 |
| | `viewElevator` | `boolean` | 엘리베이터 표시 여부 |
| | `viewPhone` | `boolean` | 전화번호 표시 여부 |
| | `viewAddress` | `boolean` | 주소 표시 여부 |

`view*` 플래그는 editing 측의 **초기 `additionalInfoVisibility` state** 를
결정한다. 사용자가 InitPage 에서 "전화번호 표시" 체크박스를 켜둔 상태로
다음 단계를 누르면, editing 진입 직후 해당 정보가 캔버스에 바로 렌더된다.

> **`viewHasDelivery` 는 없다** — editing 측에 대응 레이블이 없으므로
> bridge 계층에서 애초에 필드 자체를 생성하지 않는다. 7:7 대응 유지.

### 2.2 view* 키 통일 (InitPage / bridge / editing 3축 1:1 pass-through)

**책임 위치**: `editing/App.tsx` 의 `handleStartFromHome` inline.
Helper/bridge 수신 계층 분리 없음 (의도적 선택 — 03 보고서 § 2.1, § 3.3).

과거에는 bridge 경계와 editing 런타임이 서로 다른 이름 규약을
썼으나(한국어 레이블 key), 현재는 `view*` 단일 규약으로 통일된 뒤
**1:1 pass-through 로 복사**만 수행한다. 즉 state key 자체에는 변환이
없고, UI 표시용 한국어 라벨은 별도 조회(`getAdditionalInfoLabel(viewKey)`)
로 파생한다.

```ts
// editing/App.tsx handleStartFromHome 내부
const info = baked.additionalInfo;
const seededVisibility: Record<AdditionalInfoKey, boolean> = {
  viewParking:  Boolean(info.viewParking),
  viewPet:      Boolean(info.viewPet),
  viewNoKids:   Boolean(info.viewNoKids),
  viewSmoking:  Boolean(info.viewSmoking),
  viewElevator: Boolean(info.viewElevator),
  viewPhone:    Boolean(info.viewPhone),
  viewAddress:  Boolean(info.viewAddress),
};
setAdditionalInfoVisibility(seededVisibility);
setElements(createElementsFromWireframe(baked, seededVisibility));  // ← 같은 로컬 변수 재사용
```

**3축 흐름**

- InitPage → bridge: `extraInfo.view*` → `additionalInfo.view*` (identity)
- bridge → editing seed: `additionalInfo.view*` → `additionalInfoVisibility[view*]` (identity)
- Editing 내부 toggle: 같은 `AdditionalInfoKey` state 유지
- Editing → InitPage 되돌아가기: 없음 (단방향 flow, 상세는 03 § 3.2)

**누락 필드 처리** — bridge payload 의 `view*` 가 하나라도 누락되면 JS 의
`Boolean(undefined) === false` 규약으로 자동 off 처리. 런타임 에러 없음.
과거 payload (view* 미도입 / 이름이 달랐던 버전) 를 열면 누락된 키는 단순히
off 로 seed 된다.

---

## 3. 쓰기 파이프라인 (initPage)

### 3.1 `buildEditingPayload({ options, basicInfo, extraInfo, products })`

```
buildEditingPayload()
  ├─ Promise.all(products.map(async p => ({
  │     ...p, image: await normalizeProductImage(p.image)
  │   })))
  │    └─ normalizeProductImage:
  │         ├─ blob: URL → fetch → FileReader.readAsDataURL → "data:..."
  │         └─ PNG → cropToBoundingBox (canvas 로 alpha=0 여백 제거)
  │
  ├─ activeWithImage = normalized.filter(p => p.image)
  ├─ slots = getDraftProductSlots(0, activeWithImage.length)            # Type 0 고정
  ├─ productsWithTransform = normalized.map(p =>
  │     p.image ? { ...p, transform: slots[cursor++] } : { ...p, transform: null })
  │
  └─ return {
        projectData: {
          options: {
            ratio,                                                       # draftIndex · sampleCount 미포함
            concept: BG_TYPE_TO_EDITING_MODE[bgType] ?? 'ai-image',  # 한글 → 영문 enum
            brandColor, bgType, startColor, endColor,
            gradientAngle, splitPosition, splitDirection,
          },
          storeName, industry,
          mainSlogan: basicInfo.storeDesc?.trim() ?? '',
          details: '',
          products: productsWithTransform.map(normalize),
          additionalInfo: {
            // 데이터 필드
            parkingSpaces: Number(extraInfo.parkingCount) || 0,          # number (과거 string → 변경)
            petFriendly, noKidsZone, smokingArea, elevator,
            phoneNumber, address,
            // 가시성 플래그 (§ 2.1) — InitPage `extraInfo.view*` 그대로 pass-through
            viewParking:  Boolean(extraInfo.viewParking),
            viewPet:      Boolean(extraInfo.viewPet),
            viewNoKids:   Boolean(extraInfo.viewNoKids),
            viewSmoking:  Boolean(extraInfo.viewSmoking),
            viewElevator: Boolean(extraInfo.viewElevator),
            viewPhone:    Boolean(extraInfo.viewPhone),
            viewAddress:  Boolean(extraInfo.viewAddress),
          },
        }
      }
```

> `extraInfo.view*` 는 InitPage state 의 네이밍이자 bridge 계약 필드명이며,
> editing `additionalInfoVisibility` 의 key 이기도 하다. 세 축이 모두 동일한
> `view*` (AdditionalInfoKey) 를 공유하므로 bridge 에서는 rename 없이 **순수
> 1:1 pass-through** 만 수행하고, editing 진입 시에도 `seededVisibility` 는
> identity copy 로 구성된다 (§ 2.2).

### 3.2 핵심 변환

**bgType 매핑** — 한국어 UI 라벨을 editing 모듈의 영문 enum 으로:

```js
const BG_TYPE_TO_EDITING_MODE = {
  단색: 'solid',
  그라데이션: 'gradient',
  다중색: 'pastel',
  'AI 생성': 'ai-image',
};
```

이 매핑은 **편도**다. editing 에서 다시 init 으로 돌아갈 때는 `bgType` 원본을
그대로 가지고 갔다가 재사용하므로 역매핑이 필요 없음.

**이미지 경량화** — 제품 이미지의 투명 여백 제거:

- `normalizeProductImage` → blob → dataURL → `cropToBoundingBox`
- 배경 제거(`@imgly/background-removal`) 후 생긴 1024×1024 PNG 에서 실제
  제품만 있는 사각 영역만 잘라 전송. 전송 크기/IndexedDB 쿼터에 직접 영향.
- 크롭 영역이 없으면 (완전 투명) 원본 유지. 에러 시에도 원본 반환 (silent).

**제품 transform 주입** — shared `draftLayout` 에서 draft 별 슬롯 좌표를 받아
**실제 이미지가 있는 제품만** cursor 진행. 이미지 없는 제품은 `transform: null`
로 표기하여 편집 페이지에서 render skip 대상.

### 3.3 `storeEditingPayload(payload)` — 2계층 저장 시도

```js
try {
  await idbSet(IDB_PAYLOAD_KEY, payload);
  return null;                             // ① IndexedDB 성공
} catch {
  try {
    sessionStorage.setItem(EDITING_BRIDGE_KEY, JSON.stringify(payload));
  } catch {
    /* ③ window.name 은 호출자 쪽에서 set */
  }
  return null;                             // ② sessionStorage fallback
}
```

반환값은 항상 `null` — 토큰 개념이 없으므로 호출자(`InitApp.jsx`) 는
`/editing` (쿼리 없음) 로 이동. editing 측은 모든 계층을 순차 확인.

### 3.4 `getEditingAppUrl()`

```js
export function getEditingAppUrl() {
  const baseUrl = import.meta.env.VITE_EDITING_URL ?? '/editing';
  return new URL(baseUrl, window.location.origin).pathname;
}
```

`VITE_EDITING_URL` 이 절대 URL 이면 타 도메인/포트로 편집 앱을 분리 배포할
수 있다. 없으면 같은 호스트의 `/editing` 경로.

---

## 4. 읽기 파이프라인 (editing)

### 4.1 `readEditingBridgePayload()`

```ts
export async function readEditingBridgePayload(): Promise<EditingBridgePayload | null> {
  // ① IndexedDB
  try {
    const fromIdb = await idbGet<EditingBridgePayload>(IDB_PAYLOAD_KEY);
    if (fromIdb?.projectData) {
      await idbDelete(IDB_PAYLOAD_KEY);     // 한 번 읽으면 삭제
      return fromIdb;
    }
  } catch (e) { /* warn, 다음 계층 */ }

  // ② sessionStorage
  const fromSession = parsePayload(sessionStorage.getItem(EDITING_BRIDGE_KEY));
  if (fromSession) {
    sessionStorage.removeItem(EDITING_BRIDGE_KEY);
    return fromSession;
  }

  // ③ window.name
  if (window.name.startsWith(WINDOW_NAME_PREFIX)) {
    const raw = window.name.slice(WINDOW_NAME_PREFIX.length);
    const decoded = parsePayload(decodeURIComponent(raw));
    window.name = '';                       // 항상 청소
    return decoded;
  }

  return null;
}
```

### 4.2 한 번 읽고 삭제 — 왜

두 가지 이유:

1. **"F5 로 이전 편집 복원" 방지.** 사용자가 편집 페이지를 열었다가 브라우저
   탭을 새로고침하면, payload 가 그대로 남아 있으면 다시 init→editing 진입
   플로우가 재현됨. 실제 편집 상태(`elements[]`, 배경 후보 등) 는 메모리에만
   있어 사라지므로 혼란스러움. 삭제해서 "payload 없음 → init 으로 redirect"
   의 단일 경로를 만든다.
2. **스토리지 청소.** IndexedDB/sessionStorage 에 제품 이미지 dataURL 이 쌓이면
   용량 제한에 걸린다. 한 번만 쓰이는 상태이므로 즉시 제거.

### 4.3 payload 없음 → init redirect

[editing/App.tsx:291-310](../../react/src/modules/editing/App.tsx#L291-L310) 는
`bridgeResolved` 플래그가 false 이고 loading 이 false 일 때 단 한 번
`readEditingBridgePayload()` 를 호출한다. null 이 반환되면:

```ts
window.location.replace(getInitPageUrl());
```

즉 "토큰도 없고 스토리지에도 없음" = InitPage 로 강제 이동 (full reload).
이 조건은 사용자가 `/editing` 을 북마크했거나 직링크로 진입한 경우 필연적.

### 4.4 StrictMode 이중 mount 대비

```ts
const [bridgeResolved, setBridgeResolved] = useState(false);
useEffect(() => {
  if (loading || bridgeResolved) return;     // 이미 해석했으면 no-op
  ...
  finally { setBridgeResolved(true); }
}, [loading, bridgeResolved]);
```

StrictMode 에서 effect 가 두 번 실행되어도 **payload 읽기 + `idbDelete` 가
두 번 실행되지 않는다** (`bridgeResolved` 가드 + IndexedDB 에 이미 없어
두 번째 읽기는 null).

---

## 5. 상수 테이블 (두 파일이 공유하는 규약)

| 상수 | 값 | 쓰임 |
|------|-----|------|
| `EDITING_BRIDGE_KEY` | `'adgen-editing-bridge'` | sessionStorage 키 |
| `IDB_DB_NAME` | `'adgen-bridge-db'` | IndexedDB 이름 |
| `IDB_STORE_NAME` | `'editing-bridge'` | IndexedDB objectStore |
| `IDB_PAYLOAD_KEY` | `'latest'` | IndexedDB 내 유일한 키 |
| `WINDOW_NAME_PREFIX` | `'adgen-editing-bridge:'` | window.name 식별자 |

이 상수는 **두 파일에 각각 선언**되어 있다 (공유 상수 파일 없음). 값이
어긋나면 payload 가 건너가지 않으므로 **수정 시 반드시 양쪽 동시 수정**.

TODO 후보: 이 상수를 shared/bridgeKeys.ts 같은 단일 파일로 뽑아내는 리팩터.

---

## 6. 데이터 전이 다이어그램

```
[InitPage App.jsx]
     │
     │ 사용자 "다음 단계" 클릭
     ▼
buildEditingPayload({ options, basicInfo, extraInfo, products })
     │
     │ normalizeProductImage × N
     │ getDraftProductSlots(0, activeCount)            # Type 0 고정
     │ BG_TYPE_TO_EDITING_MODE[bgType]
     ▼
{ projectData: { options, storeName, industry,
  mainSlogan, details:'', products[], additionalInfo } }
     │
     ▼
storeEditingPayload(payload)
     ├─ idbSet(IDB_PAYLOAD_KEY, payload)                → IndexedDB 1순위
     └─ sessionStorage.setItem(EDITING_BRIDGE_KEY, …)   → 폴백
     │
     ▼
getEditingAppUrl()
     │
     │ window.location.href = …
     │ (풀 페이지 전환)
     ▼
[Editing App.tsx]  ◀── main.tsx → App.tsx → pages/EditingPage → EditingApp
     │
     │ useEffect 내
     ▼
readEditingBridgePayload()
     ├─ idbGet(IDB_PAYLOAD_KEY) + idbDelete
     ├─ sessionStorage.getItem + removeItem
     └─ window.name prefix decode + clear
     │
     ▼
handleStartFromHome(bridged.projectData)            # 내부에서 data.options.draftIndex ?? 0 읽음
     ├─ prebakeProductImages(products)        # Type 3/4 용 left/right half
     ├─ setProjectData(baked)
     ├─ seededVisibility = {                  # § 2.2 — view* → 한국어 레이블
     │     '주차 공간 수': Boolean(info.viewParking), ...
     │   }
     ├─ setAdditionalInfoVisibility(seededVisibility)
     ├─ setBackgroundMode(concept)
     └─ setElements(createElementsFromWireframe(baked, seededVisibility))
```

---

## 7. 성능·크기 고려사항

### 7.1 전송 크기

전형적 payload 크기:

- 텍스트 필드만 → ~1-5 KB
- 제품 1장 (1024×1024 PNG, 배경 제거 + crop) → ~200-500 KB
- 제품 6장 → ~2-3 MB

sessionStorage 5MB 제한을 감안하면 **제품 6장 + 원본 고화질** 조합에서는
sessionStorage fallback 이 실패할 수 있다. IndexedDB 경로가 정상이면
쿼터(§ 7.2) 내에서 안전.

### 7.2 IndexedDB 쿼터

Chrome: 전역 사용량 / 디스크 공간 비율로 자동 관리. 일반적 50MB+ 여유.
Safari: 50MB 하드 제한 + 7일 ITP 로 삭제될 수 있음.

### 7.3 cropToBoundingBox 비용

`cropToBoundingBox` 는 canvas 의 `getImageData` 를 돌려 픽셀 알파를 전수 검사
(O(w*h)). 1024² 이미지 6장 → ~6M pixel 반복 → 브라우저에서 수백 ms. UI 는
InitPage 의 "다음 단계" 버튼 클릭 시 로딩 스피너로 가려진다.

---

## 8. 보안 메모

- 현재 payload 는 **same-origin 클라이언트 스토리지**에만 머무르므로
  서버 측 유출 경로는 없다. 반대로 같은 origin 에 XSS 가 주입되면
  IndexedDB/sessionStorage 의 payload 를 직접 읽어낼 수 있으므로 CSP 와
  입력 검증에 의존한다.
- sessionStorage/IndexedDB 는 **origin 단위 격리**. 서브도메인 분리 배포 시
  payload 가 건너가지 않음 — 이 경우 백엔드 토큰 엔드포인트(또는 유사한
  크로스-오리진 채널)를 재도입해야 한다.
- window.name 은 탭 공유 가능하지만 URL 변경 시엔 유지되지 않아 XSS 경로로는
  낮은 위험.

---

## 9. 변경 포인트 가이드

| 변경 목적 | 수정 위치 | 주의 |
|-----------|-----------|------|
| payload 에 새 필드 추가 (e.g. `promotionDate`) | init `buildEditingPayload` 의 `projectData` + edit `types/home.ts` `HomeProjectData` | 양쪽 동시 수정. init 은 JS 이므로 누락해도 컴파일 에러 안 남 — 런타임에만 `undefined` 로 드러남 |
| 새 부가정보 가시성 플래그 (`view*`) 추가 | `editing/utils/additionalInfo.ADDITIONAL_INFO_ITEMS` 에 `{viewKey, label, dataField}` 추가 + init `buildEditingPayload.additionalInfo` 에 `viewX: Boolean(extraInfo.viewX)` 추가 + edit `types/home.HomeAdditionalInfo` 에 `view*` + 데이터 필드 추가 + `initPage/constants/design.DEFAULT_EXTRA_INFO` seed + `App.tsx handleStartFromHome` 의 `seededVisibility` 에 identity copy 추가 + `additionalInfo.getAdditionalInfoIcon/DisplayText` 에 아이콘/표시 케이스 추가 | § 2.1-2.2 참조. 세 축이 동일한 `view*` 키를 공유하므로 bridge·state·sidebar 는 rename 없이 그대로 이어진다. 누락하면 bridge 는 통과하지만 editing 의 해당 항목이 타입 에러 또는 항상 off 로 드러남 |
| sessionStorage 키 변경 | `EDITING_BRIDGE_KEY` **양쪽** + window.name `WINDOW_NAME_PREFIX` | 기존 키로 저장된 payload 는 사용자가 다시 편집 진입할 때 건너뛸 수 없어짐. 배포 주기 안에서 한 번에 롤아웃. |
| 백엔드 토큰 채널 재도입 | init `storeEditingPayload` 1순위 + edit `readEditingBridgePayload` 1순위 + 백엔드 route 신설 | 서브도메인 분리 배포 / 크로스-디바이스 공유 요건이 생길 때에만. 현재는 호출 자체가 없음. |
| 폴백 제거 (e.g. window.name 삭제) | 양쪽 해당 블록 | 일부 Safari 모드에서 payload 소실 가능 — 사전 QA 필요 |
| bgType → mode 매핑 확장 | `BG_TYPE_TO_EDITING_MODE` + editing `types/editor-core.BackgroundMode` + App.tsx 분기 | 매핑 테이블이 init 쪽에만 있고 edit 쪽은 그대로 받음 — 새 모드 추가 시 4-5 파일 수정 |
| 상수 공용 분리 (추천) | `shared/bridgeKeys.ts` 신설 → 양쪽 import | TS 쪽은 바로 import 가능, JS 쪽도 직접 `.ts` import 가능 (Vite 해석) |

---

## 10. 테스트 관점 체크리스트

- [ ] `storeEditingPayload` 가 IndexedDB 저장에 성공하고 edit 에서 정상
      읽히는가. URL 쿼리(`?token=`) 없이 `/editing` 로 이동하는가.
- [ ] IndexedDB 실패 시 sessionStorage 에 저장되는가. payload 5MB 초과 시
      `setItem` 예외를 삼키고 경고만 남기는가.
- [ ] edit 에서 `readEditingBridgePayload` 한 번 호출 후 IndexedDB 에서
      실제로 삭제되는가. F5 새로고침 시 init 으로 redirect 되는가.
- [ ] StrictMode 이중 mount 에서 payload 가 두 번 소비되어 에러 나지 않는가
      (`bridgeResolved` 가드).
- [ ] `BG_TYPE_TO_EDITING_MODE` 에 없는 `bgType` 값이 들어오면 `'ai-image'` 로
      안전 fallback 되는가.
- [ ] 제품 이미지가 모두 없는 프로젝트(신규 사용자) 도 payload 를 만들 수
      있는가 (`activeWithImage.length === 0` → `slots.length === 0` → 모두
      `transform: null`).
- [ ] `cropToBoundingBox` 가 완전 투명 PNG 에 대해 원본을 그대로 반환하는가
      (minX > maxX 가드).
- [ ] 서브도메인 분리 배포 (`VITE_EDITING_URL` 이 다른 origin) 에서
      IndexedDB/sessionStorage 폴백이 동작하지 않고 토큰 경로만 성공하는가.
- [ ] InitPage 에서 "전화번호 표시" 체크박스 on → 다음 단계 → editing 진입
      직후 사이드바 "전화번호" 체크박스가 on, canvas 에도 전화번호 텍스트+아이콘
      이 렌더되는가. (view* → 한국어 레이블 seed 경로 end-to-end 검증)
- [ ] 과거 payload (view* 필드 미포함) 를 IndexedDB 에 저장한 상태로 editing
      진입 시, 7개 레이블이 모두 off 로 seed 되고 런타임 에러가 없는가
      (`Boolean(undefined) === false`).
- [ ] editing 진입 후 사이드바 체크박스를 off → Type 전환 → off 가 유지되는가
      (seed 가 덮어쓰지 않음 — 1회만 seed).

---

## 11. 관련 경로

### Bridge 파일
- [initPage/utils/editingBridge.js](../../react/src/modules/initPage/utils/editingBridge.js) — write side
- [editing/utils/editingBridge.ts](../../react/src/modules/editing/utils/editingBridge.ts) — read side

### Consumers
- [initPage/App.jsx](../../react/src/modules/initPage/App.jsx) — `storeEditingPayload` + `getEditingAppUrl`
- [editing/App.tsx](../../react/src/modules/editing/App.tsx) — `readEditingBridgePayload` + `handleStartFromHome`

### 관련 타입/상수
- [editing/types/home.ts](../../react/src/modules/editing/types/home.ts) — `HomeProjectData` (payload 구조)
- [shared/draftLayout.ts](../../react/src/shared/draftLayout.ts) — `getDraftProductSlots` (transform 시드)
- [editing/utils/additionalInfo.ts](../../react/src/modules/editing/utils/additionalInfo.ts) — `ADDITIONAL_INFO_ITEMS` / `AdditionalInfoKey` (7개 `view*` 키 + UI 레이블 single source of truth)

### 관련 섹션
- [03 § 2.1 `handleStartFromHome` 상세](03_editing_module.md#21-handlestartfromhome-상세--진입-1회-seed-지점)
- [03 § 3.2 `additionalInfoVisibility` 계약 — `view*` key 규약](03_editing_module.md#32-additionalinfovisibility-계약--view-key-규약)
- [08 § 6.2 `ADDITIONAL_INFO_ITEMS` — `view*` 통일 state key 체계](08_data_interfaces.md#62-additional_info_items--view-통일-state-key-체계)

### 환경 변수
- `VITE_EDITING_URL` — editing 앱 URL (default `/editing`)
- `VITE_INITPAGE_URL` — init 앱 URL (default `/`)
- 백엔드 bridge 엔드포인트 없음 (클라이언트 스토리지 only)
