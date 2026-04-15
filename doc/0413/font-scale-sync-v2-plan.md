# [Plan] 메인 프리뷰 - 구도 선택 카드 간 텍스트 동기화 (비율 & 폰트)

> 작성일: 2026-04-13  
> 목표: '구도 선택' 시 메인 프리뷰와 우측 카드의 이미지/텍스트 비율 및 글씨체(Zen Serif)를 완벽히 동기화

---

## 1. 현재 문제점 분석

1.  **이미지 비율**: 이미 `doc/0413/font-scale-sync-applied.md`를 통해 `WireframeChoiceCard`에 `scaleFactor`가 적용되어 이미지와 텍스트의 크기 비율은 어느 정도 맞음.
2.  **텍스트 비율 동기화 미흡**: `WireframeChoiceCard`에서 `applyDraftLayoutVariant`만 호출하고 `applyDraftTypographyVariant`를 호출하지 않아, 각 레이아웃별로 정의된 `fontSize` 원본값이 반영되지 않음.
3.  **폰트 동기화 미흡**: 사용자가 별도 폰트를 선택하기 전까지 모든 텍스트는 `Zen Serif`로 유지되어야 하나, 일부 요소에서 기본 폰트가 적용될 가능성이 있음.
4.  **구도 선택 트리거**: 사용자가 구도를 선택할 때 메인과 카드가 동일한 규칙으로 변해야 함.

---

## 2. 해결 방안 (수정 계획)

### 2-1. `WireframeChoiceCard.tsx` 수정

-   **Typography 적용**: `applyDraftLayoutVariant` 호출 직후 `applyDraftTypographyVariant`를 호출하여 각 레이아웃(Type 0~3)에 맞는 원본 폰트 크기를 가져옵니다.
-   **Scale 적용 유지**: 위에서 가져온 원본 폰트 크기에 현재 계산된 `scaleFactor`를 곱하여 카드 크기에 맞게 축소 렌더링합니다.

```tsx
// 수정 로직 (예시)
const variantElements = applyDraftTypographyVariant(
  applyDraftLayoutVariant(elements, typeIndex),
  projectData // ratio와 draftIndex 정보 포함
);
```

### 2-2. `editorFlow.ts` 및 관련 유틸리티 점검

-   **기본 폰트 고정**: `applyDraftTypographyVariant` 및 `mapProjectDataToTemplate`에서 텍스트 요소 생성 시 `fontFamily`를 `'"ZenSerif", serif'`(또는 `DEFAULT_TITLE_FONT`)로 명시적으로 설정합니다.
-   **동기화 규칙**: `getDraftTypography`에서 반환하는 `storeSize`, `sloganSize` 등이 메인 프리뷰와 카드 양쪽에서 동일하게 참조되도록 보장합니다.

### 2-3. 초기 상태 및 폰트 유지

-   사용자가 사이드바에서 폰트를 수동으로 변경하기 전까지는 모든 자동 생성 요소(가게명, 슬로건 등)의 `fontFamily`를 `Zen Serif`로 고정합니다.

---

## 3. 상세 수정 절차

1.  **`doc/0413/font-scale-sync-v2-plan.md` 작성 및 공유** (현재 단계)
2.  **`src/modules/editing/components/WireframeChoiceCard.tsx` 수정**:
    -   `projectData`를 prop으로 전달받도록 인터페이스 확장.
    -   `applyDraftTypographyVariant`를 적용하여 레이아웃별 폰트 크기 동기화.
3.  **`src/modules/editing/App.tsx` 수정**:
    -   `WireframeChoiceCard` 호출 시 `projectData` 전달.
4.  **검증**:
    -   '구도 선택' 패널에서 각 카드(레이아웃 1~4)의 텍스트 크기와 폰트가 메인 프리뷰와 동일한지 확인.
    -   브라우저 리사이즈 시에도 비율이 유지되는지 확인.
