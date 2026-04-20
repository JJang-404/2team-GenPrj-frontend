# 00. 전체 구조 개요 보고서

- 대상: `2team-GenPrj-frontend/react` (프론트엔드 React 애플리케이션)
- 작성일: 2026-04-18
- 동반 문서: 본 폴더(`doc/structure/`) 내 `01~` 하위 보고서.

본 문서는 전체 트리를 **큰 블록 단위로 분해**하고 각 블록이 어떤 역할을 하는지,
그리고 블록 간 데이터가 어떤 방향으로 흐르는지를 한눈에 정리한다.

---

## 1. 리포지토리 레이아웃

```
2team-GenPrj-frontend/
├── doc/           # 일자별 작업 리포트(0409 ~ 0417), 구조 보고서(structure/)
├── docs/          # 구조/아키텍처 문서(EDITING_MODULE.md, WIREFRAME_ARCHITECTURE.md, ...)
├── footer 이미지/   # 디자인 소스 이미지
├── 포스터 wireframe 모음/ # 와이어프레임 레퍼런스
└── react/         # 실제 빌드 대상 (본 보고서 범위)
    ├── src/
    ├── public/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

### 1.1 빌드/런타임 스택

| 항목 | 값 |
|------|----|
| Bundler | Vite 5 (`vite.config.ts`) |
| UI | React 18 + TypeScript 5 (JSX/TSX 혼재) |
| Styling | TailwindCSS 4 + PostCSS, 일부 모듈별 `*.css` |
| HTTP | axios |
| AI 유틸 | `@imgly/background-removal` (클라이언트 배경제거), `html2canvas` (포스터 캡처) |
| 아이콘 | `lucide-react` |
| 빌드 스크립트 | `tsc && vite build` |

JS/TS가 혼재한다. `initPage` 모듈은 대부분 `.jsx/.js`로 작성되었고,
`editing` 모듈은 `.tsx/.ts` 중심이다. 두 모듈의 경계에 bridge 레이어가 있다.

---

## 2. `react/src/` 1-depth 구조

```
react/src/
├── main.tsx          # React root 진입 + background-removal 모델 preload
├── App.tsx           # path 기반 수동 라우팅 (/editing vs /)
├── index.css / ...   # 글로벌 스타일
├── pages/            # 얇은 페이지 래퍼 2개 (InitPage, EditingPage)
├── modules/
│   ├── initPage/     # "초기 페이지" — 가게 정보/제품 입력 + draft 4종 미리보기
│   └── editing/      # "편집 페이지" — 배경 생성, 구도 선택, 요소 편집, 저장
├── shared/           # 두 모듈이 공유하는 좌표/타이포 토큰
│   ├── draftLayout.ts        # 4종 draft × 제품수별 placement
│   ├── draftTypography.ts    # 4종 draft × ratio별 텍스트 크기 토큰
│   └── backgroundStyle.ts    # 단색/그라데이션/다중색 CSS 생성
├── server/           # 백엔드 API 래퍼
│   ├── api/          # callApi, designApi, imageApi, modelApi, adverApi, storeInfo, users, baseApi
│   └── common/       # defines(상수·기본값), functions(URL 유틸), storage
├── pages/EditingPage.tsx → modules/editing/App
└── pages/InitPage.tsx    → modules/initPage/App
```

> 다른 루트 파일들(`server.zip`, `revise.md`, `dist/`)은 빌드 산출물 또는 백업이며
> 런타임과 무관.

---

## 3. 상위 레벨 데이터 흐름

아래 그림은 사용자가 프론트엔드에 들어와 "편집 → 저장" 까지 가는 동안
**정보가 어떻게 넘어가는지**를 블록 단위로 보인다.

```
┌───────────────────┐         ┌────────────────────┐
│  InitPage App     │         │  Editing App       │
│  (initPage/App)   │         │  (editing/App)     │
│                   │         │                    │
│  basicInfo        │         │  projectData       │
│  extraInfo        │ bridge  │  elements[]        │
│  products[]       │━━━━━━━━▶│  bg candidates     │
│  options (ratio,  │         │  wireframe 4종     │
│    bgType, ...)   │         │  additionalInfo    │
└────┬──────────────┘         └─────────┬──────────┘
     │                                  │
     │ callApi (배경 생성,               │ callApi (광고문구, 정면변환,
     │  광고문구, 업로드, 저장)           │  업로드, 저장)
     ▼                                  ▼
┌───────────────────────────────────────────────────┐
│        server/api (baseApi + 서브 API 모음)        │
│  modelApi, designApi, imageApi, adverApi, ...     │
└───────────────────────┬───────────────────────────┘
                        │ axios
                        ▼
              FastAPI 백엔드 (`/addhelper`)
```

`bridge` 는 브라우저 네비게이션을 넘어 **HomeProjectData 스냅샷**을 보내는 전용
통로다. 우선순위는 `URL ?token=` → IndexedDB → sessionStorage → window.name
순서로 폴백한다. 상세는 `07_bridge.md`.

---

## 4. 각 블록 한 줄 설명

| # | 블록 | 언어 | 역할 | 상세 |
|---|------|------|------|------|
| 1 | `main.tsx` + `App.tsx` + `pages/` | TS | path 기반 라우팅, 모델 preload | `01_entry_routing.md` |
| 2 | `modules/initPage/` | JSX/JS | 가게 정보·제품 입력, 4종 draft 카드 렌더 | `02_initPage_module.md` |
| 3 | `modules/editing/` | TSX/TS | 배경 생성·선택, 요소 편집, wireframe 구도 스왑, 저장 | `03_editing_module.md` |
| 4 | `initPage/components/wireframe/` + `editing/utils/wireframeLayout.ts` | JSX/TS | 4종 와이어프레임 레이아웃 엔진 (이중 경로) | `04_wireframe_engine.md` |
| 5 | `server/` | JS | axios 기반 백엔드 호출 래퍼, 상수/공용 함수 | `05_server_api.md` |
| 6 | `shared/` | TS | draftLayout / draftTypography / backgroundStyle 공유 토큰 | `06_shared.md` |
| 7 | `initPage/utils/editingBridge.js` + `editing/utils/editingBridge.ts` | JS/TS | initPage → editing 페이로드 교환 | `07_bridge.md` |
| 8 | (cross-cutting) `types/*` + 변환 경계 | TS | 5단계 타입 파이프라인, 공유 식별자, 병존 좌표계 지도 | `08_data_interfaces.md` |

---

## 5. 두 "App" 의 역할 분담

### 5.1 `modules/initPage/App.jsx` — "구성 → 선택" 단계

- 입력 UI (가게 이름/업종/문구, 제품 목록, 비율/개수/배경타입/색상) 제공.
- `useProducts` / `useDesignOptions` 훅으로 상태를 보관.
- `DraftCard` 를 `SAMPLE_COUNT` 개 그려 사용자가 고르게 한다 (현재 1 — 원래 4).
  `SAMPLE_COUNT <= 4` 일 때는 2열, 그 이상이면 3열 그리드로 배치.
- "이 디자인 선택" 확인 모달 → `buildEditingPayload` → `storeEditingPayload` →
  `/editing?token=...` 로 이동.
- AI 광고 문구 자동 생성, `storeInfo.saveStoreInfo` 로 로컬 저장.

### 5.2 `modules/editing/App.tsx` — "편집 → 저장" 단계

- `readEditingBridgePayload()` 로 payload 복원. 실패 시 init 으로 리다이렉트.
- `prebakeProductImages` 로 **제품 이미지의 좌/우 반쪽 dataURL**, natural 크기
  사전 계산(Type 4 half-crop용).
- 단계 상태(`step`) 와 `rightPanelMode`("구도 선택" / "배경 선택")로 우측 패널 토글.
- 요소 편집: `elements: EditorElement[]` 를 중심으로 `EditorCanvas`(중앙) 와
  `Sidebar`(좌측 패널, 토큰 편집/타이포/배경/아이콘 토글) 가 상호작용.
- 4종 구도(`WireframeChoiceCard`) 중 하나를 선택하면 `createElementsFromWireframe`
  로 `elements` 재생성.
- `captureElementAsDataUrl`(html2canvas) 로 포스터 PNG 저장.

---

## 6. 사용자 여정 흐름 (시퀀스)

```
InitPage 입장
 ├─ 가게 정보·제품 입력
 ├─ 4종 Draft 미리보기 카드 클릭
 ├─ 확인 모달 "네"
 ├─ (필요 시) AI 광고 문구 생성
 ├─ storeInfo.saveStoreInfo (localStorage)
 ├─ buildEditingPayload → normalize(blob→dataURL), bgType 매핑
 └─ storeEditingPayload → IndexedDB (1순위) → sessionStorage 폴백

navigate '/editing'

EditingPage 입장
 ├─ readEditingBridgePayload (IDB → session → window.name)
 ├─ prebakeProductImages (좌/우 반쪽 PNG dataURL + natural size)
 ├─ getDefaultZonePositions(draftIndex) 로 ZonePositions 결정
 ├─ createElementsFromWireframe(projectData, visibility) → elements[]
 ├─ (자동) 광고 문구 비어있으면 generateSlogan 트리거
 ├─ 우측 "배경 선택" 모드: generateBackgrounds (AI N변형 or CSS 로컬 생성)
 ├─ 우측 "구도 선택" 모드: WireframeChoiceCard → handleSelectWireframeType
 ├─ 사이드바: 텍스트·폰트·아이콘·색상·이미지 교체·정면 변환 등
 └─ handleFullSave: html2canvas 3x scale → PNG 다운로드
```

---

## 7. 공유/경계 레이어

### 7.1 `shared/` (둘 다 쓰는 토큰)

- `draftLayout.ts` — **4종 draft × 제품 개수(1~3)** 별 제품 슬롯 좌표·텍스트 placement.
  initPage 의 `DraftCard` 와 editing 의 `wireframeLayout` 둘 다 참고.
- `draftTypography.ts` — `(draftIndex, ratio)` → 텍스트 4개(store/slogan/details/summary) 의
  폰트 크기·line-height 프리셋.
- `backgroundStyle.ts` — 한글 라벨(`단색`, `그라데이션`, `다중색`) → CSS background
  문자열 (solid / linear-gradient / split).

### 7.2 `server/common/`

- `defines.js` — 백엔드 URL, 이미지 타임아웃, AI 배경 기본 프롬프트/네거티브,
  DEFAULT_OPTIONS, CURRENCIES, `createProduct()` 등 **가장 뿌리깊은 상수 묶음**.
- `functions.js` — `getBackendUrl()` 등 환경 결정 함수.

### 7.3 `editingBridge` (init ↔ editing)

initPage 쪽(`utils/editingBridge.js`) 은 **쓰기/생성** 전담:
`buildEditingPayload` 에서 blob URL → data URL 전환, PNG 바운딩박스 크롭, 슬롯
좌표 미리 계산. `storeEditingPayload` 에서 백엔드 → IndexedDB → sessionStorage
순서로 저장. editing 쪽(`utils/editingBridge.ts`) 은 **읽기** 전담: 토큰 →
IndexedDB → sessionStorage → window.name 순서로 복원.

---

## 8. 하위 보고서 네비게이션

| 파일 | 무엇을 다루는가 |
|------|-----------------|
| `01_entry_routing.md` | `main.tsx` / `App.tsx` / `pages/` (진입·라우팅·preload) |
| `02_initPage_module.md` | `modules/initPage/` 전 영역 |
| `03_editing_module.md` | `modules/editing/` 전 영역 |
| `04_wireframe_engine.md` | `initPage/components/wireframe/` + `editing/utils/wireframeLayout.ts`. 이중 경로 구조와 Type 1~4. |
| `05_server_api.md` | `server/api/*` + `server/common/*` |
| `06_shared.md` | `shared/draftLayout.ts` · `draftTypography.ts` · `backgroundStyle.ts` |
| `07_bridge.md` | init → editing payload 교환, IndexedDB 폴백, 토큰 프로토콜 |
| `08_data_interfaces.md` | 5단계 데이터 파이프라인 + 타입 간 연결, 공유 식별자(draftIndex/한국어 레이블/id slug), 4종 병존 좌표계 |

---

## 9. 빠른 파일 카운트 (대략)

| 블록 | `.ts/.tsx` | `.js/.jsx` | 비고 |
|------|-----------:|-----------:|------|
| `src/` 루트 | 2 | 0 | `main.tsx`, `App.tsx` |
| `pages/` | 2 | 0 | 래퍼 2개 |
| `modules/editing/` | ≈ 35 | 0 | 컴포넌트/유틸/타입 |
| `modules/initPage/` | 1 (`outerFrameZones.ts`) | ≈ 30 | 대부분 JSX/JS |
| `server/` | 0 | ≈ 11 | axios 래퍼 |
| `shared/` | 3 | 0 | 공용 토큰 |

전체 이중 언어(TS/JS) 구조는 수정 범위가 한 블록에 갇히도록 만든다. 예:
wireframe 관련 변경은 `initPage/components/wireframe/` 혹은
`editing/utils/wireframeLayout.ts` 중 한쪽만 만지는 것이 기본 원칙 (참조:
`.omc/specs/deep-interview-wireframe-choice-card-type4.md`).
