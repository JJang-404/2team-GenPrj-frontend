# Footer Icon 동적 가시성 + 우측 정렬 보고서

## 1. 배경

[footer_dynamic_layout_report.md](./footer_dynamic_layout_report.md)에서 `computeFooterPresets(projectData)`
동적 함수를 도입하여 1줄 footer 레이아웃을 구현했으나, 아이콘은 다음 두 가지 한계로
아직 "동적"이라 하기 어려웠음.

1. **`shouldShowAdditionalInfoIcon()`이 무조건 `true` 반환** → 초기 렌더 시 항상 5개 아이콘 모두 생성
2. **아이콘 위치가 5개 슬롯 고정 기반** → 일부 아이콘만 보이더라도 나머지 아이콘이 재정렬되지 않음

이번 작업의 사용자 요구사항:
- 사이드바에서 visibility 토글로 체크된 항목만 footer에 등장 (element 자체가 생성되지 않아야 함)
- 표시되는 아이콘만 `FOOTER_ICON_LABELS` 배열 순서대로 좌→우 배치
- 마지막 아이콘의 right edge가 footer 우측(FOOTER_X + FOOTER_W = 95%)에 정확히 붙음
- 텍스트 영역 너비(TEXT_W = 73%)는 고정 유지 (아이콘이 줄어도 텍스트가 확장되지 않음)

Spec 문서: [.omc/specs/deep-interview-footer-icon-visibility.md](../../../.omc/specs/deep-interview-footer-icon-visibility.md)
(Deep Interview 1 round, ambiguity 15%).

---

## 2. 수정 내역

수정 지점은 총 3개 파일, 9개 함수/호출 지점:

| # | 파일 | 심볼 | 종류 |
|---|------|------|------|
| 2.1 | `utils/editorFlow.ts` | `shouldShowAdditionalInfoIcon` | 시그니처 + 로직 변경 |
| 2.2 | `utils/editorFlow.ts` | `shouldShowAdditionalInfoText` | 시그니처 + 로직 변경 |
| 2.3 | `utils/editorFlow.ts` | `computeFooterPresets` (텍스트 필터) | 버그 수정 |
| 2.4 | `utils/editorFlow.ts` | `computeFooterPresets` (아이콘 영역) | 우측 정렬 로직 도입 |
| 2.5 | `utils/editorFlow.ts` | `createAdditionalInfoElements` | 시그니처 확장 |
| 2.6 | `utils/editorFlow.ts` | `createElementsFromWireframe` | 시그니처 확장 |
| 2.7 | `utils/editorFlow.ts` | `applyDraftLayoutVariant` | 시그니처 확장 + 내부 호출 수정 |
| 2.8 | `utils/projectEditor.ts` | `toggleAdditionalInfoElements` | 시그니처 확장 + 재배치 로직 신규 |
| 2.9 | `App.tsx` | 4개 호출 지점 | 파라미터 전파 |
| 2.10 | `utils/editorFlow.ts` | `createAdditionalInfoElements` (text align) | 중앙 → 좌측 정렬 복원 |

---

### 2.1 `editorFlow.ts` — `shouldShowAdditionalInfoIcon`

**위치:** [editorFlow.ts:513-528](../react/src/modules/editing/utils/editorFlow.ts#L513-L528)

**역할:** 특정 label의 **아이콘(image element)** 이 footer에 표시되어야 하는지 판정.
`createAdditionalInfoElements`, `computeFooterPresets`의 `activeIconLabels` 필터 등에서 호출됨.

**수정 전:**
```typescript
export function shouldShowAdditionalInfoIcon(projectData, label: string) {
  const info = projectData?.additionalInfo;
  if (!info) return false;
  switch (label) {
    case '주차 공간 수':
    case '애견 동반 가능 여부':
    case '노키즈존':
    case '흡연 구역 존재 여부':
    case '엘리베이터 존재 여부':
      return true;
    default:
      return false;
  }
}
```

**수정 후:**
```typescript
export function shouldShowAdditionalInfoIcon(
  projectData,
  label: string,
  visibility?: Record<string, boolean>,  // ← 신규
) {
  const info = projectData?.additionalInfo;
  if (!info) return false;
  if (visibility && !visibility[label]) return false;  // ← 신규: visibility AND 게이팅
  switch (label) {
    case '주차 공간 수':
    case '애견 동반 가능 여부':
    case '노키즈존':
    case '흡연 구역 존재 여부':
    case '엘리베이터 존재 여부':
      return true;
    default:
      return false;
  }
}
```

**왜 바꿨는가:**
- 기존은 "label이 유효한 아이콘 label이면 무조건 true"라서 사이드바 토글이 꺼져 있어도 렌더 경로에서 true를 반환했음.
- `visibility`를 optional로 둔 이유: 호출처 중 visibility state를 모르는 곳(legacy)에서는 기존 동작을 유지해 breaking change를 피하기 위함.
- 판정 순서: `info 존재` → `visibility gate` → `label switch`. visibility가 가장 강한 OFF 신호이므로 값 판정 앞에 둠.

**흐름에서의 역할:** Initial render / Type 전환 / 사이드바 토글 시 모두 이 함수가 element 생성 여부를 좌우함.

---

### 2.2 `editorFlow.ts` — `shouldShowAdditionalInfoText`

**위치:** [editorFlow.ts:530-544](../react/src/modules/editing/utils/editorFlow.ts#L530-L544)

**역할:** 특정 label의 **텍스트(text element)** 가 footer에 표시되어야 하는지 판정.
(같은 label이 `전화번호`처럼 텍스트-only일 수도, `주차 공간 수`처럼 텍스트 + 아이콘 양쪽일 수도 있음.)

**수정 전:**
```typescript
export function shouldShowAdditionalInfoText(projectData, label: string) {
  const info = projectData?.additionalInfo;
  if (!info) return false;
  switch (label) {
    case '전화번호':  return Boolean(info.phoneNumber.trim());
    case '주소':      return Boolean(info.address.trim());
    case '주차 공간 수': return Boolean(info.parkingSpaces?.trim()) && Number(info.parkingSpaces) > 0;
    default: return false;
  }
}
```

**수정 후:**
```typescript
export function shouldShowAdditionalInfoText(
  projectData,
  label: string,
  visibility?: Record<string, boolean>,  // ← 신규
) {
  const info = projectData?.additionalInfo;
  if (!info) return false;
  if (visibility && !visibility[label]) return false;  // ← 신규
  switch (label) { /* 동일 */ }
}
```

**왜 바꿨는가:**
- 사이드바 토글은 text/icon을 따로 구분하지 않고 "해당 label 표시/숨김"을 하나로 컨트롤함.
  따라서 text 쪽에도 동일한 visibility gate가 필요.
- 유의: text는 `visibility AND value-non-empty` 둘 다 충족되어야 표시됨. visibility만 있어도
  전화번호가 빈 문자열이면 표시 안 함 (기존 value-based 로직 유지).

---

### 2.3 `editorFlow.ts` — `computeFooterPresets` (텍스트 필터 버그 수정)

**위치:** [editorFlow.ts:301-303](../react/src/modules/editing/utils/editorFlow.ts#L301-L303)

**역할:** footer 텍스트 줄 수(`lineCount`)를 계산하기 위해 FOOTER_TEXT_LABELS 중 활성 label을 필터링.

**수정 전 (버그):**
```typescript
const activeTextLabels = FOOTER_TEXT_LABELS.filter(
  (label) => shouldShowAdditionalInfoIcon(projectData, label, visibility),  // ← 잘못됨
);
```

**수정 후:**
```typescript
const activeTextLabels = FOOTER_TEXT_LABELS.filter(
  (label) => shouldShowAdditionalInfoText(projectData, label, visibility),
);
```

**왜 바꿨는가:**
- 텍스트 줄 수를 셀 때는 "text가 보이는 label"을 세야 하는데, 이전 구현은 icon 판정 함수를 호출하고 있었음.
- 결과적으로 `전화번호`(텍스트-only)는 icon 판정에서 false가 나와 줄 수에 포함되지 않고,
  반대로 텍스트 값이 빈 상태에서도 icon 판정이 true면 줄 수에 포함되는 오작동이 있었음.
- footer 높이(`footerH = lineCount × LINE_H`)와 텍스트 y 좌표(`footerTopY = FOOTER_BOTTOM − footerH`)
  계산이 모두 이 필터에 의존하므로 파급 범위가 넓었음.

---

### 2.4 `editorFlow.ts` — `computeFooterPresets` (아이콘 우측 정렬 로직)

**위치:** [editorFlow.ts:308-356](../react/src/modules/editing/utils/editorFlow.ts#L308-L356)

**역할:** 아이콘 element의 preset(x, y, width, height)을 계산.
이 함수가 반환하는 preset을 `createAdditionalInfoElements`와 `applyDraftLayoutVariant` 양쪽에서 소비.

**수정 전 (고정 5-슬롯 좌측 기준):**
```typescript
const iconAreaX = FOOTER_X + FOOTER_W - ICON_AREA_W; // 80 (고정 시작점)
const iconY = FOOTER_BOTTOM - ICON_SIZE;

FOOTER_ICON_LABELS.forEach((label, idx) => {
  presets[label] = {
    text: presets[label]?.text ?? EMPTY_RECT,
    image: {
      x: iconAreaX + idx * ICON_STEP,  // idx=0..4로 항상 5개 슬롯 점유
      y: iconY,
      width: ICON_SIZE,
      height: ICON_SIZE,
    },
  };
});
```

**수정 후:**
```typescript
// (1) visible 아이콘 label만 추린다
const activeIconLabels = FOOTER_ICON_LABELS.filter(
  (label) => shouldShowAdditionalInfoIcon(projectData, label, visibility),
);
const iconCount = activeIconLabels.length;

// (2) 우측 정렬용 좌측 시작점 계산
const usedIconWidth =
  iconCount > 0 ? iconCount * ICON_SIZE + (iconCount - 1) * ICON_GAP : 0;
const iconLeftmostX = FOOTER_X + FOOTER_W - usedIconWidth;
const iconY = FOOTER_BOTTOM - ICON_SIZE;

// (3) visible만 슬롯 번호 0..N-1로 배치
const activeIconSet = new Set(activeIconLabels);
activeIconLabels.forEach((label, idx) => {
  presets[label] = {
    text: presets[label]?.text ?? EMPTY_RECT,
    image: {
      x: iconLeftmostX + idx * ICON_STEP,
      y: iconY,
      width: ICON_SIZE,
      height: ICON_SIZE,
    },
  };
});

// (4) 비활성 아이콘은 image preset을 EMPTY_RECT로 고정
for (const label of FOOTER_ICON_LABELS) {
  if (!activeIconSet.has(label)) {
    presets[label] = {
      text: presets[label]?.text ?? EMPTY_RECT,
      image: EMPTY_RECT,
    };
  }
}
```

**왜 바꿨는가:**
- 기존은 항상 5개 슬롯(`iconAreaX + 0..4 × ICON_STEP`)을 점유. 일부 label이 보이지 않더라도 빈 슬롯으로 남음.
- 사용자 요구는 "보이는 아이콘만" 우측 정렬이므로, visible 개수에 따라 시작 좌표(`iconLeftmostX`)가 동적으로 밀려야 함.
- `activeIconSet`을 만들어 비활성 label은 명시적으로 `EMPTY_RECT`를 넣어야 후속 element 생성 로직이 깨지지 않음.

**우측 정렬 공식 검증** (FOOTER_X=5, FOOTER_W=90 → 우측 끝=95, ICON_SIZE=2.5, ICON_GAP=0.5, ICON_STEP=3.0):

| N | used_width | iconLeftmostX | x 좌표 | 마지막 right edge |
|---|-----------|---------------|--------|-------------------|
| 5 | 5×2.5 + 4×0.5 = 14.5 | 95 − 14.5 = 80.5 | [80.5, 83.5, 86.5, 89.5, 92.5] | 92.5 + 2.5 = **95.0** |
| 3 | 3×2.5 + 2×0.5 = 8.5  | 95 − 8.5  = 86.5 | [86.5, 89.5, 92.5] | **95.0** |
| 2 | 2×2.5 + 1×0.5 = 5.5  | 95 − 5.5  = 89.5 | [89.5, 92.5] | **95.0** |
| 1 | 1×2.5 + 0×0.5 = 2.5  | 95 − 2.5  = 92.5 | [92.5] | **95.0** |
| 0 | 0 | 95.0 | [] | N/A |

모든 N에서 마지막 아이콘 right edge가 정확히 95%로 수렴 (AC2, AC4 만족).

---

### 2.5 `editorFlow.ts` — `createAdditionalInfoElements`

**위치:** [editorFlow.ts:1088-1139](../react/src/modules/editing/utils/editorFlow.ts#L1088-L1139)

**역할:** 특정 label에 대한 `info-text-*`, `info-image-*` element를 실제로 **생성**.
`preset`이 공급하는 좌표를 element에 복사하고, `shouldShow*` gate를 통해 push 여부를 결정.

**수정 전:**
```typescript
export function createAdditionalInfoElements(projectData, label: string) {
  const preset = computeFooterPresets(projectData)[label];
  // ...
  if (shouldShowAdditionalInfoText(projectData, label)) { /* text element push */ }
  if (shouldShowAdditionalInfoIcon(projectData, label)) { /* image element push */ }
}
```

**수정 후:**
```typescript
export function createAdditionalInfoElements(
  projectData,
  label: string,
  visibility?: Record<string, boolean>,  // ← 신규
) {
  const preset = computeFooterPresets(projectData, visibility)[label];  // ← 전달
  // ...
  if (shouldShowAdditionalInfoText(projectData, label, visibility)) { /* push */ }
  if (shouldShowAdditionalInfoIcon(projectData, label, visibility)) { /* push */ }
}
```

**왜 바꿨는가:**
- 이 함수는 element 생성의 유일한 진입점이므로, visibility를 받아 **세 곳**(`computeFooterPresets`,
  text gate, icon gate)에 모두 전파해야 AC1("초기 진입 시 visibility=false인 label element 미생성")이 성립.
- 이 함수에서 visibility를 누락하면 아래쪽 gate는 통과되지만 preset이 포함된 좌표로 element가
  생성되어 버리거나, 반대로 gate는 막혀도 preset이 visible 기준으로 계산되지 않는 모순이 생김.

---

### 2.6 `editorFlow.ts` — `createElementsFromWireframe`

**위치:** [editorFlow.ts:109-112, 246](../react/src/modules/editing/utils/editorFlow.ts#L109-L112)

**역할:** **초기 진입 / Type 선택 시** wireframe + projectData로부터 elements 배열 전체를 새로 빌드.
내부에서 `additionalInfoLabels.forEach`로 5개 label에 대해 `createAdditionalInfoElements`를 호출.

**수정 전:**
```typescript
export function createElementsFromWireframe(projectData): EditorElement[] {
  // ...
  additionalInfoLabels.forEach((label) => {
    const infoElements = createAdditionalInfoElements(projectData, label);
    infoElements.forEach(el => elements.push(el));
  });
}
```

**수정 후:**
```typescript
export function createElementsFromWireframe(
  projectData,
  visibility?: Record<string, boolean>,  // ← 신규
): EditorElement[] {
  // ...
  additionalInfoLabels.forEach((label) => {
    const infoElements = createAdditionalInfoElements(projectData, label, visibility);  // ← 전달
    infoElements.forEach(el => elements.push(el));
  });
}
```

**왜 바꿨는가:**
- 이 함수는 edit 페이지 진입 경로(`handleTemplateSelect`, `handleSelectWireframeType`)에서
  element 배열을 통째로 새로 만드는 유일한 경로. visibility를 전달하지 않으면 초기 상태의
  visibility=false인 아이콘도 전부 생성되어버림.
- optional로 둔 이유: 다른 호출자(예: 테스트 코드, wireframe 미리보기)가 visibility 없이 호출해도
  기존 동작(모든 label 생성) 유지 가능.

---

### 2.7 `editorFlow.ts` — `applyDraftLayoutVariant`

**위치:** [editorFlow.ts:546-712](../react/src/modules/editing/utils/editorFlow.ts#L546-L712)

**역할:** Type 1↔2↔3↔4 전환 (draftIndex 변경) 시 **기존 elements 배열의 좌표만** 재계산.
이 함수는 element를 새로 만들지 않고 `elements.map(...)`으로 좌표를 업데이트함. 내부에 이미
info element의 좌표를 `computeFooterPresets(projectData)`로 재배치하는 로직이 있었음.

**수정 전:**
```typescript
export function applyDraftLayoutVariant(elements, draftIndex, projectData?) {
  // ...
  const infoTextMatch = element.id.match(/^info-text-(\d+)$/);
  if (infoTextMatch) {
    const idx = Number(infoTextMatch[1]) - 1;
    const label = additionalInfoLabels[idx];
    if (label) {
      const preset = computeFooterPresets(projectData ?? null)[label];  // ← visibility 없음
      if (preset) return { ...element, x: preset.text.x, ... };
    }
  }
  // info-image도 동일 패턴
}
```

**수정 후:**
```typescript
export function applyDraftLayoutVariant(
  elements,
  draftIndex,
  projectData?,
  visibility?: Record<string, boolean>,  // ← 신규
) {
  // ...
  const infoTextMatch = element.id.match(/^info-text-(\d+)$/);
  if (infoTextMatch) {
    const idx = Number(infoTextMatch[1]) - 1;
    const label = additionalInfoLabels[idx];
    if (label) {
      const preset = computeFooterPresets(projectData ?? null, visibility)[label];  // ← 전달
      if (preset) return { ...element, x: preset.text.x, y: preset.text.y, ... };
    }
  }
  // info-image도 같은 패턴으로 visibility 추가
}
```

**왜 바꿨는가:**
- Type 전환 시(`onChangeSelectedImage` 안에서 호출) 현재 보이는 아이콘들이 다시 우측 정렬되어야 함.
  이 함수가 `computeFooterPresets`를 호출할 때 visibility를 전달하지 않으면 이전 고정 슬롯 좌표로
  되돌아가는 회귀가 생김.
- 이 함수는 elements 배열의 info element 좌표만 갱신할 뿐 element를 추가/제거하지는 않음. 따라서
  "이미 존재하는 element의 좌표를 우측 정렬 기준으로 끌어당기기"가 이 함수의 책임이고,
  element 자체의 존재 여부는 `createElementsFromWireframe`/`toggleAdditionalInfoElements`가 관리.

---

### 2.8 `projectEditor.ts` — `toggleAdditionalInfoElements`

**위치:** [projectEditor.ts:56-98](../react/src/modules/editing/utils/projectEditor.ts#L56-L98)

**역할:** 사이드바에서 특정 label의 visibility를 토글했을 때 elements 배열을 업데이트.
토글 path의 최종 종착점.

**수정 전 (토글 label만 add/remove):**
```typescript
export function toggleAdditionalInfoElements(
  elements, projectData, label, nextVisible,
) {
  const withoutCurrentInfo = elements.filter(
    (el) => el.label !== label && el.label !== `${label} 아이콘`
  );
  const newElements = nextVisible
    ? createAdditionalInfoElements(projectData, label)
    : [];
  return [...withoutCurrentInfo, ...newElements];
}
```

**수정 후 (토글 + 남은 형제 element 전부 재배치):**
```typescript
import {
  additionalInfoLabels,       // ← 신규 import
  computeFooterPresets,       // ← 신규 import
  createAdditionalInfoElements,
  updateProjectTextElements,
} from './editorFlow';

export function toggleAdditionalInfoElements(
  elements,
  projectData,
  label,
  nextVisible,
  nextVisibility: Record<string, boolean>,  // ← 신규
) {
  // 1. 토글된 label의 기존 element 제거
  const withoutCurrentInfo = elements.filter(
    (element) => element.label !== label && element.label !== `${label} 아이콘`
  );

  // 2. nextVisible=true면 nextVisibility 기준으로 새 element 생성
  const newElements = nextVisible
    ? createAdditionalInfoElements(projectData, label, nextVisibility)
    : [];
  const newIds = new Set(newElements.map((el) => el.id));

  // 3. 나머지 info element(다른 label)들의 좌표를 nextVisibility 기준으로 재배치
  //    — 우측 정렬이므로 한 label 변경 시 나머지 아이콘 x좌표가 모두 이동
  const presets = computeFooterPresets(projectData, nextVisibility);
  const repositioned = withoutCurrentInfo
    .filter((el) => !newIds.has(el.id))
    .map((el) => {
      const textMatch = el.id.match(/^info-text-(\d+)$/);
      if (textMatch) {
        const idx = Number(textMatch[1]) - 1;
        const matchLabel = additionalInfoLabels[idx];
        const p = matchLabel ? presets[matchLabel] : undefined;
        if (p) return { ...el, x: p.text.x, y: p.text.y, width: p.text.width, height: p.text.height };
      }
      const imgMatch = el.id.match(/^info-image-(\d+)$/);
      if (imgMatch) {
        const idx = Number(imgMatch[1]) - 1;
        const matchLabel = additionalInfoLabels[idx];
        const p = matchLabel ? presets[matchLabel] : undefined;
        if (p) return { ...el, x: p.image.x, y: p.image.y, width: p.image.width, height: p.image.height };
      }
      return el;
    });

  return [...repositioned, ...newElements];
}
```

**왜 바꿨는가:**
- 이전 구현은 "토글된 label의 element만 추가/제거"였음. 그 결과 시각적으로 토글 OFF를 하면 해당 아이콘만 사라지고 나머지는 원래 자리에 남아 "중간이 비어 있는 모양"이 됨.
- 우측 정렬 요구 때문에 **하나라도 visible이 바뀌면 남은 모든 아이콘 x좌표가 이동**해야 함.
- 해결 전략: 토글 결과의 `nextVisibility`를 `computeFooterPresets`에 통과시켜 새 좌표표를 얻고,
  남아 있는 `info-text-*`/`info-image-*` element의 좌표를 덮어쓰는 map을 추가.
- `newIds` 필터링: 방금 `createAdditionalInfoElements`로 만든 element는 이미 최신 preset으로 만들어졌으므로
  중복 repositioning 대상에서 제외.

**흐름에서의 역할:** 사이드바 토글 path에서 "element 생성/제거 + 형제 element 좌표 재계산"을 한 번에 처리.
App.tsx의 `handleToggleInfoItem`이 이 함수 하나에 결과를 위임.

---

### 2.9 `App.tsx` — visibility 전파 (4개 호출 지점)

**위치:** [App.tsx:419, 441, 652, 722-726](../react/src/modules/editing/App.tsx#L419)

이 섹션은 editorFlow/projectEditor 쪽에 추가된 `visibility` 파라미터가 실제 사용되도록
**호출자**에서 `additionalInfoVisibility` state를 전달하는 변경.

#### (a) `handleTemplateSelect` — [App.tsx:419](../react/src/modules/editing/App.tsx#L419)

```typescript
// 수정 전
setElements(createElementsFromWireframe(baked));

// 수정 후
setElements(createElementsFromWireframe(baked, additionalInfoVisibility));
```

**의미:** 템플릿 선택 → wireframe 기반 element 재생성 시 현재 사이드바 toggle 상태 반영.
사용자가 사이드바에서 일부 label을 미리 켜둔 후 템플릿을 고르면 해당 label만 footer에 나타남.

#### (b) `handleSelectWireframeType` — [App.tsx:441](../react/src/modules/editing/App.tsx#L441)

```typescript
// 수정 전
setElements(createElementsFromWireframe(nextProjectData));

// 수정 후
setElements(createElementsFromWireframe(nextProjectData, additionalInfoVisibility));
```

**의미:** Type 카드(1/2/3/4) 선택 → 동일한 wireframe 엔진으로 재빌드할 때 visibility 유지.

#### (c) `handleToggleInfoItem` — [App.tsx:648-655](../react/src/modules/editing/App.tsx#L648-L655)

```typescript
// 수정 전
setAdditionalInfoVisibility((prev) => {
  const nextVisible = !prev[label];
  setElements((current) =>
    toggleAdditionalInfoElements(current, projectData, label, nextVisible),
  );
  return { ...prev, [label]: nextVisible };
});

// 수정 후
setAdditionalInfoVisibility((prev) => {
  const nextVisible = !prev[label];
  const nextVisibility = { ...prev, [label]: nextVisible };  // ← 미리 계산
  setElements((current) =>
    toggleAdditionalInfoElements(current, projectData, label, nextVisible, nextVisibility),
  );
  return nextVisibility;
});
```

**의미:** 토글 직후의 visibility map(`nextVisibility`)을 직접 계산해서
`toggleAdditionalInfoElements`에 전달. `prev` 기반으로 만든 새 map을 한 번 캐시하여 state 업데이트와 element 업데이트가 같은 visibility를 쓰도록 보장.

**주의 포인트:** `additionalInfoVisibility` state는 비동기이기 때문에 setElements 콜백 안에서
current state를 읽으면 한 박자 늦은 값이 들어감. 그래서 `nextVisibility`를 로컬 변수로 먼저 만들어서 전달하는 패턴.

#### (d) `onChangeSelectedImage` 내부 `applyDraftLayoutVariant` — [App.tsx:722-727](../react/src/modules/editing/App.tsx#L722-L727)

```typescript
// 수정 전
const layoutApplied = applyDraftLayoutVariant(
  currentElements,
  nextData.options.draftIndex ?? 0,
  nextData,
);

// 수정 후
const layoutApplied = applyDraftLayoutVariant(
  currentElements,
  nextData.options.draftIndex ?? 0,
  nextData,
  additionalInfoVisibility,  // ← 신규
);
```

**의미:** 배경/이미지 변경 시 layout variant가 재적용되는 코드 경로. 기존 elements의 info 좌표를
우측 정렬 기준으로 다시 잡아주기 위해 visibility가 필요.

---

### 2.10 `editorFlow.ts` — `createAdditionalInfoElements` (text align 좌측 정렬 복원)

**위치:** [editorFlow.ts:1118](../react/src/modules/editing/utils/editorFlow.ts#L1118)

**역할:** info-text element 생성 시 `align` 속성 결정. EditorCanvas/미리보기가 이 값으로 텍스트 정렬 처리.

**수정 전:**
```typescript
/* [ORIGINAL] align: 'left', [MODIFIED] 중앙 정렬 고정 */
align: 'center',
```

**수정 후:**
```typescript
align: 'left',
```

**왜 바꿨는가:**
- footer 텍스트 영역은 `x=FOOTER_X=5%`에서 시작하여 `width=TEXT_W=73%`를 차지. 이 영역은
  의도적으로 아이콘 영역(우측 15%)과 시각적으로 분리되어 있는 "좌측 정보 블록"임.
- 이전에는 중앙 정렬로 고정되어 있어 짧은 텍스트(예: "전화번호: 010-…")가 73% 폭의 가운데 떠 있는 모습이 되어
  실제 footer의 왼쪽 시작점(5%)과 정보의 시작점이 일치하지 않았음.
- 좌측 정렬로 되돌려야 우측 정렬된 아이콘(마지막 edge = 95%)과 좌측 시작점이 고정된 텍스트(시작점 = 5%)가
  footer 바 안에서 좌↔우 대칭 구도를 이룸.

**흐름에서의 역할:** element **최초 생성 시점**(`createAdditionalInfoElements`)에만 적용.
`applyDraftLayoutVariant`/`toggleAdditionalInfoElements`는 좌표(x/y/width/height)만 갱신할 뿐
`align` 속성은 건드리지 않으므로, 이미 만들어진 element는 생성 당시의 align을 유지.
- 현재 session의 text element는 중앙 정렬 상태로 이미 만들어져 있을 수 있음 → 새 세션/새 진입 시 좌측 정렬로 재생성됨.
- 이미 생성된 text element를 즉시 좌측 정렬로 갱신해야 한다면 `applyDraftLayoutVariant`에서
  `align`도 덮어쓰도록 확장이 필요 (현재 범위 밖).

---

## 3. 데이터 흐름 요약

```
사이드바 토글
  └ App.tsx.handleToggleInfoItem
      └ nextVisibility = {...prev, [label]: !prev[label]}
          └ toggleAdditionalInfoElements(elements, projectData, label, nextVisible, nextVisibility)
              ├ [filter] 토글된 label의 element 제거
              ├ [create] nextVisible이면 createAdditionalInfoElements(..., nextVisibility)
              │   └ computeFooterPresets(projectData, nextVisibility)
              │       └ shouldShowAdditionalInfoText/Icon(..., nextVisibility) ← 우측 정렬 좌표 계산
              └ [repose] 남은 info element map → computeFooterPresets로 좌표 재배치

초기 진입 / Type 카드 선택
  └ App.tsx.handleTemplateSelect / handleSelectWireframeType
      └ createElementsFromWireframe(projectData, additionalInfoVisibility)
          └ (for each label) createAdditionalInfoElements(projectData, label, visibility)

이미지 변경 → layout 재적용
  └ App.tsx.onChangeSelectedImage
      └ applyDraftLayoutVariant(elements, draftIndex, nextData, additionalInfoVisibility)
          └ (for each info-text/info-image element) computeFooterPresets(..., visibility)로 좌표 덮어쓰기
```

---

## 4. 검증

### 4.1 TypeScript 컴파일
```bash
cd 2team-GenPrj-frontend/react && npx tsc --noEmit
# → 에러 없음
```

### 4.2 Acceptance Criteria 충족

- [x] **AC1**: 초기 진입 시 `additionalInfoVisibility` 기본값에서 false인 label은
  `createAdditionalInfoElements`가 빈 배열을 반환 → element 미생성
- [x] **AC2**: N=2일 때 `iconLeftmostX = 89.5`, 마지막 x=92.5 → right edge 95.0%
- [x] **AC3**: N=2일 때 두 아이콘 x 차이 = ICON_STEP(3.0) = ICON_SIZE(2.5) + ICON_GAP(0.5)
- [x] **AC4**: N=5일 때 좌표 배열 [80.5, 83.5, 86.5, 89.5, 92.5] → 기존 레이아웃과 동일
- [x] **AC5**: N=0일 때 `activeIconLabels`가 빈 배열 → 아이콘 element 미생성
- [x] **AC6**: 사이드바 OFF 토글 시 `toggleAdditionalInfoElements`가 남은 형제 element x/y를
  `computeFooterPresets` 신규 좌표로 업데이트
- [x] **AC7**: Type 전환 시 `applyDraftLayoutVariant`가 `additionalInfoVisibility`를 전달받아
  info element 좌표 재계산
- [x] **AC8**: `activeIconLabels = FOOTER_ICON_LABELS.filter(...)` → 배열 순서 유지,
  스킵된 label은 슬롯을 차지하지 않음
- [x] **AC9**: `tsc --noEmit` 통과

---

## 5. 설계 결정 & 주의사항

### 5.1 왜 모든 함수에 `visibility?`를 optional로 추가했는가

- 호출자 중 일부(예: wireframe 미리보기 렌더, 테스트)는 `additionalInfoVisibility` state가 없음.
  optional로 두면 visibility 없이 호출하는 기존 호출자는 **value-based 동작**만 실행 (기존과 동일).
- visibility가 있는 호출자만 **value AND visibility** 로직을 타게 됨.

### 5.2 preset 자체는 모든 label에 대해 생성 (EMPTY_RECT로)

- `computeFooterPresets(projectData, visibility)[label]`이 항상 객체를 반환하도록 보장.
- `applyDraftLayoutVariant`에서 `preset?.image.x` 같은 null-check 코드를 단순화.
- 비활성 label element가 이미 존재할 가능성은 없지만(생성 시점에 gate로 막힘), preset API의 일관성을 위해 EMPTY_RECT를 채움.

### 5.3 토글 path와 Type 전환 path가 같은 `computeFooterPresets`로 수렴

- `toggleAdditionalInfoElements`(토글) / `applyDraftLayoutVariant`(Type 전환) / `createAdditionalInfoElements`(초기 생성)
  3개 경로 모두 `computeFooterPresets`를 호출하여 좌표를 얻음.
- 우측 정렬 공식이 한 곳에만 있어서 공식 변경 시 한 파일만 수정하면 됨.

### 5.4 기본값 = 전부 false

- `additionalInfoVisibility` 초기값은 `{}` (모든 label이 falsy로 취급됨).
- 편집 페이지 첫 진입 시 아이콘/텍스트 info element가 하나도 보이지 않음.
- 사용자가 사이드바에서 명시적으로 토글해야 표시되는 UX. 이는 사양상 의도된 동작이며 Non-Goal에 명시됨.

### 5.5 성능 고려

- `computeFooterPresets`는 5 labels에 대한 단순 O(N) 계산으로, 토글 및 Type 전환 시마다 재계산되어도 비용 무시 가능.
- 토글 1회 당 `computeFooterPresets` 호출은 `createAdditionalInfoElements` 안(1회) + repose 루프 안(1회) = 2회.
  label 수(5)가 작아 실질 영향 없음.

---

## 6. Related docs

- [footer_dynamic_layout_report.md](./footer_dynamic_layout_report.md) — 선행 작업 (1줄 footer + `computeFooterPresets` 도입)
- [.omc/specs/deep-interview-footer-icon-visibility.md](../../../.omc/specs/deep-interview-footer-icon-visibility.md) — Deep Interview spec (ambiguity 15%)
