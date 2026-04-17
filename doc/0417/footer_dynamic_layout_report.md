# additionalInfo Footer 1줄 동적 레이아웃 보고서

## 1. 문제

### 1.1 기존 구현

`additionalInfo` footer는 editor에서 7개 항목(전화번호, 주소, 주차/애견/노키즈/흡연/엘리베이터)을
표시하기 위해 **정적 `additionalInfoPresets` 객체**로 하드코딩된 좌표를 사용하고 있었음.

```typescript
// editorFlow.ts (기존)
const additionalInfoPresets: Record<string, { text: Rect; image: Rect }> = {
  '전화번호':          { text: {x:5,  y:92.5, w:90, h:3}, image: {...} },
  '주소':              { text: {x:5,  y:96,   w:90, h:3}, image: {...} },
  '주차 공간 수':       { text: {...}, image: {x:75, y:90, w:7, h:7} },
  '애견 동반 가능 여부': { text: {...}, image: {x:82, y:90, w:7, h:7} },
  // ... 5개 아이콘
};
```

### 1.2 문제점

| 문제 | 설명 |
|------|------|
| **2줄 레이아웃 강제** | 전화번호(y=92.5), 주소(y=96) 두 줄로 고정. 1줄 footer 구현 불가 |
| **주차장 이중 역할 불가** | 주차장은 아이콘으로만 존재. 이미지 예시의 "주차장 n 대까지 수용 가능" 텍스트 표현 불가 |
| **Type별 불일치** | `createElementsFromWireframe`의 inner override로 Type별 다른 좌표 생성 가능 |
| **3개 초기화 시점 불일치** | `createElementsFromWireframe`, `createAdditionalInfoElements`, `applyDraftLayoutVariant`에서 각기 다른 경로로 좌표 적용 |

### 1.3 목표

이미지 예시 기준 1줄 footer로 리팩토링:

```
┌──────────────────────────────────────────────────────┐
│ 전화번호: aaa-bbbb-cccc         │                   │
│ 주소: aa시 bb로 cc층            │                   │
│ 주차장 n 대까지 수용 가능        │ 🅿️ 🐕 👶 🚬 🛗  │
└──────────────────────────────────────────────────────┘
```

- 좌측: 텍스트 3줄 (전화번호, 주소, 주차장)
- 우측: 아이콘 5개 수평 1줄 (footer 하단 정렬)
- 주차장: 텍스트 + 아이콘 양쪽 표시
- 모든 Type(1~4) 공통 적용
- 텍스트 비어있으면 해당 줄 생략, footer 높이 자동 조절

## 2. 해결 방법

### 2.1 정적 프리셋 → 동적 함수로 교체

`additionalInfoPresets` 정적 객체를 **`computeFooterPresets(projectData)` 동적 함수**로 교체.

**상수 정의:**

```typescript
const FOOTER_BOTTOM = 96;                      // 캔버스 하단 안전 영역 y%
const FOOTER_X = 5;                            // 좌측 마진 %
const FOOTER_W = 90;                           // 전체 너비 %
const LINE_H = 2.5;                            // 텍스트 1줄 높이 %
const ICON_SIZE = LINE_H;                      // 아이콘 크기 (정사각형)
const ICON_GAP = 0.5;                          // 아이콘 간 간격
const TEXT_ICON_GAP = 2;                       // 텍스트-아이콘 영역 간격
const ICON_STEP = ICON_SIZE + ICON_GAP;        // 3.0
const ICON_AREA_W = 5 * ICON_STEP;             // 15 (아이콘 5개 고정 너비)
const TEXT_W = FOOTER_W - ICON_AREA_W - TEXT_ICON_GAP;  // 73
```

**동적 로직:**

```typescript
export function computeFooterPresets(
  projectData: HomeProjectData | null,
): Record<string, FooterPreset> {
  // 1. 활성 텍스트 항목 수집 (shouldShowAdditionalInfoText === true)
  const activeTextLabels = FOOTER_TEXT_LABELS.filter(
    (label) => shouldShowAdditionalInfoText(projectData, label),
  );

  // 2. 줄 수에 따라 footer 높이 동적 산출
  const lineCount = activeTextLabels.length;
  const footerH = Math.max(lineCount, 1) * LINE_H;
  const footerTopY = FOOTER_BOTTOM - footerH;

  // 3. 아이콘 영역: 우측 정렬 + 하단 정렬
  const iconAreaX = FOOTER_X + FOOTER_W - ICON_AREA_W;
  const iconY = FOOTER_BOTTOM - ICON_SIZE;

  // 4. 텍스트 preset: x=5%, width=73%, y=순차 배치
  // 5. 아이콘 preset: footer 하단 (y=93.5%), 좌→우 수평 배치
  // 6. 주차장: 텍스트 + 아이콘 양쪽 모두 할당

  return presets;
}
```

**핵심 특성:**

- **단일 관리 지점**: 좌표 계산 로직이 한 곳에만 존재
- **Bottom-up 포지셔닝**: `FOOTER_BOTTOM = 96%` 고정, 줄 수에 따라 위로 확장
- **동적 높이**: 텍스트 0~3줄에 따라 footer 높이 자동 조절
- **Type-agnostic**: 모든 Type(1~4)에 동일 적용

### 2.2 주차장 이중 역할 처리

주차장(`'주차 공간 수'`)은 유일하게 **텍스트 + 아이콘 양쪽**에 포함:

```typescript
const FOOTER_TEXT_LABELS = ['전화번호', '주소', '주차 공간 수'];
const FOOTER_ICON_LABELS = [
  '주차 공간 수',       // 텍스트에도 있음
  '애견 동반 가능 여부',
  '노키즈존',
  '흡연 구역 존재 여부',
  '엘리베이터 존재 여부',
];
```

`computeFooterPresets`는 단일 label이 텍스트/아이콘 양쪽에 존재하는 경우를 자연스럽게 처리
(마지막 할당이 양쪽 preset을 덮어쓰지 않고 병합됨).

### 2.3 주차장 텍스트 표시 로직

`additionalInfo.ts`의 `getAdditionalInfoDisplayText()`에 주차장 분기 추가:

```typescript
case '주차 공간 수': {
  const n = Number(info.parkingSpaces);
  return n > 0 ? `주차장 ${info.parkingSpaces} 대까지 수용 가능` : '';
}
```

`editorFlow.ts`의 `shouldShowAdditionalInfoText()`에 주차장 활성 조건 추가:

```typescript
case '주차 공간 수':
  return Boolean(info.parkingSpaces?.trim()) && Number(info.parkingSpaces) > 0;
```

### 2.4 3개 초기화 시점 통합

**(a) `createAdditionalInfoElements(projectData, label)`:**

```typescript
// 기존
const preset = additionalInfoPresets[label];
// 수정
const preset = computeFooterPresets(projectData)[label];
```

**(b) `createElementsFromWireframe()` — inner override 블록 제거:**

```typescript
// 기존 (14줄)
additionalInfoLabels.forEach((label) => {
  if (shouldShowAdditionalInfoText(projectData, label)) {
    const infoElements = createAdditionalInfoElements(projectData, label);
    infoElements.forEach(el => {
      if (el.id.startsWith('info-text-')) {
        const preset = additionalInfoPresets[label];
        el.x = preset ? preset.text.x : 5;
        el.width = preset ? preset.text.width : 90;
        el.align = 'center';
        el.fontSize = 11;
        el.color = DEFAULT_TEXT_COLOR;
      }
      elements.push(el);
    });
  }
});

// 수정 (4줄) — computeFooterPresets가 정확한 좌표 생성하므로 override 불필요
additionalInfoLabels.forEach((label) => {
  const infoElements = createAdditionalInfoElements(projectData, label);
  infoElements.forEach(el => elements.push(el));
});
```

**(c) `applyDraftLayoutVariant()` — info element 재배치 로직 추가:**

```typescript
// Type 전환 시 기존 info-text-*, info-image-* element의 좌표를 최신 footer preset으로 업데이트
const infoTextMatch = element.id.match(/^info-text-(\d+)$/);
if (infoTextMatch) {
  const idx = Number(infoTextMatch[1]) - 1;
  const label = additionalInfoLabels[idx];
  if (label) {
    const preset = computeFooterPresets(projectData ?? null)[label];
    if (preset) {
      return { ...element, x: preset.text.x, y: preset.text.y,
               width: preset.text.width, height: preset.text.height };
    }
  }
}

const infoImageMatch = element.id.match(/^info-image-(\d+)$/);
// ...동일한 패턴으로 이미지 element 재배치
```

## 3. 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `editing/utils/additionalInfo.ts` | `getAdditionalInfoDisplayText()`에 주차장 분기 추가 |
| `editing/utils/editorFlow.ts` | 정적 `additionalInfoPresets` 삭제 → `computeFooterPresets()` 동적 함수 추가 |
| `editing/utils/editorFlow.ts` | `shouldShowAdditionalInfoText()`에 주차장 case 추가 |
| `editing/utils/editorFlow.ts` | `createAdditionalInfoElements()`: `computeFooterPresets(projectData)[label]` 사용 |
| `editing/utils/editorFlow.ts` | `createElementsFromWireframe()`: inner override 블록 제거 |
| `editing/utils/editorFlow.ts` | `applyDraftLayoutVariant()`: info element 재배치 로직 추가 |

## 4. 검증

### 4.1 레이아웃 계산 예시

**모든 텍스트 활성화(3줄):**
- `lineCount = 3`, `footerH = 7.5%`, `footerTopY = 88.5%`
- 텍스트: y = 88.5, 91.0, 93.5 (LINE_H=2.5씩 증가)
- 아이콘: y = 93.5 (footer 하단), x = 80, 83, 86, 89, 92 (우측 정렬)

**전화번호만 활성화(1줄):**
- `lineCount = 1`, `footerH = 2.5%`, `footerTopY = 93.5%`
- 텍스트: y = 93.5
- 아이콘: y = 93.5 (마지막 텍스트 줄과 동일)

**텍스트 모두 비어있음(0줄):**
- `lineCount = 0`, `footerH = 2.5%` (최소값 보장), `footerTopY = 93.5%`
- 아이콘만 하단 표시

### 4.2 Acceptance Criteria

- [x] AC1: footer가 캔버스 하단(y≈96%)에 1줄(좌측 텍스트 + 우측 아이콘)로 배치
- [x] AC2: 텍스트 영역에 전화번호/주소/주차장 텍스트 수직 스택
- [x] AC3: 아이콘 영역에 5개 아이콘 수평 1줄, 우측 정렬, footer 하단 정렬
- [x] AC4: 아이콘 1개 높이 = 텍스트 1줄 높이 (정사각형, 2.5% × 2.5%)
- [x] AC5: 주차장은 텍스트(좌측) + 아이콘(우측) 양쪽 표시
- [x] AC6: 모든 Type(1~4)에서 동일한 footer 레이아웃 적용
- [x] AC7: 3개 초기화 시점(editing 진입/Type 선택/배경 선택) 모두 동일 좌표 적용
- [x] AC8: 텍스트 비어있으면 해당 줄 생략, 높이 자동 조절
- [x] AC9: 텍스트 없이 아이콘만 있어도 footer 정상 표시
- [x] AC10: 기존 사이드바 토글 기능 정상 동작
- [x] AC11: TypeScript 컴파일 에러 없음 (`npx tsc --noEmit` 통과)

## 5. 설계 결정 근거 (ADR)

**Decision:** `additionalInfoPresets` 정적 객체를 `computeFooterPresets(projectData)` 동적 함수로 교체

**Drivers:**
1. 하드코딩 좌표가 2줄 레이아웃을 강제하여 1줄 footer 구현 불가
2. 주차장의 텍스트+아이콘 이중 역할을 정적 프리셋으로 표현 불가
3. 3개 초기화 시점에서 동일한 좌표 계산이 필요

**Alternatives considered:**
- **Option B: FooterLayout 복합 컴포넌트** — Non-Goal("개별 EditorElement 유지")에 의해 무효.
  사용자가 footer 요소를 개별 편집할 수 있어야 하므로 단일 composite element로 묶을 수 없음.
- **Option C: 정적 프리셋에 주차장 항목만 추가** — 동적 높이 조절 불가.
  텍스트 줄 수에 따라 footer 높이가 변해야 하므로 정적 좌표로는 해결 불가.

**Why chosen:** 기존 EditorElement 구조(개별 element)를 유지하면서 좌표 계산 로직만 동적화.
최소 변경으로 모든 AC 충족. 단일 관리 지점 확보.

**Consequences:**
- 좌표 계산이 런타임 함수로 이동하여 시각적 디버깅이 어려워짐
  (static object → function call)
- 향후 footer 복잡도 증가 시 composite element 도입 재검토 필요
- `shouldShowAdditionalInfoText()`가 `computeFooterPresets`에 의존하므로
  활성 조건 변경 시 footer 레이아웃에 즉시 반영됨 (side effect 주의)

**Related specs:**
- `.omc/specs/deep-interview-footer-layout.md` (Deep Interview, ambiguity 18%)
- `.omc/plans/footer-layout-consensus.md` (Ralplan consensus APPROVED)
