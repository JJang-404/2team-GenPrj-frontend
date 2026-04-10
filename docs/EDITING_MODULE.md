# Editing 모듈 구조 정리

문서 위치: [2team-GenPrj-frontend/docs/EDITING_MODULE.md](./EDITING_MODULE.md)  
대상 경로: [react/src/modules/editing/](../react/src/modules/editing/)

---

## 1. 모듈 역할

`editing/` 은 initPage(광고 생성 홈)에서 "디자인 선택" 후 넘어오는 **편집 앱**입니다. 3단계 파이프라인으로 동작합니다.

| 단계 | state 값 | 화면 제목 | 핵심 역할 | 현재 도달 가능 |
|---|---|---|---|---|
| 1단계 | `step === 'template'` | 구조가 다른 템플릿 4종 선택 | 템플릿 4개(= draft 4개) 미리보기, 사용자가 골라 캔버스에 적용 | ❌ (dead code) |
| 2단계 | `step === 'background'` | 배치에 맞춘 AI 배경 후보 | 좌측 큰 프리뷰(`EditorCanvas`) + 우측 360px 배경 후보 카드(`BackgroundCard`) × N | ✅ (진입 화면) |
| 3단계 | `step === 'editor'` | 객체 자유 편집 | 우측 후보 카드 그리드가 숨겨지고 좌측 `EditorCanvas` 가 편집 모드로 | ✅ |

initPage에서 넘어올 때는 `bridge`를 통해 `handleStartFromHome(projectData, draftIndex)` 이 호출되면서 **`setStep('background')` 로 2단계부터 시작**하도록 되어 있습니다. 현재 [react/src/App.tsx](../react/src/App.tsx) 라우팅은 `init | editing` 두 개뿐이고 InitPage 가 기본 시작 페이지라, editing 1단계(`step === 'template'`)로 진입할 수 있는 경로가 존재하지 않습니다 → **1단계 + `TemplateCard` × 4 는 dead code**. 사용자가 처음 보는 화면은 항상 2단계입니다.

---

## 2. 폴더 구조

```
react/src/modules/editing/
├── App.tsx                          ← 편집 앱 엔트리. step 상태와 모든 핸들러 보유
├── vite-env.d.ts
├── api/
│   └── client.ts                    ← fetchBootstrap, generateBackgrounds 등 백엔드 호출
├── components/
│   ├── Sidebar.tsx                  ← 좌측 사이드바 (광고 정보/추가 정보/추천 등)
│   ├── EditorCanvas.tsx             ← 절대좌표 elements[] 를 실제로 그리는 캔버스
│   ├── TemplateCard.tsx             ← 1단계 템플릿 카드 (미리보기)
│   ├── BackgroundCard.tsx           ← 2단계 배경 후보 카드 (미리보기)
│   └── sidebar/
│       ├── AdInfoSection.tsx
│       ├── AddElementSection.tsx
│       ├── AdditionalInfoSection.tsx
│       ├── BackgroundOptionsSection.tsx
│       ├── ElementInfoPanels.tsx
│       ├── RecommendationsSection.tsx
│       ├── SidebarBlock.tsx
│       ├── SidebarMiniButton.tsx
│       └── backgroundTokens.ts
├── config/
│   └── remoteApi.ts
├── data/
│   └── bootstrap.ts                 ← 기본 템플릿 프리셋
├── types/
│   ├── api.ts
│   ├── editor.ts
│   ├── editor-core.ts               ← EditorElement, TemplateDefinition, EditorStep 정의
│   └── home.ts                      ← HomeProjectData (브리지 페이로드 타입)
├── utils/
│   ├── additionalInfo.ts
│   ├── backgroundGeneration.ts
│   ├── canvas.ts
│   ├── editingBridge.ts             ← 브리지 페이로드 읽기
│   ├── editor.ts                    ← updateElement, cloneTemplateElements 등
│   ├── editorFlow.ts                ★ 핵심: 템플릿→elements 매핑, draftLayout 적용
│   ├── file.ts
│   ├── fontRecommendations.ts
│   ├── initialBackground.ts
│   ├── projectEditor.ts             ← 프로젝트 데이터 기반 편집 유틸 (getTemplatePreviewElements 등)
│   └── ratio.ts
└── styles/                          ← (CSS)
```

---

## 3. 렌더링 모델 — elements[] 절대좌표 방식

이 모듈의 **유일한 렌더링 모델**은 `EditorElement[]` 입니다. 각 element는 `{ x, y, width, height, rotation }` 를 "캔버스 대비 %" 단위로 갖고 있고, `TemplateCard`/`BackgroundCard`/`EditorCanvas` 세 곳이 공통 패턴으로 찍어냅니다.

```tsx
// TemplateCard.tsx / BackgroundCard.tsx / EditorCanvas.tsx 의 공통 루프 요약
previewElements
  .slice()
  .sort((a, b) => a.zIndex - b.zIndex)
  .map((element) => {
    const base = {
      left: `${element.x}%`,
      top: `${element.y}%`,
      width: `${element.width}%`,
      height: `${element.height}%`,
      transform: `rotate(${element.rotation}deg)`,
      zIndex: element.zIndex,
      opacity: element.opacity ?? 1,
    };
    // element.kind 에 따라 <div>(text), <div>(shape), <img>(image) 렌더
  });
```

- [EditorCanvas.tsx](../react/src/modules/editing/components/EditorCanvas.tsx): 편집용(선택/드래그 가능)
- [TemplateCard.tsx](../react/src/modules/editing/components/TemplateCard.tsx): 1단계 미리보기(읽기전용)
- [BackgroundCard.tsx](../react/src/modules/editing/components/BackgroundCard.tsx): 2단계 배경 카드 미리보기(읽기전용)

`EditorElement` 의 `kind` 는 `'text' | 'shape' | 'image'` 세 가지. 이미지 중 "주력 제품" 판정은 [editorFlow.ts](../react/src/modules/editing/utils/editorFlow.ts#L67) 의 `isPrimaryImageElement` (id/label 정규식 매칭).

> **주의:** 이 모듈에는 initPage 의 `components/wireframe/` 처럼 **슬롯 JSON + computeSlotStyle 수식**을 쓰는 코드가 **없습니다**. 배치는 전적으로 `elements[]` 의 x/y/width/height/rotation 값으로 결정됩니다.

---

## 4. 데이터 흐름 (브리지 진입)

```
initPage                                 editing
┌──────────────┐  storeEditingPayload   ┌─────────────────────────┐
│ handleSelect │ ─────────────────────> │ readEditingBridgePayload│
│  Design(idx) │  (백엔드/IDB/session)   │                         │
│              │                         │ handleStartFromHome(    │
│ buildEditing │                         │   projectData,          │
│  Payload     │                         │   draftIndex)           │
└──────────────┘                         └──────────┬──────────────┘
                                                    │
                                                    ▼
                                      setProjectData, setBackgroundMode,
                                      setBackgroundCandidates([initialBg]),
                                      setSelectedTemplateId(template),
                                      setElements(
                                        applyDraftTypographyVariant(
                                          applyDraftLayoutVariant(
                                            mapProjectDataToTemplate(template, data),
                                            draftIndex),
                                          data))
                                                    │
                                                    ▼
                                              step = 'background'
```

**핵심 함수 체인 (App.tsx:162~192 `handleStartFromHome`)**

1. `mapProjectDataToTemplate(template, data)` — 템플릿의 `elements` 뼈대에 projectData(가게명, 슬로건, 제품 이미지 URL, 가격 등)를 채워 넣어 **content가 실린 elements[]** 를 만듭니다. 이 시점에서도 좌표는 템플릿 원본 좌표입니다.
2. `applyDraftLayoutVariant(elements, draftIndex)` — elements 를 돌면서 "주력 이미지"와 특수 ID(`fallback-main-slogan`, `fallback-store-name`, `fallback-details`, `fallback-product-summary`)의 좌표를 **`shared/draftLayout.ts`의 하드코딩된 값**으로 덮어씁니다.
3. `applyDraftTypographyVariant(elements, data)` — [shared/draftTypography.ts](../react/src/shared/draftTypography.ts) 에서 draftIndex+ratio 에 따른 폰트/크기/색을 계산해서 덮어씁니다.

**`draftIndex` 의 실제 의미:** initPage DraftCard 의 idx (0~3) 가 그대로 넘어옵니다. editing 쪽에선 `bootstrap.templates[draftIndex]` 로 템플릿을 선택하는 **인덱스**이자, `shared/draftLayout.ts` 와 `shared/draftTypography.ts` 안의 4×N 배열 인덱스로도 동시에 쓰입니다.

---

## 5. 각 단계별 렌더 요약

### 1단계 — template 선택

- 위치: [App.tsx:525~549](../react/src/modules/editing/App.tsx#L525-L549)
- 컴포넌트: `<TemplateCard>` × 4
- 데이터: `getTemplatePreviewElements(template, projectData, backgroundMode, applyElementVisibilityRules, mapProjectDataToTemplate)` — [projectEditor.ts](../react/src/modules/editing/utils/projectEditor.ts#L70)
- 렌더 방식: TemplateCard 가 받은 `elements[]` 의 x/y/width/height/rotation 을 절대배치로 찍음

### 2단계 — background

- 위치: [App.tsx:552~581](../react/src/modules/editing/App.tsx#L552-L581)
- JSX 구조:
  ```jsx
  <section className="workspace__section workspace__section--split">
    <div className="workspace__main-preview">         {/* 좌측, flexible */}
      <EditorCanvas elements={renderElements} background={selectedBackground} ... />
    </div>
    {step === 'background' && (
      <div className="workspace__choices">              {/* 우측, 360px 고정 */}
        {backgroundCandidates.map(bg =>
          <BackgroundCard background={bg} elements={renderElements} ... />
        )}
      </div>
    )}
  </section>
  ```
- CSS 그리드: `.workspace__section--split { grid-template-columns: minmax(360px, 1fr) 360px; }` — 좌측 main-preview 가변 폭(큰 영역), 우측 choices 고정 360px
- **진입 직후 상태:** `handleStartFromHome` 이 `backgroundCandidates = [initialBackground]` (1장) 로 초기화 → 우측에 "initPage 배경" 이라는 name/note 가 붙은 BackgroundCard 단 한 장만 노출, selected 상태. initial background 는 [buildInitialBackgroundCandidate](../react/src/modules/editing/utils/initialBackground.ts) 가 initPage 에서 넘어온 색/이미지를 그대로 반영해서 만든 것.
- 데이터 흐름:
  - `elements` state ← `handleStartFromHome` 또는 `handleTemplateSelect` 에서 `applyDraftLayoutVariant` 적용한 값
  - `renderElements` = `applyElementVisibilityRules(selectedTemplateId, elements, backgroundMode, projectData)` — 숨김 플래그 처리만 추가
  - **메인 프리뷰와 BackgroundCard 가 동일한 `renderElements` 와 동일한 `selectedBackground` 를 공유**하므로, 두 카드는 본질적으로 **같은 그림을 크기만 다르게 그림**. 시각적 차이는 EditorCanvas 가 선택/드래그 핸들을 가진 점뿐.

### 3단계 — editor 자유 편집

- 위치: 2단계와 같은 JSX 블록(`step === 'background' || step === 'editor'`), `step === 'background'` 조건부 블록이 false 가 되어 **우측 `workspace__choices` 전체가 사라짐**
- 메인 프리뷰의 `<EditorCanvas>` 만 남아 편집 가능 모드로 동작 (selectedElementId, onSelect, onChangeElement)

### 2단계 / 3단계 메인 프리뷰의 정체 확인 (시각적 검증)

스크린샷 기반 확인 결과:
- **2단계 화면:** 좌측에 큰 라운드 사각 카드 1장(= `workspace__main-preview > EditorCanvas`) + 우측에 작은 라운드 사각 카드 1장(= `workspace__choices > BackgroundCard`, 하단 라벨 "initPage 배경")
- **3단계 화면:** 좌측에 큰 라운드 사각 카드 1장만 남음(= 동일한 `EditorCanvas`)
- 2단계의 **좌측 큰 카드** 와 3단계의 **유일한 큰 카드** 는 **동일한 스타일/크기**로 그려짐 → 같은 컴포넌트(`EditorCanvas` main-preview) 임이 확정됨
- **주의:** 상품/텍스트가 전혀 없는 테스트 데이터(solid 배경 + 제품 0개)일 때는 두 카드 모두 "둥근 빨간 사각형" 으로만 보여서 `EditorCanvas` 와 `BackgroundCard` 를 **시각적으로 구분할 수 없음**. 구분하려면 3단계로 넘어가 우측 카드가 사라지는지 확인하거나, BackgroundCard 하단의 name/note 라벨 유무로 판별.

---

## 5-1. 교체 대상 (요약)

현재 라우팅([react/src/App.tsx](../react/src/App.tsx))은 `init | editing` 두 개뿐이고 InitPage 가 기본 시작 페이지. editing 진입은 반드시 initPage → "디자인 편집" 버튼 → bridge payload → `handleStartFromHome` → `setStep('background')` 경로만 존재. 따라서:

| 렌더 경로 | 현재 플로우에서 사용? | 진입 시 보이는가 |
|---|---|---|
| `step === 'template'` + `TemplateCard` × 4 | ❌ dead code (도달 불가) | ❌ |
| `step === 'background'` 메인 프리뷰 `EditorCanvas` | ✅ 좌측 큰 카드 | ✅ |
| `step === 'background'` `BackgroundCard` × N | ✅ 우측 카드 그리드 (진입 시 1장) | ✅ (우측) |
| `step === 'editor'` 메인 프리뷰 `EditorCanvas` | ✅ 편집 모드 진입 후 | (3단계 이후) |

**즉, initPage DraftCard 배치와 일치시켜야 하는 "가운데 큰 카드" = `workspace__main-preview > EditorCanvas`** 임이 확정됨.

---

## 6. 외부 의존성 (모듈 바깥에서 가져오는 것들)

| 경로 | 용도 |
|---|---|
| `../../server/api/callApi` | 서버 요청 헬퍼 |
| `../../server/api/adverApi` | 광고 관련 API |
| `../../server/api/storeInfo` | 가게 정보 저장/조회 |
| `../initPage/utils/removeBackground` | 배경 제거 파이프라인 재사용 |
| `../../shared/draftLayout` | **draftIndex → 제품/텍스트 절대좌표 테이블 (하드코딩 4×3)** |
| `../../shared/draftTypography` | draftIndex → 폰트 프리셋 |

**initPage 의 `components/wireframe/` 폴더는 editing 쪽에서 한 번도 import 되지 않습니다.** 즉, initPage 의 JSON+수식 기반 배치 시스템과 editing 의 하드코딩 좌표 시스템은 현재 완전히 **분리된 두 개의 병렬 구현**입니다.

---

## 7. 현재 한계 및 "initPage 와 동일한 배치" 요구가 발생한 지점

- `shared/draftLayout.ts` 는 제품 1/2/3개만 지원합니다 ([getCountIndex](../react/src/shared/draftLayout.ts#L101)에서 `count >= 3 → bucket 2`). 4~6개 제품은 3개 템플릿으로 뭉개집니다.
- initPage wireframe/ 은 1~6개 전부 지원하고, 비율 기반 크기 보정(`CANVAS_HW_RATIO`), 이미지 AR 기반 동적 폭 계산, Type3 overlap/Type4 half-crop 같은 타입별 특수 처리를 포함합니다.
- 그 결과 **같은 draftIndex 라도 initPage DraftCard 미리보기와 editing 의 실제 도달 가능한 렌더(2단계 메인 프리뷰 `EditorCanvas` + 2단계 `BackgroundCard`, 3단계 `EditorCanvas` 편집 모드)가 시각적으로 다릅니다.** (1단계 `TemplateCard` 는 dead code 이므로 이번 "시각적 불일치" 논의에서는 제외.)
- 사용자가 처음 editing 에 진입했을 때 보이는 화면 = **2단계 메인 프리뷰** 의 배치를 initPage DraftCard 와 일치시키는 것이 이번 작업의 목표.

---

## 8. 통합 작업을 위해 건드려야 할 후보 지점

1. **브리지 payload 확장** — [initPage/utils/editingBridge.js:162~174](../react/src/modules/initPage/utils/editingBridge.js#L162-L174) `projectData.options` 에 wireframe 타입 식별자를 명시적으로 저장. 현재는 `draftIndex` 하나만으로 "Type 1~4" 를 유도하고 있음.
2. **공통 레이아웃 소스 확보** — initPage `components/wireframe/` 의 JSON+수식 로직을 editing 에서도 쓸 수 있도록 공용 경로(예: `react/src/shared/wireframe/`)로 이동하거나, editing 이 initPage 경로를 직접 import.
3. **2단계 메인 프리뷰 렌더링 교체** — [App.tsx:554~563](../react/src/modules/editing/App.tsx#L554-L563) 의 `workspace__main-preview > <EditorCanvas>` 한 곳만 "wireframe 레이아웃 컴포넌트(Type1~4 중 draftIndex 대응)" 로 교체. 제품 슬롯과 텍스트(StoreTitle/SloganText 등)를 함께 wireframe 쪽에서 그림. **→ 이번 작업의 1차 타겟.**
4. **후보 카드 그리드 재사용 여부** — `workspace__choices > BackgroundCard` × N 이 동일한 `renderElements` 를 공유하기 때문에, 메인 프리뷰만 wireframe 으로 바꾸면 **좌측 큰 카드(wireframe) 와 우측 작은 카드(legacy elements[])의 배치가 서로 달라지는 시각적 불일치**가 발생함. 선택지:
   - (a) **메인만 교체** — 우측 카드는 그대로. 단순하지만 불일치.
   - (b) **메인 + BackgroundCard 모두 교체** — [BackgroundCard.tsx](../react/src/modules/editing/components/BackgroundCard.tsx) 내부 루프도 wireframe 레이아웃으로 치환. 파일 2개 수정, 일관성 확보.
   - 어느 쪽을 택하든 **elements 모델과 wireframe 모델의 공존 전략** (특히 편집 기능이 살아있어야 하는 3단계 EditorCanvas 를 위한) 이 필요함.
5. **1단계 `TemplateCard` 는 dead code 이므로 이번 범위에서 완전히 무시** — 어차피 라우팅상 도달 불가능하므로 시각적 일치 여부도 무의미.
6. **3단계는 2단계 성공 후 별도 작업** — `step === 'editor'` 에서 같은 `workspace__main-preview > <EditorCanvas>` 가 편집 가능 모드(선택/드래그/이동/교체)로 살아있어야 함. wireframe 컴포넌트로 치환하려면 편집 기능을 같이 이식해야 하므로, 2단계 읽기전용 교체를 먼저 성공시킨 뒤에 착수.

---

## 9. 용어 주의

- **`draftIndex`** — editing 모듈 전역에서 "어떤 템플릿/레이아웃을 쓸지" 가리키는 0~3 정수. initPage DraftCard 의 idx 와 같음.
- **"template"** — 1단계에서 고르는 4가지 원본 (`bootstrap.templates[0..3]`). draftIndex 로 선택됨.
- **"wireframe"** — initPage `components/wireframe/` 의 JSON+수식 기반 배치 시스템. editing 모듈에는 아직 들어와 있지 않음.
- **"draftLayout"** — `shared/draftLayout.ts`. editing 이 실제로 쓰는 **하드코딩 좌표 테이블**. wireframe 과는 별개.

두 용어가 사용자 대화에서 종종 혼용되는데, 이 문서에서는 위 정의를 따릅니다.
