# United1_5 선택적 머지 보고서

- 작성일: 2026-04-14
- 대상 커밋: `origin/feature/United1_5` = `ba6441a "여러 객체 이동"` (U1_4 기준 1커밋만 존재)
- 반영 브랜치: `feature/United1_4` → 새 커밋 `0585743 "wireframe_function_restored"`

---

## 1. 왜 "선택적" 머지인가

`feature/United1_5`는 U1_4 대비 단 1개 커밋(`ba6441a`)을 갖고 있고, 이름(`여러 객체 이동`)과 달리 **다중 선택 UX** + **wireframe 텍스트 좌표 재배치** + **productMeta 추가** + **배경 프롬프트 영어 전환**이라는 서로 다른 4가지 변경이 한 커밋에 묶여 있다.

사용자 지시 사항은 다음과 같았다.

> feature/United1_5에서 feature/United1_4와 비교할 때 바뀐 점들만, 단 **wireframe 관련 기능(=텍스트 좌표 중 상품명·가격 오프셋)은 유지해서** 적용해 달라.

즉 wireframe 텍스트 중에서도 **사용자가 명시적으로 지시했던 `productMeta`(상품명·가격·설명 오프셋) 테이블 추가만** 수용하고, `storeName` / `mainSlogan` 좌표 재배치는 받지 않는다.

## 2. U1_5에서 변경된 파일 요약

| 파일 | 분류 | U1_5의 변경 내용 | 적용 여부 |
|---|---|---|---|
| `react/src/modules/editing/App.tsx` | 다중 선택 | `selectedElementId: string` → `selectedElementIds: string[]`, `handleCanvasSelect(id, {append})` 추가, 선택 복원 로직 업데이트 | **적용** |
| `react/src/modules/editing/components/EditorCanvas.tsx` | 다중 선택 | Ctrl/Meta+클릭 토글, 다중 요소 동시 드래그(`origins` 배열), 단일 선택일 때만 transform 핸들 표시 | **적용** |
| `react/src/modules/editing/components/Sidebar.tsx` | 다중 선택 | `selectionCount` prop 추가, "다중 선택 N개 요소" 안내 카드 | **적용** |
| `react/src/modules/editing/utils/editor.ts` | 다중 선택 | `updateElementsByIds(elements, ids, updater)` 헬퍼 신설 | **적용** |
| `react/src/modules/editing/utils/editorFlow.ts` | wireframe | `placeProductMetaElement`에 `draftIndex: 0\|1\|2\|3` 인자 추가, `WIREFRAME_TEXT_PLACEMENTS[draftIndex].productMeta` 참조 | **적용** |
| `react/src/modules/editing/utils/wireframeTextPlacements.ts` | wireframe | **(a) `productMeta` 오프셋 테이블 4개 타입 신규**, **(b) `storeName`/`mainSlogan` 좌표 전면 재배치** | **(a)만 적용, (b) 스킵** |
| `react/src/server/api/callApi.js` | 기타 | 배경 프롬프트 한글 → 영어 전환 | **적용** |
| `Q.md` (+836 lines) | 스크래치 | 개인 노트 추정 | 스킵 |
| `test5.ipynb` (+1367 lines) | 스크래치 | 노트북 | 스킵 |

## 3. 적용된 기능 상세

### 3.1 다중 선택 UX (Group A)

**App.tsx** — 선택 상태를 단일 ID에서 ID 배열로 승격.

```ts
// Before (U1_4)
const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

// After (U1_5)
const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);

const handleCanvasSelect = (id: string | null, options?: { append?: boolean }) => {
  if (!id) return setSelectedElementIds([]);
  if (options?.append) {
    setSelectedElementIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    return;
  }
  setSelectedElementIds([id]);
};
```

`selectedElement` 파생 계산은 **단일 선택일 때만** 요소를 반환하도록 바뀌어(속성 편집 패널은 단일 선택 전용), 다중 선택 시엔 `null`을 돌려준다.

**EditorCanvas.tsx** — 드래그 상태 타입이 단일 ID 기반에서 `ids: string[]` + `origins: Array<{ id, x, y }>` 기반으로 확장. 드래그 이동량(`dx`, `dy`)을 계산한 뒤 각 origin에 더해 배치한다. Ctrl/Meta+클릭은 이벤트 단계에서 `onSelect(id, { append: true })`로 라우팅되어, 드래그가 시작되지 않고 선택만 토글된다. Transform 핸들(회전·리사이즈)은 **단일 선택일 때만** 노출(`canTransform = selected && selectedElementIds.length === 1`).

**Sidebar.tsx** — `selectionCount > 1`이면 다음 안내 카드를 표시한다.

```
다중 선택
N개 요소 선택됨
현재는 동시에 이동만 지원하고, 세부 속성 편집은 단일 선택에서만 지원합니다.
```

**editor.ts** — 향후 다중 요소 일괄 업데이트를 위한 `updateElementsByIds` 유틸 추가 (현재 App.tsx에서 직접 사용하진 않고 헬퍼로만 존재).

### 3.2 wireframe productMeta 오프셋 테이블 (Group B 중 일부)

`wireframeTextPlacements.ts`에 `WireframeProductMetaPlacement` 인터페이스와 4개 타입별 `productMeta` 필드를 신설했다. 각 타입은 상품명/가격/설명의 **Y 오프셋** 3개와 **최소 너비** 3개를 갖는다.

```ts
export interface WireframeProductMetaPlacement {
  nameOffsetY:  number;
  priceOffsetY: number;
  descOffsetY:  number;
  nameMinWidth: number;
  priceMinWidth: number;
  descMinWidth: number;
}
```

값은 타입별 레이아웃의 시각적 밀도에 따라 서로 다르게 튜닝되어 있다 (예: Type3 OverlapGroup은 제품이 촘촘해서 오프셋이 가장 작음).

| Type | nameOffsetY | priceOffsetY | descOffsetY |
|---|---|---|---|
| Type1 SingleLarge | 1.4 | 4.8 | 7.8 |
| Type2 SingleCompact | 1.2 | 4.6 | 7.4 |
| Type3 OverlapGroup | 1.1 | 4.2 | 6.8 |
| Type4 HalfCropGroup | 1.0 | 4.1 | 6.6 |

**`editorFlow.ts`의 `placeProductMetaElement` 함수**는 이제 `draftIndex`를 받아 해당 타입의 오프셋을 사용한다.

```ts
function placeProductMetaElement(
  element: EditorElement,
  rect: WireframeProductPlacement['rect'],
  draftIndex: 0 | 1 | 2 | 3,
): EditorElement {
  const meta = WIREFRAME_TEXT_PLACEMENTS[draftIndex].productMeta;
  const width = Math.max(
    rect.width,
    isName ? meta.nameMinWidth : isPrice ? meta.priceMinWidth : meta.descMinWidth,
  );
  const yOffset = isName ? meta.nameOffsetY : isPrice ? meta.priceOffsetY : meta.descOffsetY;
  // ...
}
```

호출부 `applyDraftLayoutVariant`에서 `typeIndex`를 3번째 인자로 넘긴다.

> **보존 노트**: U1_5의 원래 diff는 `productMeta`만 추가한 게 아니라 `storeName` / `mainSlogan`의 `x/y/width/height`도 전면 재배치했다. 예를 들어 Type3의 `storeName`은 `y: 4 → 78`, Type4의 `storeName`은 `y: 3 → 74`로 위치가 크게 바뀌었다. **이 재배치는 사용자 지시에 없었으므로 수용하지 않았고**, U1_4 값 그대로 유지했다.

### 3.3 배경 프롬프트 영어 전환

`callApi.js`의 `_buildBackgroundPrompt` 내부 고정 지시문을 한글에서 영어로 바꿨다.

```diff
- '포스터 배경만 생성, 제품·객체 포함하지 않음',
+ 'Generate only the poster background, without including any products or objects',
```

백엔드(OpenAiJob.build_prompt_bundle)가 최종적으로 SD3.5 영문 프롬프트로 조립하기 때문에, 입력 단계부터 영어인 편이 번역 품질·지시 해석이 안정적이다. (참고: `doc/0411/backend_gpt_prompt_integration_report.md`)

## 4. 스킵한 변경과 그 이유

### 4.1 `storeName` / `mainSlogan` 좌표 재배치

U1_5는 모든 타입에서 두 요소의 x/y/width/height를 전면적으로 이동시켰다. 대표적인 예:

| Type | 요소 | U1_4 좌표 | U1_5 원본 좌표 |
|---|---|---|---|
| 1 | storeName | (4, 4, 68, 10) | (6, 4, 30, 8) |
| 2 | storeName | (4, 4, 56, 12) | (4, 32, 24, 8) |
| 3 | storeName | (4, 4, 68, 10) | (6, 78, 30, 8) |
| 4 | storeName | (4, 3, 68, 9) | (16, 74, 68, 10) |
| 모든 타입 | mainSlogan | 하단 y=88~91 | 중상단 y=62~90 (혼란스러운 재배치) |

이 재배치는 시각적으로 검증되지 않은 상태에서 대규모로 적용되었고, **사용자는 본인이 지시한 변경이 아니라고 명시적으로 밝혔다**. 따라서 반영하지 않았다.

재배치를 받지 않더라도 `productMeta` 테이블은 **독립적인 필드**이므로 기존 `storeName`/`mainSlogan` 좌표와 함께 공존할 수 있다.

### 4.2 `Q.md`, `test5.ipynb`

개인 작업 노트/실험용 노트북으로 보이는 파일들. 제품 코드와 무관하여 스킵.

## 5. 충돌 해결이 필요했던 지점

`wireframeTextPlacements.ts`는 **수동 병합**이 필요했다. U1_5의 전체 내용을 체크아웃하면 `storeName`/`mainSlogan`까지 재배치되므로, U1_4 원본 파일에 `WireframeProductMetaPlacement` 인터페이스와 각 타입의 `productMeta` 필드를 Edit 도구로 삽입했다. 나머지 5개 파일(App.tsx, EditorCanvas.tsx, Sidebar.tsx, editor.ts, editorFlow.ts, callApi.js)은 `git checkout origin/feature/United1_5 -- <file>`로 통째 교체해도 안전했다.

## 6. 검증

- `npm run build` — exit 0 (vite 5.4.21, 39.48s, 1868 modules)
- 브라우저 수동 검증 항목 (사용자 확인 필요):
  - [ ] 요소 클릭 시 단일 선택 동작이 유지되는가
  - [ ] Ctrl/Meta + 클릭으로 여러 요소가 토글되어 추가 선택되는가
  - [ ] 2개 이상 선택 후 드래그 시 모두 동시에 이동하는가
  - [ ] 다중 선택 상태에서 Sidebar에 "N개 요소 선택됨" 카드가 표시되는가
  - [ ] 단일 선택에서만 회전/리사이즈 핸들이 나타나는가
  - [ ] Type 1/2/3/4 각각에서 상품명 + 가격 텍스트가 `productMeta` 오프셋대로 자연스럽게 배치되는가
  - [ ] AI 배경 생성 요청이 영어 프롬프트로도 기대대로 동작하는가

## 7. 관련 작업

- [`wireframe_halfcrop_restoration_report.md`](wireframe_halfcrop_restoration_report.md) — 같은 커밋 `0585743`에 함께 포함된 Type 4 half-crop 회귀 수정 보고서
