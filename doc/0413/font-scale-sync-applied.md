# WireframeChoiceCard 폰트 비율 동기화 - 적용 완료 보고서

> 작성일: 2026-04-13  
> 참고 문서: [font-scale-sync.md](./font-scale-sync.md)

---

## 변경 파일

| 파일 | 변경 유형 |
|---|---|
| `src/modules/editing/components/WireframeChoiceCard.tsx` | 수정 (기존 코드 주석 보존) |

---

## 주요 변경 사항

### 1. import 추가

```tsx
// 변경 전
import type { CSSProperties } from 'react';

// 변경 후
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
```

### 2. 상수 추가

```tsx
// Main Preview 기준 캔버스 너비 (editor-stage__canvas: min(100%, 580px))
const REFERENCE_CANVAS_WIDTH = 580;
```

### 3. ref / state 추가

```tsx
const canvasRef = useRef<HTMLDivElement>(null);
const [scaleFactor, setScaleFactor] = useState(1);
```

### 4. ResizeObserver 추가

```tsx
useEffect(() => {
  if (!canvasRef.current) return;
  const observer = new ResizeObserver(([entry]) => {
    const cardWidth = entry.contentRect.width;
    setScaleFactor(cardWidth / REFERENCE_CANVAS_WIDTH);
  });
  observer.observe(canvasRef.current);
  return () => observer.disconnect();
}, []);
```

### 5. `.choice-card__canvas` div에 ref 연결

```tsx
<div
  ref={canvasRef}
  className="choice-card__canvas"
  style={{ aspectRatio: ratioToAspectValue(ratio) }}
>
```

### 6. 텍스트 fontSize / letterSpacing에 scaleFactor 적용

```tsx
// 변경 전 (절대 px - 비율 깨짐)
fontSize: `${element.fontSize ?? 24}px`,
letterSpacing: `${element.letterSpacing ?? 0}px`,

// 변경 후 (scaleFactor 비례 적용)
fontSize: `${(element.fontSize ?? 24) * scaleFactor}px`,
letterSpacing: `${(element.letterSpacing ?? 0) * scaleFactor}px`,
```

> 기존 코드는 삭제하지 않고 주석으로 보존했습니다.

---

## 영향 범위

| 속성 | 처리 방식 | 비고 |
|---|---|---|
| `fontSize` | scaleFactor 곱하기 적용 | 이번 패치에서 수정 |
| `letterSpacing` | scaleFactor 곱하기 적용 | 이번 패치에서 수정 |
| `x`, `y`, `width`, `height` | % 기반, 변경 없음 | 이미 자동 비례 |
| 배경·이미지 | % 기반, 변경 없음 | 이미 자동 비례 |

---

## 수정하지 않은 파일

- `EditorCanvas.tsx` — Main Preview 기준이므로 변경 불필요
- `App.tsx` — 상태 구조 변경 없음
- `draftTypography.ts` — 폰트 크기 원본값은 그대로 유지

---

## 기대 효과

- WireframeChoiceCard의 텍스트가 Main Preview와 **동일한 비율**로 표시됨
- 뷰포트 변화나 사이드바 토글 시에도 `ResizeObserver`가 자동으로 재계산
- 초기 `scaleFactor = 1`로 설정되어 있어, 첫 렌더 직후 ResizeObserver가 측정값으로 즉시 업데이트
