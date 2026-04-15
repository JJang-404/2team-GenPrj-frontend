# [Report] Main Preview - WireframeChoiceCard 매칭 작업 및 코드 변경 내역

작성일: 2026-04-15  
목표: 메인 프리뷰와 선택 카드의 구도(텍스트/이미지 배치 및 비율)를 완벽하게 일치시키고, 원상복구가 가능하도록 기존 코드를 주석으로 보존하며 수정을 진행함.

---

## 1. 주요 변경 파일 요약

| 파일 경로 | 주요 변경 내용 |
|---|---|
| `react/src/modules/editing/utils/wireframeTextPlacements.ts` | 각 타입별 텍스트(가게명, 슬로건) % 좌표를 `initPage` 레이아웃과 일치하도록 정밀 조정 |
| `react/src/modules/editing/utils/wireframeLayout.ts` | Type 1, 2에서도 제품 이미지의 가로세로비(AR) 스케일링이 적용되도록 수정 |
| `react/src/modules/editing/components/WireframeChoiceCard.tsx` | `scaleFactor`를 도입하여 카드 내 배치를 메인 프리뷰와 동일한 비율로 축소 렌더링 |

---

## 2. 상세 변경 내역

### 2-1. `wireframeTextPlacements.ts` (좌표 수정)
`initPage`의 각 레이아웃 컴포넌트(`SingleLargeLayout` 등)가 사용하는 Tailwind 위치와 메인 프리뷰의 절대 % 위치를 일치시켰습니다.

```typescript
// 변경 전 (주석으로 보존)
/*
storeName:  { x: 4, y: 4,  width: 68, height: 10 },
mainSlogan: { x: 4, y: 90, width: 92, height: 8  },
*/

// 변경 후 (Type 1의 경우)
storeName:  { x: 4, y: 5,  width: 92, height: 10 },
mainSlogan: { x: 0, y: 92, width: 100, height: 8  }, // 하단 밴드 위치로 조정
```

### 2-2. `wireframeLayout.ts` (이미지 AR 스케일링)
기존에는 Type 1, 2에서 슬롯 너비를 그대로 사용했으나, `initPage`처럼 이미지의 실제 비율에 맞춰 너비가 조정되도록 수정했습니다.

```typescript
// 변경 전
// return slots.map((slot) => ({ rect: slotToRect(slot) }));

// 변경 후
return slots.map((slot, i) => {
  const product = products[i];
  if (!product) return { rect: slotToRect(slot) };

  const wScaled = scaledWidthOrFallback(slot, product); // 이미지 비율 반영
  return {
    rect: {
      x: slot.Cx - wScaled / 2,
      y: slot.Cy - slot.sh / 2,
      width: wScaled,
      height: slot.sh,
    },
  };
});
```

### 2-3. `WireframeChoiceCard.tsx` (시각적 비율 동기화)
메인 프리뷰(580px)와 카드(~310px) 간의 너비 차이로 인해 텍스트 크기가 다르게 보이는 문제를 `transform: scale()`을 이용해 해결했습니다.

```tsx
// 새롭게 추가된 로직
const REFERENCE_CANVAS_WIDTH = 580;

useEffect(() => {
  const observer = new ResizeObserver(([entry]) => {
    const cardWidth = entry.contentRect.width;
    // 580px 대비 현재 카드의 너비 비율 계산 (약 0.53배)
    setScaleFactor(cardWidth / REFERENCE_CANVAS_WIDTH);
  });
  // ...
}, []);

// 렌더링 부분
<div style={{ 
  transform: `scale(${scaleFactor})`, // 비율에 맞춰 전체 레이아웃 축소
  transformOrigin: 'top left',
  width: `${100 / scaleFactor}%`,
  height: `${100 / scaleFactor}%`,
}}>
  <Layout ... />
</div>
```

### 2-4. `BackgroundCard.tsx` (텍스트 박스 너비 로직 동기화)
메인 프리뷰와 카드 간에 위치가 어긋나 보이는 문제를 해결하기 위해 텍스트 박스의 너비 계산 방식을 일치시켰습니다.

```tsx
// 변경 전
// width: `${element.width}%`,

// 변경 후 (Main Preview와 동일하게 설정)
width: element.kind === 'text' ? 'fit-content' : `${element.width}%`,
maxWidth: element.kind === 'text' ? `${element.width}%` : undefined,
```
- **효과**: 이제 텍스트 상자의 크기가 글자 길이에 맞춰지므로, `x` 좌표(% 위치)가 두 화면에서 시각적으로 완벽하게 일치하게 됩니다.

### 2-5. `editorFlow.ts` (광고 문구 중복 노출 해결)
템플릿 내 다수의 필드가 동일한 광고 문구로 채워져 겹쳐 보이는 현상을 방지했습니다.

```typescript
// 변경 내역
if (/(headline|title|타이틀)/.test(normalizedLabel) && !matchedFields.slogan) {
    // ... 첫 번째 매칭되는 필드만 슬로건으로 사용
}
```

---

## 3. 검증 결과
- **위치 동기화**: 메인 프리뷰에서 가게 이름을 왼쪽 끝으로 옮기면, 카드 내에서도 동일하게 왼쪽 끝에 배치됨을 확인.
- **문구 중복**: 동일한 내용의 광고 문구가 겹쳐서 나오던 현상 해결.
- **스케일링**: 창 크기에 따라 메인 프리뷰와 카드의 텍스트 크기가 비율에 맞춰 실시간으로 동기화됨.

> [!NOTE]  
> 모든 기존 코드는 주석(`/* ... */`) 처리되어 있어, 필요한 경우 해당 부분의 주석을 해제하고 신규 코드를 삭제하면 즉시 원상복구가 가능합니다.
