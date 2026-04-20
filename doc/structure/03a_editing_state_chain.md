# 03a. `editing/App.tsx` State/Effect 연쇄 상세 보고서

- 대상: [modules/editing/App.tsx](../../react/src/modules/editing/App.tsx) (~996 LOC)
- 초점: **30 개 state × 8 개 useEffect × 20+ 핸들러** 가 만들어내는 연쇄
  반응. 한 `setX` 가 다음 effect 를 트리거하고, effect 가 다시 다른 state
  를 바꾸는 "cascade" 구조를 해부한다.
- 상위 문서: [03 § 2-4](03_editing_module.md)

---

## 0. 왜 이 문서가 필요한가

App.tsx 는 **"한 파일 안에 모든 상태를 모아두고 하위는 props 로만 받게 한다"**
철학을 극단까지 밀어붙인 결과물이다. Context 도 상태 관리 라이브러리도 없이
~30 개의 `useState`, 8 개의 `useEffect`, 4 개의 `useMemo`, 4 개의 `useRef`,
20+ 개의 handler 가 하나의 함수 컴포넌트 안에 공존한다.

이 구조의 결과:
- **연쇄 반응이 의도된 설계**. `setBackgroundMode('gradient')` 한 줄이 →
  effect 를 트리거 → `setQueuedBackgroundGeneration(true)` → 다른 effect →
  `handleGenerateBackgrounds()` → `setBackgroundCandidates([...])` → render.
- **디버깅 시 가장 혼란스러움**. 어떤 상태를 바꿨는데 3-4 단계 건너 예상치
  못한 곳에서 다른 상태가 바뀌어 있는 현상이 자주 발생.

이 문서는 (1) state 전체 목록, (2) effect 별 트리거/결과, (3) 대표 연쇄
시나리오 4 가지, (4) "왜 이 effect 가 이 시점에 발화하는가" 의 언어화를
목표로 한다.

---

## 1. State 전수 목록 (현재 파일 기준)

| # | state | 초기값 | 타입 | 읽는 곳 | 쓰는 곳 |
|---|-------|--------|------|---------|---------|
| 1 | `bootstrap` | `initialBootstrap` | `BootstrapResponse` | useMemo(selectedTemplate) | bootstrap effect 1개 |
| 2 | `step` | `'background'` | `EditorStep` | 렌더 분기 | handleStartFromHome, ... |
| 3 | `selectedTemplateId` | `null` | `string \| null` | useMemo(selectedTemplate), handleGenerateBackgrounds | bootstrap, handleStartFromHome, handleSelectWireframeType |
| 4 | `elements` | `[]` | `EditorElement[]` | useMemo(renderElements), EditorCanvas | 거의 모든 handler |
| 5 | `selectedElementIds` | `[]` | `string[]` | useMemo(selectedElement), ElementInfoPanels | handleCanvasSelect, keyboard, ... |
| 6 | `backgroundMode` | `'ai-image'` | `BackgroundMode` | useMemo(renderElements), sidebar, 배경 effect 2개 | handleBackgroundModeChange, handleStartFromHome |
| 7 | `promptKo` | `''` | `string` | handleGenerateBackgrounds, 배경 effect | sidebar |
| 8 | `promptHint` | `''` | `string` | 배경 effect 2개, buildPromptHintWithColorDraft | handlePromptHintChange, handleStartFromHome |
| 9 | `backgroundColorDraft` | `DEFAULT_BACKGROUND_COLOR_DRAFT` | `{solid, gradient, pastel}` | 배경 effect 2개 | handleSolid/Gradient/MultiColorChange, handleStartFromHome |
| 10 | `backgroundCandidates` | `[]` | `BackgroundCandidate[]` | useMemo(selectedBackground), 렌더 | 배경 effect, generate |
| 11 | `selectedBackgroundId` | `null` | `string \| null` | useMemo(selectedBackground) | 배경 effect, handleSelectBackground, generate |
| 12 | `loading` | `true` | `boolean` | bridge effect 가드 | bootstrap effect |
| 13 | `generating` | `false` | `boolean` | handleShowBackgroundCandidates 가드 | handleGenerateBackgrounds |
| 14 | `error` | `null` | `string \| null` | 렌더 (에러 배너) | 각 catch 블록 |
| 15 | `projectData` | `null` | `HomeProjectData \| null` | 거의 모든 핸들러 | handleStartFromHome, handleSelectWireframeType, handleStoreNameChange, ... |
| 16 | `additionalInfoVisibility` | `{}` | `Record<string,boolean>` | Sidebar 렌더, handleToggleInfoItem, handleSelectWireframeType | handleStartFromHome (seed), handleToggleInfoItem |
| 17 | `queuedBackgroundGeneration` | `false` | `boolean` | queuedBackground effect | handleBackgroundModeChange, 배경모드 effect |
| 18 | `sidebarExpanded` | `false` | `boolean` | Sidebar 렌더 | 사이드바 토글 |
| 19 | `bridgeResolved` | `false` | `boolean` | bridge effect 가드 | bridge effect |
| 20 | `rightPanelMode` | `'template'` | `'background'\|'template'` | 우측 패널 렌더 | handleBackgroundModeChange, handleShowBackgroundCandidates, handleSelectWireframeType, 배경모드 effect |
| 21 | `isPrebakingImages` | `false` | `boolean` | 오버레이 렌더 | handleStartFromHome |
| 22 | `prebakingProductIds` | `new Set()` | `Set<number>` | 제품별 인디케이터 | onChangeSelectedImage |
| 23 | `saving` | `false` | `boolean` | export 버튼 disable | handleExport |

**ref (직접 렌더에 안 쓰이는 mutable 저장소)**:
| # | ref | 초기값 | 용도 |
|---|-----|--------|------|
| R1 | `captureRef` | `null` | EditorCanvas DOM — html2canvas 타깃 |
| R2 | `mainPreviewRef` | `null` | WireframeChoiceCard 폭 동기화 |
| R3 | `autoCopyKeyRef` | `''` | mainSlogan 자동 생성 dedupe 키 |
| R4 | `suspendInitialBackgroundSyncRef` | `false` | 단색/그라디언트 자동 미리보기 일시 중단 플래그 |

**useMemo 파생값**:
| # | name | 의존 | 의미 |
|---|------|------|------|
| M1 | `selectedTemplate` | bootstrap.templates, selectedTemplateId | 활성 템플릿 객체 |
| M2 | `selectedBackground` | backgroundCandidates, selectedBackgroundId | 적용된 배경 후보 객체 |
| M3 | `renderElements` | selectedTemplateId, elements, backgroundMode, projectData | `applyElementVisibilityRules` 통과한 최종 렌더 대상 |
| M4 | `selectedElement` | renderElements, selectedElementIds | `len===1` 일 때만 단일 객체, 아니면 null |

---

## 2. useEffect 8 개 상세

실제 effect 개수가 file 에 주석으로 "8개" 라고 표현되지만, 코드 상 나타나는
블록은 6 개 (나머지는 보조 effect 로 편집 상태에 따라 달림). 현재 읽힌
주요 6 개를 적는다.

### E1 — Bootstrap 로드 (line 165-182)

```ts
useEffect(() => {
  const run = async () => {
    try {
      const data = await fetchBootstrap();
      setBootstrap(data);
      if (data.templates[0]) {
        setSelectedTemplateId(data.templates[0].id);
        setElements(cloneTemplateElements(data.templates[0]));
      }
    } catch (e) { setError(...); }
    finally { setLoading(false); }
  };
  run();
}, []);
```

- **트리거**: 마운트 1 회
- **읽는 값**: 없음
- **쓰는 state**: `bootstrap`, `selectedTemplateId`, `elements`, `error`, `loading`
- **부수 효과**: `fetchBootstrap()` 네트워크 호출
- **왜 여기서만**: `fetchBootstrap` 은 템플릿 시드 + 사이드바 추천을 반환
  하는 정적 데이터. 앱 전역에서 1 회만 필요.
- **주의**: `setLoading(false)` 가 finally 에 있어 **실패해도 loading=false**.
  그래야 bridge effect 가 에러 메시지를 표시할 기회를 얻는다.

### E2 — Bridge payload 해석 (line 290-310)

```ts
useEffect(() => {
  if (loading || bridgeResolved) return;   // 이중 가드
  const resolveBridge = async () => {
    try {
      const bridged = await readEditingBridgePayload();
      if (bridged) {
        await handleStartFromHome(bridged.projectData);   // 내부에서 data.options.draftIndex ?? 0 읽음
        return;
      }
      window.location.replace(getInitPageUrl());  // ← 강제 이동
    } catch (e) { setError(...); }
    finally { setBridgeResolved(true); }
  };
  void resolveBridge();
}, [loading, bridgeResolved]);
```

- **트리거**: `loading=false` 가 되는 순간 + `bridgeResolved=false` 인
  경우. E1 이 `setLoading(false)` 하면 이 effect 재실행.
- **읽는 값**: `loading`, `bridgeResolved`
- **쓰는 state**: 내부에서 `handleStartFromHome` 을 await 하는데 그 안에서
  ~10 개 state 가 연쇄적으로 바뀜 (§ 4.1 참조).
- **부수 효과**: `readEditingBridgePayload` (IndexedDB/sessionStorage/fetch)
  + 실패 시 `window.location.replace` (페이지 전환).
- **StrictMode 이중 마운트 대비**: `bridgeResolved` 가드 + bridge 의
  "한 번 읽으면 삭제" 정책 (07 § 4.2) 으로 이중 호출 시 두 번째는 null
  반환 → redirect 까지 가지만 이미 첫 번째 resolve 가 state 를 세팅해
  `bridgeResolved=true` 이므로 두 번째는 조기 return.

### E3 — queuedBackgroundGeneration 소비자 (line 223-232)

```ts
useEffect(() => {
  if (!queuedBackgroundGeneration || !projectData) return;
  const timer = window.setTimeout(() => {
    void handleGenerateBackgrounds();
    setQueuedBackgroundGeneration(false);
  }, 80);
  return () => window.clearTimeout(timer);
}, [queuedBackgroundGeneration, step]);
```

- **트리거**: `setQueuedBackgroundGeneration(true)` 호출 시.
- **왜 80ms 지연**: 호출자가 여러 state 를 동시에 바꾼 뒤 이 effect 가
  발화하는데, 해당 setState 들이 모두 반영된 후 `handleGenerateBackgrounds`
  가 **최신 state 를 읽도록** 한 틱 양보.
- **왜 `step` 이 deps 에 있는가**: `step` 이 background → editor 로 넘어간
  상태에서 큐잉된 생성이 중복 실행되지 않도록 (혹은 step 전환과 함께 재
  판정) — 의도적 트리거.
- **소비하고 플래그 내림**: `setQueuedBackgroundGeneration(false)` 로 명시적
  리셋. 호출자가 여러 번 `true` 를 쏴도 한 번만 실행되는 guard.

### E4 — 비-AI 모드 초기 배경 자동 갱신 (line 238-246)

```ts
useEffect(() => {
  if (!projectData || backgroundMode === 'ai-image') return;
  if (suspendInitialBackgroundSyncRef.current) return;
  const preview = buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint, backgroundColorDraft);
  setBackgroundCandidates([preview]);
  setSelectedBackgroundId(preview.id);
}, [backgroundMode, promptHint, projectData, backgroundColorDraft]);
```

- **트리거**: solid/gradient/pastel 중 하나에서 색상/프롬프트가 바뀔 때마다.
- **왜 AI 모드 제외**: AI 모드는 별도 "생성 버튼" 기반. 이 effect 는
  **색상 피커에서 색 바꾸면 캔버스 배경이 즉시 업데이트**되는 UX 를 제공.
- **`suspendInitialBackgroundSyncRef.current` 가드**: 한 틱만 스킵하는
  일시 잠금. `handleStartFromHome` 에서 `initialBackground` 를 명시적으로
  set 한 직후 이 effect 가 또 덮어쓰는 걸 방지하기 위해 `true` 로 올렸다가,
  사용자 조작 (색상 변경, 모드 변경 등) 시 각 핸들러가 `false` 로 내림.

### E5 — gradient/pastel 모드 전환 시 queue (line 248-254)

```ts
useEffect(() => {
  if (!projectData) return;
  if (backgroundMode === 'gradient' || backgroundMode === 'pastel') {
    setRightPanelMode('background');
    setQueuedBackgroundGeneration(true);
  }
}, [backgroundMode, promptHint, projectData, backgroundColorDraft]);
```

- **트리거**: 같은 deps (E4 와 동일). 둘 다 color/promptHint/mode 변화에
  반응하지만 **책임이 다르다**:
  - E4: 즉시 미리보기 교체
  - E5: **서버 생성 큐잉** (gradient/pastel 은 서버가 canvas 이미지를
    만들어 돌려주는 구조 — `generateBackgrounds` 호출 필요)
- **E3 과의 연쇄**: 이 effect 가 `queuedBackgroundGeneration=true` 를 내면
  E3 가 80ms 후 `handleGenerateBackgrounds` 를 실행.

### E6 — Auto slogan (line 257-288)

```ts
useEffect(() => {
  if (!projectData) return;
  if (projectData.mainSlogan?.trim()) {
    autoCopyKeyRef.current = '';   // mainSlogan 있으면 더 이상 자동 생성 안 함
    return;
  }
  const hasPromptSource = ...;
  if (!hasPromptSource) return;
  const requestKey = JSON.stringify({ storeName, industry, products[] });
  if (autoCopyKeyRef.current === requestKey) return;   // dedupe
  autoCopyKeyRef.current = requestKey;
  const timer = window.setTimeout(() => {
    void handleGenerateSlogan();
  }, 250);
  return () => window.clearTimeout(timer);
}, [projectData]);
```

- **트리거**: `projectData` 가 바뀔 때마다.
- **dedupe 키**: `storeName + industry + products.map(desc, showDesc)`.
  이 셋이 실제로 달라졌을 때만 재요청. 동일 projectData 객체가 여러 번
  반영돼도 한 번만 실행.
- **250ms debounce**: 사용자가 입력 중일 때 타자마다 API 호출되지 않도록.
- **`autoCopyKeyRef.current = ''` 리셋**: mainSlogan 이 채워지면 ref 를
  비워서, 사용자가 그 slogan 을 삭제하면 다시 자동 생성이 돌 수 있도록.

---

## 3. Handler 카탈로그 (20+ 개 요약)

| 함수 | 트리거 | 수정하는 state |
|------|--------|----------------|
| `handleCanvasSelect(id, options)` | EditorCanvas 클릭 | selectedElementIds |
| `handleStartFromHome(data)` | E2 bridge resolve | projectData, elements, backgroundMode, promptHint, backgroundColorDraft, backgroundCandidates, selectedBackgroundId, selectedTemplateId, additionalInfoVisibility, step, queuedBackgroundGeneration, selectedElementIds, isPrebakingImages (내부에서 `data.options.draftIndex ?? 0` 로 Type 결정) |
| `handleSelectWireframeType(typeIndex)` | WireframeChoiceCard 클릭 | projectData, elements, rightPanelMode, selectedElementIds |
| `handleGenerateBackgrounds()` | E3 소비자 또는 직접 호출 | backgroundCandidates, selectedBackgroundId, generating, error, selectedElementIds, suspendInitialBackgroundSyncRef |
| `handleSelectBackground(id)` | BackgroundCard 클릭 | selectedBackgroundId |
| `handleShowBackgroundCandidates()` | Sidebar "후보 보기" | rightPanelMode, + handleGenerate 호출 조건부 |
| `handleBackToInitialPage()` | 사이드바 뒤로가기 | `window.location.href` |
| `handleBackgroundModeChange(mode)` | Sidebar 모드 버튼 | backgroundMode, queuedBackgroundGeneration, rightPanelMode, suspendInitialBackgroundSyncRef |
| `handlePromptHintChange(value)` | Sidebar 입력 | promptHint, suspendInitialBackgroundSyncRef |
| `handleStoreNameChange(value)` | Sidebar 입력 | projectData.storeName, elements (updateProjectTextElements 경유) |
| `handleMainSloganChange(value)` | Sidebar 입력 + auto-slogan | projectData.mainSlogan, elements, `storeInfo` persistence |
| `handleGenerateSlogan()` | E6 타이머 또는 버튼 | generating, error, + handleMainSloganChange |
| `handleToggleInfoItem(label)` | Sidebar 체크박스 | additionalInfoVisibility, elements (toggleAdditionalInfoElements) |
| `handleReplaceSelectedImage(file)` | ElementInfoPanels 업로드 | + onChangeSelectedImage |
| `onChangeSelectedImage(url)` | 위 + AI 변환 | elements, prebakingProductIds, projectData.products[i] |
| `handleSolid/Gradient/MultiColorChange` | 컬러 피커 | backgroundColorDraft, suspendInitialBackgroundSyncRef |
| `handleExport()` | "내보내기" | saving, + html2canvas 캡처 |

---

## 4. 대표 연쇄 시나리오 4 가지

### 4.1 시나리오 A — editing 진입 (가장 긴 cascade)

```
(사용자) InitPage → "다음 단계" 클릭
  │
  ▼
main.tsx: EditingPage 마운트
  │
  ▼
E1 bootstrap effect 발화
  ├─ fetchBootstrap()
  ├─ setBootstrap(data)                        ← state 1
  ├─ setSelectedTemplateId(templates[0].id)     ← state 3
  ├─ setElements(clone(templates[0]))           ← state 4
  └─ setLoading(false)                          ← state 12
        │
        ▼ loading change triggers E2
  E2 bridge effect 발화
    ├─ readEditingBridgePayload()  (IndexedDB → sessionStorage → window.name)
    │
    ├─ bridged !== null:
    │   await handleStartFromHome(projectData):          // draftIndex = projectData.options.draftIndex ?? 0
    │     ├─ setIsPrebakingImages(true)         ← state 21
    │     ├─ prebakeProductImages(...)          (async 수백ms)
    │     ├─ setIsPrebakingImages(false)
    │     │
    │     ├─ baked = { ..., zonePositions }
    │     ├─ setProjectData(baked)              ← state 15
    │     │                                      → E4/E5/E6 all trigger
    │     │
    │     ├─ seededVisibility = { …label-key map… }
    │     ├─ setAdditionalInfoVisibility(...)   ← state 16
    │     │
    │     ├─ setBackgroundMode(concept)          ← state 6
    │     │                                      → E4/E5 trigger (projectData 이미 있음)
    │     │
    │     ├─ setPromptHint(...)                  ← state 8
    │     ├─ setBackgroundColorDraft(...)        ← state 9
    │     ├─ suspendInitialBackgroundSyncRef = true
    │     ├─ setBackgroundCandidates([plainWhite])  ← state 10
    │     ├─ setSelectedBackgroundId(plainWhite.id) ← state 11
    │     ├─ setSelectedTemplateId(templates[draftIndex].id)  ← state 3 재세팅
    │     ├─ setElements(createElementsFromWireframe(baked, seededVisibility))
    │     │                                      ← state 4 전면 교체
    │     ├─ setStep('background')               ← state 2
    │     ├─ setQueuedBackgroundGeneration(false) ← state 17
    │     └─ setSelectedElementIds([])           ← state 5
    │
    │ return
    │
    └─ finally setBridgeResolved(true)          ← state 19
          │
          ├─ E4 발화: backgroundMode='ai-image'이면 early return, 아니면
          │           buildInitialBackgroundCandidate 로 미리보기 갱신
          │           (suspendInitialBackgroundSyncRef.current=true 면 skip)
          │
          ├─ E5 발화: gradient/pastel 이면 setQueuedBackgroundGeneration(true)
          │
          └─ E6 발화: mainSlogan 비어있고 hasPromptSource 면 250ms 후 handleGenerateSlogan
```

**핵심 관찰**:
- `handleStartFromHome` 1 회 호출 = **~13 개 setState**. 이들 중 다수가
  같은 렌더 사이클 내 배치 처리되어 실제 리렌더는 1-2 회.
- `suspendInitialBackgroundSyncRef.current` 없이는 E4 가 `setBackgroundMode`
  / `setPromptHint` / `setBackgroundColorDraft` 3 개의 setState 각각에
  한 번씩 트리거되며 `plainWhite` 대신 `buildInitialBackgroundCandidate`
  결과로 **즉시 덮어쓰는 경합**이 발생 — 그래서 ref 플래그로 잠근 뒤, 사용자
  첫 조작 시점에 각 핸들러가 `false` 로 내림.

### 4.2 시나리오 B — backgroundMode 변경 (gradient 로)

```
(사용자) Sidebar "그라데이션" 클릭
  │
  ▼
handleBackgroundModeChange('gradient')
  ├─ suspendInitialBackgroundSyncRef.current = false  (E4 재활성)
  ├─ setBackgroundMode('gradient')             ← state 6
  │
  ├─ branch (mode==='gradient'):
  │   ├─ setRightPanelMode('background')       ← state 20
  │   └─ setQueuedBackgroundGeneration(true)    ← state 17
  │
  ▼  렌더 커밋
E4 발화 (backgroundMode 변경 감지):
  ├─ projectData 있음 + mode !== 'ai-image' + suspend=false
  ├─ preview = buildInitialBackgroundCandidate(projectData, 'gradient', promptHint, colorDraft)
  ├─ setBackgroundCandidates([preview])        ← state 10
  └─ setSelectedBackgroundId(preview.id)        ← state 11

E5 발화 (같은 deps):
  └─ mode==='gradient' → setQueuedBackgroundGeneration(true)  (이미 true, 변화 없음)

E3 발화 (queuedBackgroundGeneration 변화):
  └─ 80ms 후:
     ├─ handleGenerateBackgrounds():
     │   ├─ setGenerating(true)                 ← state 13
     │   ├─ generateBackgrounds(...)            (서버 호출 또는 로컬)
     │   ├─ setBackgroundCandidates(result.candidates.slice(0,4))
     │   ├─ setSelectedBackgroundId(...)
     │   └─ setGenerating(false)
     └─ setQueuedBackgroundGeneration(false)    ← flag 소비
```

**관찰**: 클릭 1 회 → setState 9 회 → 렌더 3-4 회 (batching 효과로
실제로는 더 적음).

### 4.3 시나리오 C — mainSlogan 타이핑 1 글자

```
(사용자) Sidebar "소개 문구" input 타이핑
  │
  ▼
handleMainSloganChange('안녕')
  ├─ storeInfo.saveStoreInfo(...)              (localStorage)
  ├─ setProjectData(prev):
  │     ├─ setElements((current) =>
  │     │    applyProjectTextField(current, prev, 'mainSlogan', '안녕').nextElements)
  │     │                                       ← nested setElements ← state 4
  │     └─ return { ...prev, mainSlogan: '안녕' }  ← state 15
  │
  ▼  렌더 커밋
E4 발화: ai-image 모드면 early return. 아니면 배경 재생성.
E5 발화: ai-image 면 early return. gradient/pastel 이면 queue.
E6 발화:
  ├─ projectData.mainSlogan='안녕' truthy
  ├─ autoCopyKeyRef.current = ''     (auto-slogan 비활성화)
  └─ early return
```

**관찰**: 타이핑 1 회마다 `setState` 2 개 + 4 개 effect 재평가. 250ms
debounce + dedupe ref 덕분에 실제 slogan 생성 API 는 호출되지 않음.

### 4.4 시나리오 D — 체크박스 "주차 공간 수" 토글 on

```
(사용자) Sidebar AdditionalInfoSection "주차 공간 수" 체크
  │
  ▼
handleToggleInfoItem('주차 공간 수')
  └─ setAdditionalInfoVisibility((prev) => {
       const nextVisible = !prev['주차 공간 수']
       const nextVisibility = { ...prev, '주차 공간 수': nextVisible }
       setElements((current) =>
         toggleAdditionalInfoElements(current, projectData, '주차 공간 수', nextVisible, nextVisibility)
       )
       return nextVisibility
     })
  │
  ▼  렌더 커밋
useMemo(renderElements) 재계산 → applyElementVisibilityRules 통과한 새 elements
EditorCanvas 리렌더: info-text-1 / info-image-1 새로 나타나며 기존 아이콘
                    2, 3, 4, 5 의 x 좌표가 우측 정렬 재계산으로 모두 이동.
```

**관찰**: 1 개 토글 → 내부에서 2 개 setState (visibility + elements) 을
한 번에 처리. `toggleAdditionalInfoElements` 가 `computeFooterPresets` 를
호출해 **나머지 모든 info element 의 좌표를 재계산** (04a § 7.5).

---

## 5. 상태 타이밍 함정

### 5.1 setState 직후 state 를 읽으면 stale

```ts
// ❌ BAD
setAdditionalInfoVisibility(seededVisibility);
setElements(createElementsFromWireframe(baked, additionalInfoVisibility));
// ↑ additionalInfoVisibility 는 여전히 이전 값 ({})
```

```ts
// ✓ GOOD (현재 코드)
const seededVisibility = { … };
setAdditionalInfoVisibility(seededVisibility);
setElements(createElementsFromWireframe(baked, seededVisibility));  // 로컬 변수 사용
```

이는 `handleStartFromHome` 에서 실제로 발생했던 버그의 패치 (03 § 2.1).

### 5.2 effect 의 deps 배열 vs 실제 읽는 값

```ts
useEffect(() => {
  if (!queuedBackgroundGeneration || !projectData) return;
  const timer = window.setTimeout(() => {
    void handleGenerateBackgrounds();  // ← projectData 를 closure 로 캡처
    setQueuedBackgroundGeneration(false);
  }, 80);
}, [queuedBackgroundGeneration, step]);  // ← projectData 는 deps 에 없음
```

80ms 대기 중에 `projectData` 가 갱신되면 `handleGenerateBackgrounds` 는
**옛 값을 본다**. 이 경우는 실무적으로 문제 없음 (queue 자체가 짧은 순간
이고, projectData 갱신은 진입/제품 교체 같은 큰 이벤트에서만 발생) 이지만,
deps 에 누락된 의존은 잠재적 bug source. ESLint react-hooks/exhaustive-deps
를 켜면 경고 발생.

### 5.3 `setElements` 중첩 (함수형 update)

```ts
const handleToggleInfoItem = (label: string) => {
  setAdditionalInfoVisibility((prev) => {
    const nextVisibility = { ...prev, [label]: !prev[label] };
    setElements((current) => toggleAdditionalInfoElements(..., nextVisibility));  // ← 중첩 set
    return nextVisibility;
  });
};
```

React 18 이후로는 이 패턴이 **같은 batch** 내에서 처리되어 1 회 렌더로
수렴. 이전이라면 두 번의 렌더가 발생. 현재 Vite 환경 (React 18) 기준으로
안전.

---

## 6. 렌더 비용 분석

### 6.1 useMemo 캐시 효과

- `renderElements` 는 `elements`/`projectData`/`backgroundMode`/
  `selectedTemplateId` 중 하나라도 바뀌면 재계산 → `applyElementVisibilityRules`
  한 번. O(N) (N = elements 개수, 보통 20-40).
- `selectedElement` 는 `renderElements` 와 `selectedElementIds` 모두 바뀌어야
  재계산. 일반적으로 선택만 바뀌면 `renderElements` 는 바뀌지 않아 cache
  hit.

### 6.2 setState 한 번에 여러 개 호출 시 batching

React 18 automatic batching 덕분에, async 함수 내에서도 동기 흐름에서는
setState 들이 batch. 예: `handleStartFromHome` 의 ~13 setState → 렌더 1-2 회.

### 6.3 불필요한 리렌더 후보

- Sidebar 전체가 App.tsx 의 수많은 props 를 받아서 **거의 모든 state 변경**
  에 리렌더. `React.memo` + `useCallback` 화되면 토글 1 회 렌더 비용 감소
  가능하지만, 현재는 의도적으로 단순 유지.

---

## 7. 디버깅 팁

| 증상 | 가능성 높은 원인 | 확인 위치 |
|------|------------------|-----------|
| "Type 바꿨는데 부가정보 아이콘이 겹침" | `additionalInfoVisibility` 가 stale 값으로 createElementsFromWireframe 에 전달 | handleSelectWireframeType line 454 |
| "editing 진입 시 배경이 바로 흰색에서 다른 색으로 깜빡" | `suspendInitialBackgroundSyncRef` 잠금 누락 | handleStartFromHome line 425 |
| "색상 바꿨는데 캔버스 반영 안 됨" | `suspendInitialBackgroundSyncRef.current=true` 가 꺼지지 않음 | 각 handler 첫 줄의 `= false` 확인 |
| "같은 슬로건이 250ms 마다 재생성" | `autoCopyKeyRef` 가 달라지는 조건으로 오염 | E6 dedupe key 구성 점검 |
| "StrictMode 에서 bridge 가 두 번 읽힘" | `bridgeResolved` 가드 비활성화 | E2 가드 + editingBridge 한 번 읽고 삭제 정책 |
| "체크박스 토글 했는데 렌더가 한 틱 늦음" | setState 중첩이 React 18 이하 환경에서 실행 | React 버전 확인 |

---

## 8. 리팩터 가능성 (정보 전달용, 즉시 필요는 아님)

| 항목 | 현재 | 제안 |
|------|------|------|
| 30 state 단일 파일 | App.tsx | `useReducer` or Zustand/Jotai 로 slice 분리 (background slice, project slice, elements slice) |
| suspendInitialBackgroundSyncRef 같은 일시 잠금 ref | 핸들러마다 `= false` 리셋 | 각 입력 source 가 explicit "originatedBy" flag 를 들고 다니는 방식으로 치환 |
| 8 effect 중 E4/E5 동일 deps | 각각 개별 역할 | 하나로 합치고 내부에서 branch (deps 평가 비용은 같지만 가독성 ↑) |
| handleStartFromHome 13 setState | 순차 호출 | useReducer 로 한 action dispatch |
| onChangeSelectedImage 의 productId 매핑 (primary image 순서 ↔ activeProducts(filter(image))) | 암묵적 index 매칭 | element 에 productId 필드 추가해 명시적 매핑 |

---

## 9. 관련 경로

- [App.tsx](../../react/src/modules/editing/App.tsx)
- [editorFlow.ts](../../react/src/modules/editing/utils/editorFlow.ts) — `createElementsFromWireframe`, `applyDraftLayoutVariant` 등
- [projectEditor.ts](../../react/src/modules/editing/utils/projectEditor.ts) — `applyProjectTextField`, `toggleAdditionalInfoElements`
- [initialBackground.ts](../../react/src/modules/editing/utils/initialBackground.ts) — `buildInitialBackgroundCandidate`
- [productImagePrebake.ts](../../react/src/modules/editing/utils/productImagePrebake.ts) — prebake 파이프라인

### 연계 상세 보고서
- [03 § 2.1 handleStartFromHome 상세](03_editing_module.md#21-handlestartfromhome-상세--진입-1회-seed-지점)
- [04a editorFlow.ts 상세](04a_editor_flow_detail.md)
- [07 bridge](07_bridge.md)
