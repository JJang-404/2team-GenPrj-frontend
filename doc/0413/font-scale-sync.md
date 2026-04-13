# Main Preview ↔ WireframeChoiceCard 폰트 비율 동기화

## 1. 현재 비율 분석

### Main Preview (`EditorCanvas`)

| 항목 | 값 |
|---|---|
| 컴포넌트 | `EditorCanvas` → `.editor-stage__canvas` |
| 캔버스 너비 | `min(100%, 580px)` (CSS) |
| 데스크탑 기준 실제 너비 | **약 580px** |
| 폰트 크기 단위 | **절대값 px** (`element.fontSize`) |
| 위치·크기 단위 | **상대값 %** (`element.x`, `element.y`, `element.width`, `element.height`) |

`draftTypography`가 반환하는 대표 폰트 크기 (`ratio=4:5` 기준):

| 레이아웃 | storeSize | sloganSize |
|---|---|---|
| Type 0 | 36px | 14px |
| Type 1 | 60px | 20px |
| Type 2 | 36px | 12px |
| Type 3 | 72px | 18px |

### WireframeChoiceCard

| 항목 | 값 |
|---|---|
| 컴포넌트 | `WireframeChoiceCard` → `.choice-card__canvas` |
| 부모 컨테이너 | `.workspace__choices` = **360px** 고정 |
| 내부 패딩 제거 후 실제 너비 | ≈ `360 - 14×2(choices padding) - 10×2(card padding) - 2(border)` = **약 310px** |
| 폰트 크기 단위 | **절대값 px** (동일한 `element.fontSize` 그대로 사용) |

---

## 2. 문제 원인

이미지(product image)와 배경은 **`%` 기반**이라 컨테이너 크기에 비례하여 자동으로 축소됩니다.  
그러나 텍스트의 `fontSize`와 `letterSpacing`은 **절대 px 값**이기 때문에 컨테이너 크기와 무관하게 고정 크기로 렌더됩니다.

```
Main Preview 캔버스:      ~580px 너비 → 36px 폰트 = 캔버스 너비의 6.2%
WireframeChoiceCard 캔버스: ~310px 너비 → 36px 폰트 = 캔버스 너비의 11.6%
```

즉, WireframeChoiceCard에서 텍스트가 Main Preview 대비 **약 1.87배 비율로 크게** 표시됩니다.

영향받는 속성:
- `fontSize` (px)
- `letterSpacing` (px)

영향받지 않는 속성 (자동 비례):
- `x`, `y`, `width`, `height` (% → CSS absolute positioning으로 자동 스케일)

---

## 3. 동기화 구현 방법

### 접근법: 런타임 scale 계산 후 폰트에 적용

WireframeChoiceCard 내부에서 카드 캔버스의 실제 너비를 측정하고,  
Main Preview 기준 너비(580px)와의 비율로 `fontSize` / `letterSpacing`을 스케일합니다.

```
scaleFactor = cardCanvasWidth / REFERENCE_WIDTH(580)
scaledFontSize = element.fontSize * scaleFactor
```

---

## 4. 구현 단계

### Step 1: `WireframeChoiceCard.tsx`에 ref + ResizeObserver 추가

```tsx
import { useEffect, useRef, useState } from 'react';

// Main Preview 기준 캔버스 너비 (editor-stage__canvas: min(100%, 580px))
const REFERENCE_CANVAS_WIDTH = 580;

export default function WireframeChoiceCard({ ... }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(1);

  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const cardWidth = entry.contentRect.width;
      setScaleFactor(cardWidth / REFERENCE_CANVAS_WIDTH);
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  // ...
}
```

### Step 2: 텍스트 렌더링 시 스케일 적용

```tsx
// 기존 코드
fontSize: `${element.fontSize ?? 24}px`,
letterSpacing: `${element.letterSpacing ?? 0}px`,

// 변경 후
fontSize: `${(element.fontSize ?? 24) * scaleFactor}px`,
letterSpacing: `${(element.letterSpacing ?? 0) * scaleFactor}px`,
```

### Step 3: canvasRef를 `.choice-card__canvas` div에 연결

```tsx
<div
  ref={canvasRef}
  className="choice-card__canvas"
  style={{ aspectRatio: ratioToAspectValue(ratio) }}
>
```

---

## 5. 변경 파일 요약

| 파일 | 변경 내용 |
|---|---|
| `src/modules/editing/components/WireframeChoiceCard.tsx` | `useRef`, `useState`, `useEffect` import 추가; `ResizeObserver`로 scaleFactor 계산; 텍스트 fontSize·letterSpacing에 scaleFactor 곱하기 |

`EditorCanvas`, `App.tsx`, `draftTypography.ts`는 **수정 불필요**.

---

## 6. 기대 효과

- Main Preview에서 폰트 크기를 변경(다른 draftIndex 선택, ratio 변경)하면 WireframeChoiceCard도 **동일한 비율**로 표시됨
- 뷰포트 크기 변화나 사이드바 토글로 카드 크기가 바뀌어도 `ResizeObserver`가 자동으로 재계산
- 이미지·배경은 이미 `%` 기반이므로 추가 변경 불필요
