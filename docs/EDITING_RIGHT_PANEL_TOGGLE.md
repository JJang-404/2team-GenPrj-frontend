# editing 우측 패널 토글 (배경 선택 / 구도 선택)

> editing 모듈 2단계(`step === 'background'`) 화면 우측 패널 상단에 배치된 **"배경 선택 / 구도 선택" 토글 버튼** 에 대한 기능/DOM/상태 문서.

---

## 1. 목적

editing 모듈 2단계 화면 우측 패널(`workspace__choices`, 폭 360px 고정)은 원래 **배경 후보 카드(`BackgroundCard`) 그리드 하나만** 노출했습니다. 이 영역을 **배경 후보** 와 **구도(템플릿) 후보** 두 가지 용도로 교대 사용할 수 있도록 토글을 추가했습니다.

- **배경 선택** 모드: 기존 그대로, `BackgroundCard × N` 렌더
- **구도 선택** 모드: `bootstrap.templates` 에서 받아온 `TemplateCard × 4` 렌더

기본값은 **배경 선택**. 사용자가 토글을 누를 때마다 두 모드가 서로 교체됩니다.

---

## 2. 위치 (DOM 상의 경계)

토글 버튼은 **`BackgroundCard` 와 같은 부모(`workspace__choices`) 안에 있는 형제 요소** 입니다. BackgroundCard 영역에 포함되지 않습니다.

```
<section class="workspace__section--split">                   ← 2단계 split 레이아웃
  ├── <div class="workspace__main-preview">                   ← 좌측 큰 EditorCanvas
  │     <EditorCanvas ... />
  │
  └── <div class="workspace__choices">                        ← 우측 360px 패널 (전체)
        ├── <div class="choice-toggle">                       ← 토글 컨테이너 (← 이 문서의 대상)
        │     ├── <button class="choice-toggle__btn --active">배경 선택</button>
        │     └── <button class="choice-toggle__btn">구도 선택</button>
        │
        └── <div class="choice-grid choice-grid--compact">    ← 카드 그리드 (토글과 형제)
              ├── <BackgroundCard />   or   <TemplateCard />
              ├── <BackgroundCard />   or   <TemplateCard />
              └── ...
```

| 영역 | 포함 관계 |
|---|---|
| `workspace__choices` | 우측 패널 **전체** — 토글과 카드 그리드를 모두 포함 |
| `choice-toggle` | 토글 버튼 2개만 포함 (카드 제외) |
| `choice-grid--compact` | 카드만 포함 (토글 제외) |
| `BackgroundCard` / `TemplateCard` | **개별 카드 컴포넌트**. 토글 / 그리드 컨테이너 모두 미포함 |

---

## 3. 상태 모델

`editing/App.tsx` 내부에 `rightPanelMode` state 하나를 추가했습니다.

```ts
const [rightPanelMode, setRightPanelMode] = useState<'background' | 'template'>('background');
```

| 값 | 의미 | 우측 패널 렌더 |
|---|---|---|
| `'background'` (기본) | 배경 선택 모드 | `BackgroundCard × backgroundCandidates.length` |
| `'template'` | 구도 선택 모드 | `TemplateCard × bootstrap.templates.length` |

- **리셋 동작 없음**: `handleStartFromHome` / `handleTemplateSelect` / `handleSelectBackground` 등 기존 핸들러는 이 state 를 건드리지 않습니다. 즉, 사용자가 토글을 바꾼 이후에도 배경 생성 / 구도 선택을 수행해도 토글 상태는 유지됩니다.
- **단계별 가시성**: 토글 블록은 `step === 'background'` 일 때만 렌더됩니다. 3단계(`step === 'editor'`)로 넘어가면 `workspace__choices` 자체가 사라지므로 토글도 함께 사라집니다.

---

## 4. JSX 구조 (실제 코드)

[App.tsx:552~607](../react/src/modules/editing/App.tsx#L552-L607)

```jsx
{(step === 'background' || step === 'editor') && (
  <section className="workspace__section workspace__section--split">
    <div className="workspace__main-preview">
      <EditorCanvas elements={renderElements} background={selectedBackground} ... />
    </div>

    {step === 'background' && (
      <div className="workspace__choices">
        {/* ── 토글 컨테이너 ── */}
        <div className="choice-toggle" role="tablist" aria-label="우측 패널 모드">
          <button
            type="button"
            role="tab"
            aria-selected={rightPanelMode === 'background'}
            className={`choice-toggle__btn ${rightPanelMode === 'background' ? 'choice-toggle__btn--active' : ''}`}
            onClick={() => setRightPanelMode('background')}
          >
            배경 선택
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={rightPanelMode === 'template'}
            className={`choice-toggle__btn ${rightPanelMode === 'template' ? 'choice-toggle__btn--active' : ''}`}
            onClick={() => setRightPanelMode('template')}
          >
            구도 선택
          </button>
        </div>

        {/* ── 카드 그리드 (토글 상태에 따라 교체) ── */}
        {rightPanelMode === 'background' ? (
          <div className="choice-grid choice-grid--compact">
            {backgroundCandidates.map((background) => (
              <BackgroundCard
                key={background.id}
                background={background}
                elements={renderElements}
                ratio={projectData?.options.ratio ?? '4:5'}
                selected={background.id === selectedBackgroundId}
                onSelect={() => handleSelectBackground(background.id)}
              />
            ))}
          </div>
        ) : (
          <div className="choice-grid choice-grid--compact">
            {bootstrap.templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                ratio={projectData?.options.ratio ?? '4:5'}
                elements={getTemplatePreviewElements(
                  template,
                  projectData,
                  backgroundMode,
                  applyElementVisibilityRules,
                  mapProjectDataToTemplate
                )}
                selected={template.id === selectedTemplateId}
                onSelect={() => handleTemplateSelect(template)}
              />
            ))}
          </div>
        )}
      </div>
    )}
  </section>
)}
```

### 접근성

- `role="tablist"` / `role="tab"` / `aria-selected` 를 부여해 스크린 리더에서 탭 위젯으로 인식되도록 했습니다.
- `aria-label="우측 패널 모드"` 로 컨테이너 목적을 명시.
- 현재는 키보드 화살표 네비게이션(← / →)은 구현하지 않았습니다. 필요 시 `onKeyDown` 추가 필요.

---

## 5. 스타일 (CSS)

[global.css:1409~1442](../react/src/modules/editing/styles/global.css#L1409-L1442)

```css
.workspace__choices {
  padding: 14px;
}

.choice-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  margin-bottom: 14px;
  border: 1px solid #111111;
  border-radius: 6px;
  overflow: hidden;
}

.choice-toggle__btn {
  appearance: none;
  border: 0;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 700;
  background: #ffffff;          /* 기본: 흰 배경 + 검은 글씨 */
  color: #111111;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.choice-toggle__btn--active {
  background: #111111;          /* 선택: 검은 배경 + 흰 글씨 */
  color: #ffffff;
}
```

- 컨테이너(`.choice-toggle`)가 검정 테두리 + `overflow: hidden` 이라 두 버튼 사이 구분선 없이 하나의 덩어리처럼 보입니다.
- 버튼 사이 gap 은 `0` — 두 칸이 붙어있는 형태(요구 디자인 이미지와 일치).
- 전환 시 `background-color` / `color` 에 150ms 트랜지션을 걸어 딸깍이는 느낌 없이 부드럽게 교체.

---

## 6. 모드별 동작 차이 (주의 사항)

토글 자체는 **단순 UI 스위치** 이지만, 내부에 렌더되는 컴포넌트의 사용자 액션은 서로 성격이 다릅니다.

### 6.1 배경 선택 모드

- 카드 클릭 → `handleSelectBackground(background.id)`
- 효과: `selectedBackgroundId` 만 바꿈. `elements` 상태는 건드리지 않음 (요소 편집 상태 보존)
- 기존 2단계 동작 그대로

### 6.2 구도 선택 모드

- 카드 클릭 → `handleTemplateSelect(template)` ([App.tsx:194~201](../react/src/modules/editing/App.tsx#L194-L201))
- 효과:
  ```ts
  const mapped = mapProjectDataToTemplate(template, projectData);
  const withLayout = applyDraftLayoutVariant(mapped, projectData?.options.draftIndex ?? 0);
  setElements(applyDraftTypographyVariant(withLayout, projectData));
  setSelectedElementId(null);
  setPromptHint('');
  ```
- **주의: `setElements(...)` 가 현재 elements 를 통째로 덮어씁니다.** 즉, 사용자가 3단계에서 요소를 움직이거나 편집한 뒤에 다시 2단계로 돌아가 구도를 바꾸면 해당 편집 상태가 초기화됩니다. 필요하면 "구도를 바꾸면 편집 내역이 리셋됩니다" 확인 다이얼로그를 추가하는 것이 안전.
- **주의: `getTemplatePreviewElements(template, projectData, ...)` 에 `projectData = null` 인 경로가 있는지 확인 필요.** 브리지 경로로 진입한 경우 `projectData` 는 항상 채워지지만, 직접 URL 접근/에러 복구 경로에서는 null 일 수 있습니다.

### 6.3 dead code 가 살아나는 효과

이전까지 1단계(`step === 'template'`)는 라우팅상 도달 불가능한 dead code 였습니다 ([EDITING_MODULE.md §1 표](EDITING_MODULE.md)). 구도 선택 토글이 추가되면서 **기존 1단계 블록에서 쓰이던 `TemplateCard`, `handleTemplateSelect`, `bootstrap.templates` 가 2단계 우측 패널에서 처음으로 활성화**됩니다. 즉 이 토글은 단순 UI 추가가 아니라 **"템플릿 선택" 기능을 사용자 도달 가능한 지점으로 되살리는 엔트리포인트** 입니다.

---

## 7. 테스트 체크리스트

다음 항목을 런타임에서 수동 검증하면 됩니다.

- [ ] editing 진입 직후 우측 패널 상단에 토글 2개가 보이고, **"배경 선택"이 검정 배경 + 흰 글씨** 로 표시된다.
- [ ] "구도 선택" 클릭 시 색이 반전되고, 하단 카드 그리드가 `BackgroundCard × N` → `TemplateCard × 4` 로 교체된다.
- [ ] "배경 선택" 클릭 시 원복된다.
- [ ] 토글을 여러 번 왕복해도 `backgroundCandidates` / `selectedBackgroundId` / `selectedTemplateId` 상태가 유지된다.
- [ ] 3단계(`step === 'editor'`)로 이동하면 토글과 우측 패널 전체가 사라진다. 다시 2단계로 돌아왔을 때 토글 상태가 마지막 선택값 그대로다.
- [ ] 구도 선택 모드에서 `TemplateCard` 를 클릭하면 좌측 `EditorCanvas` 의 요소 배치가 해당 템플릿으로 바뀐다. (단, 편집 내역은 초기화됨 — §6.2 참조)
- [ ] 스크린리더에서 `tablist` / `tab` 으로 인식되는지 확인.

---

## 8. 파일 변경 요약

| 파일 | 변경 내용 |
|---|---|
| [editing/App.tsx](../react/src/modules/editing/App.tsx) | `rightPanelMode` state 추가, 토글 JSX 삽입, 카드 그리드 분기 렌더 |
| [editing/styles/global.css](../react/src/modules/editing/styles/global.css) | `.choice-toggle`, `.choice-toggle__btn`, `.choice-toggle__btn--active` 클래스 추가 |

신규 컴포넌트 파일이나 훅은 만들지 않았습니다. 토글은 단순 state + JSX/CSS 조합으로만 구현됐습니다.

---

## 9. 향후 확장 여지 (참고용)

- **키보드 네비게이션**: 좌/우 화살표로 탭 이동. `onKeyDown` 핸들러에서 `ArrowLeft`/`ArrowRight` 처리.
- **더 많은 모드**: 현재는 2-way 토글이지만, 예를 들어 "AI 프롬프트" 같은 제3의 모드가 생기면 `rightPanelMode` 를 유니온 타입에 값 하나 추가하고 `grid-template-columns: repeat(N, 1fr)` 로 바꾸면 됩니다.
- **편집 내역 보존**: 구도 선택 시 elements 를 덮어쓰기 전에 사용자 편집 사항이 있는지 감지해 확인창을 띄우는 로직.
- **애니메이션**: 카드 그리드 교체 시 fade-in/out 트랜지션. 현재는 즉시 교체.

관련 문서: [EDITING_MODULE.md](EDITING_MODULE.md) — editing 모듈 전체 구조와 2단계/3단계 렌더 상세.
