# 03. Editing 모듈 보고서

- 대상: `react/src/modules/editing/**`
- 역할: 사용자가 InitPage 에서 넘겨준 `HomeProjectData` 를 받아 실제 편집 가능한
  `EditorElement[]` 로 펼치고, 배경 생성·문구·레이아웃·export 까지 한 화면에서
  처리하는 2차 모듈.
- 상위 문서: `00_overview.md § 4.2`, `01_entry_routing.md § 5`

이 모듈은 프로젝트에서 가장 큰 단일 영역이다. `App.tsx` 한 파일이 ~1000 LOC,
`utils/editorFlow.ts` 가 ~1200 LOC. 즉 이 모듈을 이해한다는 것은 곧 두 파일을
읽는 것이 시작의 반이다.

---

## 1. 디렉터리 맵

```
modules/editing/
├── App.tsx                         ─ EditApp 본체 (~996 L)
├── api/
│   └── client.ts                   ─ fetchBootstrap / generateBackgrounds 파사드
├── components/
│   ├── EditorCanvas.tsx            ─ 포스터 프리뷰 + drag/resize/select (280 L)
│   ├── BackgroundCard.tsx          ─ 후보 배경 카드 (mini preview) (134 L)
│   ├── WireframeChoiceCard.tsx     ─ Type 1-4 구도 선택 카드 (205 L)
│   ├── Sidebar.tsx                 ─ 좌측 컨트롤 패널 루트 (172 L)
│   └── sidebar/
│       ├── SidebarBlock.tsx              · 섹션 래퍼
│       ├── SidebarMiniButton.tsx         · 미니 토글/아이콘 버튼
│       ├── BackgroundOptionsSection.tsx  · 모드/컬러/프롬프트 (168 L)
│       ├── AdInfoSection.tsx             · 매장·슬로건·상세 텍스트
│       ├── AddElementSection.tsx         · 텍스트/이미지 추가
│       ├── AdditionalInfoSection.tsx     · 주차·반려동물·흡연 아이콘 토글
│       ├── RecommendationsSection.tsx    · 사이드바 추천 팁 표시
│       ├── ElementInfoPanels.tsx         · 선택 엘리먼트 상세 패널 (224 L)
│       └── backgroundTokens.ts           · BG_SOLID/BG_GRADIENT/BG_MULTI 파서
├── config/
│   └── remoteApi.ts                ─ getRemoteApiBase() (7 L, 단일 유틸)
├── data/
│   └── bootstrap.ts                ─ 템플릿 시드 + sidebarRecommendations (203 L)
├── styles/
│   └── global.css                  ─ editing 전용 전역 CSS
├── types/
│   ├── editor-core.ts              ─ EditorElement, EditorStep, Kind 등 (56 L)
│   ├── api.ts                      ─ BackgroundCandidate, BootstrapResponse (38 L)
│   ├── home.ts                     ─ HomeProjectData 계열 (81 L)
│   └── editor.ts                   ─ 위 세 파일의 re-export barrel (23 L)
└── utils/
    ├── editor.ts                   ─ clone/update/toPercent (33 L)
    ├── editorFlow.ts               ─ 레이아웃·문구·가시성 로직 (1236 L)
    ├── wireframeLayout.ts          ─ Type 1-4 EditorElement 배치 (362 L)
    ├── wireframeTextPlacements.ts  ─ 타입별 텍스트 블록 좌표 (105 L)
    ├── wireframeBridge.ts          ─ init 측 outerFrameZones 재수출 (33 L)
    ├── backgroundGeneration.ts     ─ AI 배경 파이프라인 (400 L)
    ├── initialBackground.ts        ─ init→editing 전환 기본 배경 (111 L)
    ├── productImagePrebake.ts      ─ 좌/우 절반 PNG + natural size (92 L)
    ├── projectEditor.ts            ─ mainSlogan/additionalInfo 적용 (99 L)
    ├── additionalInfo.ts           ─ 부가정보 라벨/아이콘 (123 L)
    ├── editingBridge.ts            ─ initPage → editing payload 읽기 (114 L)
    ├── fontRecommendations.ts      ─ 폰트 추천 사전 (46 L)
    ├── canvas.ts                   ─ html2canvas 래퍼 (33 L)
    ├── exportPoster.ts             ─ 최종 이미지 export (370 L)
    ├── file.ts                     ─ readFileAsDataUrl (16 L)
    └── ratio.ts                    ─ ratioToAspectValue/CanvasAR (24 L)
```

모듈 전체 5,989 LOC(TS/TSX 기준). 공용 의존은 `server/api/*`, `shared/*`,
`modules/initPage/utils/removeBackground` 정도로 얕다.

---

## 2. 실행 파이프라인 — 'App.tsx' 단일 장면

```
 (URL ?token=... 또는 sessionStorage)
          │
          ▼  useEffect(readEditingBridgePayload)
     handleStartFromHome(data)                     ← payload에서 꺼낸 HomeProjectData
          │
          │  const draftIndex = data.options.draftIndex ?? 0   (진입 시 항상 0)
          ▼ prebakeProductImages(data.products)
     baked = { ...data, products, zonePositions }
          │
          ├─ setProjectData(baked)
          ├─ setBackgroundMode(concept)
          ├─ setBackgroundCandidates([plainWhite])
          ├─ setElements(createElementsFromWireframe(baked))
          └─ setStep('background')
          │
          ▼  사용자 상호작용
     ┌────────────────────────────────────────┐
     │  Sidebar  (mode · color · slogan · …) │
     │  WireframeChoiceCard (Type 1-4 전환) │
     │  EditorCanvas (drag/resize/text edit) │
     └────────────────────────────────────────┘
          │
          ▼  "내보내기"
     exportPosterAsBlob({ ref, ratio, ... }) → PNG Blob
          │
          ▼
     adverApi.saveResult(...) / 이미지 다운로드
```

`App.tsx` 는 단일 거대 함수 컴포넌트로 ~30 개 state, ~20 개 핸들러를 들고
있다. 이 구조의 핵심은 **"모든 상태를 최상단에 모으고, 하위는 props 로만
받게 한다"** 는 것. Context 나 상태 관리 라이브러리를 쓰지 않는다.

### 2.1 `handleStartFromHome` 상세 — 진입 1회 seed 지점

editing 의 "초기값 확정" 은 실질적으로 이 함수 안에서 벌어진다. 중요한 상태는
모두 여기서 **한 번에** 세팅되고, 이후는 사용자 토글/Type 전환/배경 변경
핸들러로 위임된다.

```
handleStartFromHome(data)
  │
  ├─ const draftIndex = data.options.draftIndex ?? 0   ← 진입 시점엔 항상 0. 편집 내부에서 Type 전환 경로가 mutate 한 값을 후속 호출에서 읽을 때만 의미.
  ├─ setIsPrebakingImages(true)
  ├─ prebakeProductImages(data.products)         → baked.products 교체
  │
  ├─ baked.zonePositions = getDefaultZonePositions(draftIndex)
  ├─ setProjectData(baked)
  │
  ├─ seededVisibility = {                         ← bridge payload 의 view* → 한국어 레이블 key
  │     '주차 공간 수':       Boolean(info.viewParking),
  │     '애견 동반 가능 여부': Boolean(info.viewPet),
  │     '노키즈존':           Boolean(info.viewIsNoKids),
  │     '흡연 구역 존재 여부': Boolean(info.viewSmokingArea),
  │     '엘리베이터 존재 여부': Boolean(info.viewHasElevator),
  │     '전화번호':           Boolean(info.viewPhone),
  │     '주소':               Boolean(info.viewAddress),
  │   }
  ├─ setAdditionalInfoVisibility(seededVisibility)
  │
  ├─ setBackgroundMode(concept)
  ├─ setPromptHint(...)
  ├─ setBackgroundColorDraft(...)
  ├─ setBackgroundCandidates([plainWhite])
  ├─ setSelectedBackgroundId(plainWhite.id)
  ├─ setSelectedTemplateId(templates[draftIndex].id)
  └─ setElements(createElementsFromWireframe(baked, seededVisibility))  ← 로컬 변수 재사용
```

**왜 `seededVisibility` 로컬 변수를 쓰는가?**
`setAdditionalInfoVisibility(...)` 직후의 React state 는 아직 이전 값 (`{}`)
이다. 같은 함수 scope 에서 `createElementsFromWireframe` 를 호출할 때 state
를 다시 읽으면 빈 객체를 넘겨 모든 부가정보가 숨김으로 렌더된다. 이를
막기 위해 seed 결과를 로컬 변수로 캡처해 두 소비자
(`setAdditionalInfoVisibility`, `createElementsFromWireframe`) 에 **같은
객체**를 전달한다.

---

## 3. 상태 모델 — App.tsx 의 30개 state

| 카테고리 | state | 타입 | 역할 |
|----------|-------|------|------|
| **Bootstrap** | `bootstrap` | `BootstrapResponse` | 템플릿/사이드바 추천 시드 |
| | `loading` | `boolean` | 초기 fetchBootstrap 중 |
| | `error` | `string \| null` | 치명적 에러 메시지 |
| | `bridgeResolved` | `boolean` | init→editing payload 해석 완료 플래그 |
| **Project** | `projectData` | `HomeProjectData \| null` | init 에서 넘어온 편집 대상 |
| | `selectedTemplateId` | `string \| null` | 활성 템플릿 id |
| **Flow step** | `step` | `'background' \| 'editor'` | 현재 스테이지 |
| | `rightPanelMode` | `'background' \| 'template'` | 우측 패널 콘텐츠 |
| | `sidebarExpanded` | `boolean` | 좌측 접기/펼치기 |
| **Elements** | `elements` | `EditorElement[]` | 편집 가능한 모든 요소 |
| | `selectedElementIds` | `string[]` | 다중 선택 |
| | `additionalInfoVisibility` | `Record<string,boolean>` | 부가정보 on/off — **key 는 한국어 레이블** (`'주차 공간 수'` 등), camelCase 아님 |
| **Background** | `backgroundMode` | `BackgroundMode` | 'solid'/'gradient'/'pastel'/'ai-image' |
| | `promptKo` · `promptHint` | `string` | AI 배경 프롬프트 |
| | `backgroundColorDraft` | `{solid, gradient, pastel}` | 컬러 피커 초안값 |
| | `backgroundCandidates` | `BackgroundCandidate[]` | 후보군 |
| | `selectedBackgroundId` | `string \| null` | 적용 배경 |
| | `generating` | `boolean` | AI 생성 진행 |
| | `queuedBackgroundGeneration` | `boolean` | 자동 재생성 큐 |
| **Prebake** | `isPrebakingImages` | `boolean` | 전체 프리베이크 오버레이 |
| | `prebakingProductIds` | `Set<number>` | 개별 제품 인라인 스피너 |
| **Save** | `saving` | `boolean` | export 진행 중 |
| **Refs** | `captureRef` | `HTMLDivElement` | 전체 캔버스 캡처 타깃 |
| | `mainPreviewRef` | — | WireframeChoiceCard 폭 동기화용 |
| | `autoCopyKeyRef` | `string` | mainSlogan 자동 생성 dedupe 키 |
| | `suspendInitialBackgroundSyncRef` | `boolean` | initial 배경 동기화 일시 정지 |

### 3.1 파생값 (useMemo)

- `selectedTemplate` — `templates.find(id)`
- `selectedBackground` — `candidates.find(id)`
- `renderElements` — `applyElementVisibilityRules(templateId, elements, mode, projectData)`
- `selectedElement` — `selectedElementIds.length===1` 일 때만 단일 객체

렌더에 사용되는 것은 항상 `renderElements` 이고, 편집/저장은 `elements` 를
직접 다룬다. `backgroundMode` 에 따라 특정 요소를 숨기는 규칙이 이 분리에
있다(예: `mode==='solid'` 일 때 주 배경 이미지 엘리먼트를 `hidden`).

### 3.2 `additionalInfoVisibility` 계약 — 한국어 레이블 key 규약

이 state 는 이름과 달리 `Record<string, boolean>` 타입의 자유형 맵처럼
보이지만, 실제로는 **7개 한국어 레이블 문자열을 key 로 쓰는 엄격한 규약**이
존재한다. 규약을 어기면 사이드바 체크박스와 canvas info element 가 서로
어긋나므로 반드시 지켜야 한다.

**규약의 출처**:

| 위치 | 코드 | 의미 |
|------|------|------|
| [`editorFlow.ts:255-263`](../../react/src/modules/editing/utils/editorFlow.ts#L255-L263) | `additionalInfoLabels = ['주차 공간 수', '애견 동반 가능 여부', '노키즈존', '흡연 구역 존재 여부', '엘리베이터 존재 여부', '전화번호', '주소'] as const` | **Single source of truth** — 7개 레이블 배열 |
| [`App.tsx:660-669`](../../react/src/modules/editing/App.tsx#L660-L669) | `handleToggleInfoItem(label)` → `setAdditionalInfoVisibility(prev => ({ ...prev, [label]: !prev[label] }))` | 토글 시에도 **label 문자열 그대로** key 로 사용 |
| [`App.tsx:869`](../../react/src/modules/editing/App.tsx#L869) | `infoItems={additionalInfoLabels.map(label => ({ label, visible: additionalInfoVisibility[label] ?? false }))}` | 사이드바 렌더 시 **label 로 lookup** |
| [`editorFlow.ts:245-248`](../../react/src/modules/editing/utils/editorFlow.ts#L245-L248) | `additionalInfoLabels.forEach(label => createAdditionalInfoElements(projectData, label, visibility))` | canvas 요소 생성 시 **label 로 visibility 조회** |
| [`editorFlow.shouldShowAdditionalInfoText/Icon`](../../react/src/modules/editing/utils/editorFlow.ts) | `visibility[label]` 직접 조회 | 렌더 판단 |

즉 `additionalInfoLabels` 배열에 담긴 7개 문자열이 **state key / sidebar
체크박스 / canvas element 판단자** 세 곳에서 공통으로 사용된다. camelCase
(예: `viewParking`) 를 key 로 쓰면 어느 소비자도 매칭하지 못해 항상 off 로
보인다.

### 3.3 view* (bridge) ↔ 한국어 레이블 (editing state) 매핑표

Bridge payload 는 JS 관용 camelCase, editing state 는 한국어 레이블 — 두
표기가 공존하므로 매핑이 필요하다. 변환은 **`handleStartFromHome` inline**
(§ 2.1) 에서 1회만 수행. Helper/bridge 계층 분리 없음.

| `projectData.additionalInfo.*` (bridge) | `additionalInfoVisibility[*]` (editing state) | 사이드바 레이블 (UI) |
|------------------------------------------|------------------------------------------------|-----------------------|
| `viewParking` | `'주차 공간 수'` | 주차 공간 수 |
| `viewPet` | `'애견 동반 가능 여부'` | 애견 동반 가능 여부 |
| `viewIsNoKids` | `'노키즈존'` | 노키즈존 |
| `viewSmokingArea` | `'흡연 구역 존재 여부'` | 흡연 구역 존재 여부 |
| `viewHasElevator` | `'엘리베이터 존재 여부'` | 엘리베이터 존재 여부 |
| `viewPhone` | `'전화번호'` | 전화번호 |
| `viewAddress` | `'주소'` | 주소 |

7:7 대응. 누락된 `view*` 필드는 `Boolean(undefined) === false` 로 자동 off
처리 (§ 2.1 의 `Boolean(info.*)` 감싸기).

> **주의 — 레이블 추가/변경 시**:
> 1. [`editorFlow.additionalInfoLabels`](../../react/src/modules/editing/utils/editorFlow.ts#L255-L263) 에 레이블 추가
> 2. [`types/home.HomeAdditionalInfo`](../../react/src/modules/editing/types/home.ts) 에 `view*` + 데이터 필드 추가
> 3. [`initPage/utils/editingBridge.buildEditingPayload`](../../react/src/modules/initPage/utils/editingBridge.js) 의 `additionalInfo` 블록에 `viewX: Boolean(extraInfo.showX)` 추가
> 4. [`App.tsx handleStartFromHome`](../../react/src/modules/editing/App.tsx#L400-L408) 의 `seededVisibility` 객체에 매핑 추가
> 5. [`utils/additionalInfo.getAdditionalInfoIcon/DisplayText`](../../react/src/modules/editing/utils/additionalInfo.ts) 에 아이콘/표시 텍스트 케이스 추가
>
> 한 곳이라도 누락하면 "체크박스는 있는데 canvas 에 안 그려짐" 또는
> 반대의 불일치가 발생한다.

---

## 4. 라이프사이클 effect 8개

이 모듈은 `useEffect` 에 "연쇄 반응" 을 의도적으로 심어 놓았다. 각각의 목적:

1. **초기 bootstrap 로드** — `fetchBootstrap()` → templates + recommendations
   세팅, 첫 번째 템플릿으로 elements 복제.
2. **Bridge payload 해석** — `readEditingBridgePayload()`. payload 없으면
   `VITE_INITPAGE_URL` 로 리다이렉트. StrictMode 이중 mount 대비 `bridgeResolved`
   플래그로 멱등 보장.
3. **queuedBackgroundGeneration** — gradient/pastel 로 모드 변경 시 80ms 지연
   후 `handleGenerateBackgrounds()` 호출.
4. **Initial background sync** — AI 모드가 아닐 때 `buildInitialBackgroundCandidate`
   로 즉시 단일 후보를 만들고 선택. `suspendInitialBackgroundSyncRef` 가
   true 이면 한 틱만 스킵(초기 전환용).
5. **Auto slogan** — `mainSlogan` 이 비어있고 prompt source 가 있을 때 250ms
   debounce 로 `handleGenerateSlogan()`. `autoCopyKeyRef` 로 중복 호출 방지.
6. **Right panel 모드 자동 전환** — gradient/pastel 선택 시 `rightPanelMode`
   를 'background' 로.

(나머지는 selection 정리, 크기 재계산 등 보조.)

> **상세 로직**: 23개 state + 4 ref + 4 useMemo + 6 useEffect 연쇄, 4가지
> cascade 시나리오(진입 seed, background 모드 변경, mainSlogan 타이핑, info
> 토글), stale state/누락 deps/nested setState 등 타이밍 함정은
> [03a_editing_state_chain.md](03a_editing_state_chain.md) 참조.

---

## 5. 핵심 utils — editorFlow.ts (1236 L)

이 파일은 "EditorElement 파이프라인" 이다. export 목록:

| 함수 | 역할 |
|------|------|
| `getDefaultZonePositions(draftIndex)` | Type 0-3 별 store/slogan/details/summary 기본 좌표 |
| `createElementsFromWireframe(data, visibility)` | wireframe + projectData → EditorElement[] 생성 (제품 N개 + 텍스트 4 + 부가정보) |
| `mapProjectDataToTemplate(template, data)` | 템플릿의 placeholder 텍스트를 실제 값으로 치환 |
| `applyDraftLayoutVariant(elements, data, prevDraft, nextDraft)` | Type 전환 시 요소 위치/크기 재계산 (~170 L) |
| `applyDraftTypographyVariant(elements, data)` | Type 별 폰트/크기/색 프리셋 적용 |
| `applyElementVisibilityRules(templateId, elements, mode, data)` | mode 별 요소 hidden 결정 |
| `updateProjectTextElements(elements, data)` | storeName / mainSlogan / details / summary 텍스트 동기화 |
| `computeFooterPresets(...)` | footer 영역(summary/지도 등) placement preset |
| `createAdditionalInfoElements(data, visibility)` | 주차·반려동물 등 아이콘+텍스트 쌍 생성 |
| `createCustomTextElement(label)` | 사용자 "텍스트 추가" |
| `createCustomImageElement(url, label)` | 사용자 "이미지 추가" |
| `buildGuideSummary(data, template)` | AI 배경 프롬프트에 쓰일 한 줄 요약 빌드 |
| `shouldShowAdditionalInfoIcon/Text` | 부가정보 표시 판단자 (visibility + projectData 병합) |
| `isPrimaryImageElement(el)` | 주 배경 이미지 엘리먼트 판별 |
| `slugInfoLabel(label)` | 한글 라벨 → slug |
| `additionalInfoLabels` | 상수 배열(7개 한국어 레이블 — `additionalInfoVisibility` key 규약의 출처. § 3.2) |

이 파일은 **"layout + typography + visibility + text sync"** 네 축이 섞여 있어
크다. 분리 리팩터 후보지만, 현재는 App.tsx 가 이 API 를 전부 직접 import 해서
사용하기 때문에 파일 경계 유지가 비교적 값싸다.

> **상세 로직**: 각 함수의 입출력, 4 축 교차, Footer 동적 계산, id 규약 등은
> [04a_editor_flow_detail.md](04a_editor_flow_detail.md) 참조.

### 5.1 레이아웃 엔진 위치 분리

wireframe 치수 계산(slot → %좌표) 은 **`utils/wireframeLayout.ts`** 가 담당.
`editorFlow.createElementsFromWireframe` 가 이것을 호출한다:

```
createElementsFromWireframe(data, visibility)
  └─ computeWireframeProductPlacements(data)
       ├─ Type 3 → computeType3PairLayout(...)
       └─ Type 4 → computeType4HalfCropLayout(...)
```

자세한 내용은 [04_wireframe_engine.md](04_wireframe_engine.md).

---

## 6. Components

### 6.1 EditorCanvas.tsx (280 L)

책임: `renderElements` 순회 → DOM 으로 그리기 + pointer 이벤트.

핵심 기능:
- **Drag / Resize / Rotate** — 각 엘리먼트의 corner/edge 핸들을 직접 렌더하고
  `pointerdown` → `pointermove` loop 로 `x/y/width/height/rotation` 을 업데이트.
- **Multi-select** — Shift-click 시 `selectedElementIds` 에 append.
- **Keyboard** — 화살표로 1px(또는 %환산) 이동, Delete 로 삭제, Esc 로 선택 해제.
- **Canvas 치수** — `projectData.options.ratio` 를 `ratioToAspectValue` 로 변환해
  `aspect-ratio` CSS 로 적용. width 는 100% (부모 컨테이너 폭 기반).
- **Background rendering** — `selectedBackground.cssBackground` / `imageUrl` 를
  캔버스 하단 레이어에 그림.

### 6.2 BackgroundCard.tsx (134 L)

미니 preview 카드. 작은 포스터를 그리고 클릭 시 `onSelect(id)`. 선택 상태는
파란 테두리로. Type 4 half-crop 과 같은 복잡 레이아웃도 이 카드 안에서 동일한
`computeWireframeProductPlacements` 결과를 재사용해 렌더한다 — 즉 메인
프리뷰와 **동일 공식**을 따르는 참조 구현.

### 6.3 WireframeChoiceCard.tsx (205 L)

Type 0-3 구도 선택용 카드. 4장의 카드가 나열되고, 각 카드는
`REFERENCE_CANVAS_WIDTH` (기본 240px) 로 렌더한 뒤 `transform: scale(...)` 로
실 프리뷰 폭에 맞춘다.

> **주의**: 이 카드 내부의 Type 4 렌더링은 historically `HalfCropGroupLayout`
> + `computeSlotStyle` 조합을 쓴다 — 즉 **init 측 레이아웃 엔진을 사용**. 이
> 때문에 2026-04-17 의 Type 4 버그가 main preview 와 어긋났고, Option 2
> 격리 패치로 해결되었다. 자세한 내용은
> [doc/0417/wireframe_choice_card_type4_fix.md](../0417/wireframe_choice_card_type4_fix.md)
> 와 [04_wireframe_engine.md § 6](04_wireframe_engine.md).

### 6.4 Sidebar.tsx + sidebar/*

`Sidebar.tsx` 는 7개의 `SidebarBlock` 을 세로로 쌓는 얇은 dispatcher. 각
서브 섹션은 자기 상태를 `App.tsx` 에 prop 으로 올려보낸다.

| 섹션 | 역할 | 핵심 API |
|------|------|----------|
| `BackgroundOptionsSection` | 모드·컬러·프롬프트 입력 | `onModeChange`, `onPromptChange`, `onGenerate` |
| `AdInfoSection` | 매장명·슬로건·상세·정보 텍스트 | `applyProjectTextField` |
| `AddElementSection` | 텍스트/이미지 추가 | `createCustomTextElement/Image` |
| `AdditionalInfoSection` | 부가정보 토글 (7개 한국어 레이블) | `handleToggleInfoItem(label)` → `toggleAdditionalInfoElements` |
| `RecommendationsSection` | 추천 팁 표시 | `bootstrap.sidebarRecommendations` |
| `ElementInfoPanels` | 선택된 엘리먼트 상세 편집 | `updateElement` |
| `backgroundTokens` | `BG_SOLID(...)` 등 prompt 토큰 파서 | internal |

`ElementInfoPanels` 가 가장 크다(224 L) — text / image / shape 세 종류별로
서로 다른 폼을 렌더.

---

## 7. Background 생성 파이프라인

```
 Sidebar "AI 배경 생성" 클릭
  └─ handleGenerateBackgrounds()
       ├─ promptKo ← buildBackgroundPrompt(data, hint, colorDraft)
       ├─ guideImage ← captureElementAsDataUrl(mainPreviewRef)
       ├─ guideSummary ← buildGuideSummary(data, template)
       └─ for variant in BACKGROUND_VARIANTS[0..GENERATE_VARIANT_COUNT]
              └─ generateBackgroundCandidates({ ... , variant.style })
                    ├─ callApi.adCopy(...)        — 문구 생성
                    ├─ callApi.imageGen(...)      — SD3.5 이미지
                    ├─ buildAiCandidate(res, variant, idx)
                    └─ blobUrl → setBackgroundCandidates(...)
```

`backgroundGeneration.ts` (400 L) 는 다음을 캡슐화한다:
- 프롬프트 build (한글 → server 측 GPT 번역)
- negative prompt 기본값
- SD3.5 호출 → Blob URL → `BackgroundCandidate`
- 실패/타임아웃 처리 (fallback 없음, 에러 전파)

---

## 8. Product image prebake

Type 3/4 는 **원본 이미지의 naturalAR** 과 **좌/우 절반 PNG dataURL** 이 사전에
필요하다. `productImagePrebake.ts`:

```ts
export async function prebakeProductImages(
  products: HomeProductInput[]
): Promise<HomeProductInput[]>
```

각 product 에 대해 `prebakeSingleProductImage()` 를 병렬로 돌려
`imageLeftHalf`, `imageRightHalf`, `imageNaturalWidth/Height` 를 채운다. 실패한
제품은 원본 그대로 반환 + console.warn (전체 실패하지 않도록).

App.tsx 는 `isPrebakingImages` 오버레이로 완료까지 본 화면을 가리고, 편집 중
특정 제품만 갱신되면 `prebakingProductIds` set 으로 로컬 인디케이터만 표시.

---

## 9. Export 경로 — exportPoster.ts (370 L)

`exportPosterAsBlob({ captureRef, ratio, templateId, ... })` 는 다음을 한다:

1. `waitForImages(root)` — 모든 `<img>` 로딩 await.
2. html2canvas 로 DOM 을 2x scale 캡처.
3. `ratio` 에 맞춰 crop/resize.
4. PNG Blob 반환.

그 후 App.tsx 는 이 Blob 을 `adverApi.saveResult(...)` 로 업로드하거나
로컬 다운로드 링크를 만든다. `saving` 플래그가 이 전체 과정을 감싼다.

---

## 10. Types 지도

```
types/editor.ts  ──────  barrel
      │
      ├─ editor-core.ts  ─── EditorElement, ElementKind, EditorStep,
      │                       BackgroundMode, TemplateDefinition,
      │                       SidebarRecommendation
      ├─ home.ts         ─── HomeProjectData, HomeProductInput,
      │                       HomeProjectOptions, HomeAdditionalInfo,
      │                       ZonePosition / ZonePositions, ProductTransform
      └─ api.ts          ─── BackgroundCandidate, BootstrapResponse,
                              Generate/RemoveBackground Request/Response
```

`HomeProjectData` 는 **init→edit bridge 의 계약 포맷**이기도 하다. 변경 시
`modules/initPage/utils/editingBridge.js` 와 쌍으로 수정 필요.

---

## 11. API / config / data

- **`api/client.ts`** — 3줄짜리 파사드. 내부적으로 `getBootstrapData()`
  (정적 데이터) 와 `generateBackgroundCandidates()` (network) 를 호출.
  서버 호출은 `server/api/callApi` 를 통해 이뤄진다 → 05 보고서.
- **`data/bootstrap.ts`** (203 L) — 개발 전용 하드코딩 템플릿/팁. 실서버 연동 전
  프리뷰 용도. 여기서 시드되는 `TemplateDefinition[]` 이 EditorCanvas 의 초기
  `elements` 를 결정한다.
- **`config/remoteApi.ts`** — `VITE_REMOTE_API_BASE` env 를 읽어 production 과
  dev(`/addhelper` 프록시) 를 분기. 한 줄 설정.

---

## 12. InitPage ↔ Editing 경계 (요약)

InitPage 는 `HomeProjectData` 를 만들어서 세 경로로 전달한다:

1. **URL Token**: `/editing?token=<id>` → editing 측에서 `adverApi.getPayload(id)` 로 복원
2. **sessionStorage**: `editing-bridge-payload` 키
3. **window.name**: 폴리필

editing 측 `editingBridge.ts.readEditingBridgePayload()` 가 우선순위대로 읽고,
모두 실패하면 `window.location.replace(VITE_INITPAGE_URL)`. 이 프로토콜의
상세는 [07_bridge.md](07_bridge.md).

---

## 13. 변경 포인트 가이드

| 변경 목적 | 주 수정 파일 | 주의사항 |
|-----------|---------------|---------|
| 새 `BackgroundMode` 추가 | `types/editor-core.ts` + `App.tsx` 분기 + `BackgroundOptionsSection` + `backgroundGeneration.ts` | `applyElementVisibilityRules` 에도 mode 케이스 추가 |
| 새 wireframe Type 추가 | `wireframeLayout.ts` + `editorFlow.applyDraftLayoutVariant` + `WireframeChoiceCard` + init 측 layout | [04_wireframe_engine.md](04_wireframe_engine.md) 참조 |
| AI 프롬프트 토큰 신설 | `BackgroundOptionsSection` · `sidebar/backgroundTokens.ts` · App.tsx `buildPromptHintWithColorDraft` | regex `BG_(SOLID\|GRADIENT\|MULTI)` 업데이트 |
| 새 부가정보 라벨 | `editorFlow.additionalInfoLabels` + `types/home.HomeAdditionalInfo` (`view*` + 데이터 필드) + `initPage/utils/editingBridge.buildEditingPayload` (`viewX: Boolean(...)`) + `App.tsx handleStartFromHome` 의 `seededVisibility` 매핑 + `AdditionalInfoSection` + `additionalInfo.getAdditionalInfoIcon/DisplayText` | § 3.2-3.3 참조. 5곳 동시 수정 필요. 아이콘 매핑 누락 시 자동 fallback 없음 |
| Export 포맷 변경 | `exportPoster.ts` + `App.tsx.handleExport` | `captureRef` scale 변경 시 텍스트 선명도 주의 |
| Bootstrap 템플릿 교체 | `data/bootstrap.ts` | `App.tsx` 초기 `setSelectedTemplateId(data.templates[0].id)` 의존 |

---

## 14. 테스트 관점 체크리스트

- [ ] `/editing?token=...` 진입 후 오버레이(`isPrebakingImages`) 가 종료되는가.
- [ ] StrictMode 이중 mount 에서도 `bridgeResolved` 플래그가 한 번만 트리거되는가.
- [ ] `backgroundMode` 를 solid→gradient→ai-image 로 전환했을 때 후보 배경이
      각각 올바르게 재생성되는가.
- [ ] WireframeChoiceCard 에서 Type 전환 시 `handleSelectWireframeType` 가
      `createElementsFromWireframe` 로 elements 를 전면 교체하는가. (부분 업데이트
      아님)
- [ ] `handleSelectWireframeType` 이후 `zonePositions` 가 새 draftIndex 기준으로
      갱신되는가 (`getDefaultZonePositions`).
- [ ] 제품 이미지 교체 후 `prebakeSingleProductImage` 완료 전에 Type 4 렌더가
      깨지지 않는가. (prebake 미완료 → `imageLeftHalf` 없음 → fallback 경로 확인)
- [ ] exportPoster 결과 PNG 가 `projectData.options.ratio` 비율과 일치하는가.

---

## 15. 관련 경로

- 모듈 루트: [modules/editing/](../../react/src/modules/editing/)
- 진입: [App.tsx](../../react/src/modules/editing/App.tsx)
- 레이아웃 엔진: [utils/wireframeLayout.ts](../../react/src/modules/editing/utils/wireframeLayout.ts), [utils/editorFlow.ts](../../react/src/modules/editing/utils/editorFlow.ts)
- 하위 보고서: [04_wireframe_engine.md](04_wireframe_engine.md), [05_server_api.md](05_server_api.md), [07_bridge.md](07_bridge.md)
