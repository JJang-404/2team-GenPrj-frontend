# 텍스트 중앙 정렬 및 상품 정보 표시 수정 내역 (2026-04-17)

## 1. 개요
`Main Preview`(EditorCanvas)와 `WireframeChoiceCard` 간의 시각적 불일치(텍스트 정렬 및 상품 정보 누락) 문제를 해결하였습니다.

## 2. [수정 1] 가게 이름/슬로건 중앙 정렬 불일치
- **증상**: 'WireframeChoiceCard'에서는 가게 이름이 중앙에 표시되지만, 메인 프리뷰에서는 왼쪽으로 치우침.
- **원인**: 
    - `EditorCanvas`는 텍스트 요소의 너비를 `fit-content`(글자 길이에 맞춤)로 설정하고 있었습니다.
    - 이로 인해 `textAlign: center` 속성을 적용해도 박스 자체가 글자 크기라 시각적인 정렬 효과가 없었습니다.
- **수정 내용** (`EditorCanvas.tsx`):
    - 텍스트 요소의 `width`를 `fit-content` 대신 레이아웃 정의 너비(`${element.width}%`)를 사용하도록 변경하여 내부 정렬이 작동하게 함.

## 3. [수정 2] 상품 정보(명칭/가격) 노출 누락
- **증상**: 구도 선택 시 대화상자에는 보이던 상품명과 가격 정보가 메인 프리뷰에서는 사라짐.
- **원인**: 
    - `createElementsFromWireframe` 함수에서 상품 이미지 요소만 생성하고, 상품명/가격 등의 텍스트 요소를 생성하는 로직이 누락되어 있었음.
- **수정 내용** (`editorFlow.ts`):
    - 상품 이미지 요소를 생성할 때 `buildProductTextElements`를 호출하여 메타 텍스트 요소를 함께 생성하도록 추가.
    - `placeProductMetaElement`를 사용하여 상품 이미지 하단에 자동으로 위치를 잡도록 구현.

## 4. 코드 수정 내역 (주석 처리 및 사유 기입)

### EditorCanvas.tsx (정렬 수정)
```tsx
/* 기존 코드: 텍스트 너비를 fit-content로 하여 align:center가 무시되는 증상 발생
width: element.kind === 'text' ? 'fit-content' : `${element.width}%`,
maxWidth: element.kind === 'text' ? `${element.width}%` : undefined,
*/
// 이러한 증상으로 변경: 텍스트 박스에 layout width를 강제하여 내부 textAlign center가 canvas 중앙에 오도록 함
width: `${element.width}%`,
maxWidth: undefined,
```

### editorFlow.ts (상품 정보 추가)
```typescript
// 상품 이미지 요소를 추가한 직후 아래 로직 추가
const metaTexts = buildProductTextElements(product, i);
metaTexts.forEach((te) => {
  elements.push(placeProductMetaElement(te, rect, typeIndex));
});
```

## 5. 원상복구 방법
- `EditorCanvas.tsx`: 주석 처리된 부분을 해제하고 새로 추가된 코드를 제거합니다.
- `editorFlow.ts`: `createElementsFromWireframe` 함수 내에서 `metaTexts` 관련 루프 코드를 삭제합니다.

## 6. 검증 결과
- 모든 구도(Type 1~4)에서 **가게 이름**과 **상품 정보**가 모두 중앙 정렬 기준에 맞춰 정상적으로 표시되는 것을 확인하였습니다.
