# 객체 저장 기능 구현 가이드

이 문서는 '객체 저장(Object Save)' 기능을 다른 컴포넌트나 모듈에서 구현하려는 개발자를 위한 가이드입니다.

## 1. 참고 문서 및 파일

구현 전 다음 파일들을 먼저 확인해 주세요.

*   **기술 보고서**: [canvas-export.md](file:///d:/01.project/2team-GenPrj-frontend_United/demo_with_save/docs/canvas-export.md)
    *   캔버스 내보내기 기능의 전체적인 설계와 레이어 구조를 설명합니다.
*   **핵심 로직**: [exportCanvas.ts](file:///d:/01.project/2team-GenPrj-frontend_United/demo_with_save/src/utils/exportCanvas.ts)
    *   실제 캔버스 렌더링 및 PNG Blob 생성 로직이 포함된 유틸리티 파일입니다.
*   **사용 예시**: [App.tsx](file:///d:/01.project/2team-GenPrj-frontend_United/demo_with_save/src/App.tsx)
    *   컴포넌트 내에서 상태를 수집하고 함수를 호출하는 실무 예제입니다. (233-245번 라인 참고)

---

## 2. 핵심 함수 및 인터페이스

### `ExportState` 인터페이스
캔버스에 그려질 모든 객체의 상태를 담는 객체입니다. `src/utils/exportCanvas.ts`에 정의되어 있습니다.
```ts
export interface ExportState {
  bgTopColor: string;
  bgBottomColor: string;
  checkWave: CheckWave;
  cafeName: string;
  cafeNamePos: { x: number; y: number };
  sections: MenuSection[];
  imageSlots: Record<string, ImageSlotState>;
  borders: BorderLine[];
}
```

### `exportObjects(state: ExportState, outputWidth?: number): Promise<Blob>`
객체들(이미지 슬롯, 텍스트, 선)만 포함된 **투명 배경**의 PNG Blob을 생성합니다.
*   `state`: 현재 캔버스의 상태 스냅샷
*   `outputWidth`: 출력 이미지의 가로 픽셀 크기 (기본값: 1080)

### `downloadBlob(blob: Blob, filename: string): void`
생성된 Blob을 브라우저를 통해 파일로 다운로드합니다.

---

## 3. 구현 방법 (코드 스니펫)

새로운 컴포넌트에서 객체 저장 기능을 구현할 때의 일반적인 패턴입니다.

```tsx
import { exportObjects, downloadBlob, type ExportState } from '../utils/exportCanvas';

// 1. 현재 컴포넌트의 상태를 ExportState 형식으로 변환하는 함수 정의
const getExportState = (): ExportState => ({
  bgTopColor,
  bgBottomColor,
  checkWave,
  cafeName,
  cafeNamePos,
  sections,
  imageSlots,
  borders,
});

// 2. 버튼 클릭 핸들러 구현
const handleObjectSave = async () => {
  try {
    // 캔버스 객체들을 PNG Blob으로 변환
    const blob = await exportObjects(getExportState());
    
    // 파일 다운로드 실행
    downloadBlob(blob, 'my_objects.png');
  } catch (error) {
    console.error('객체 저장 중 오류 발생:', error);
  }
};

// 3. UI에 버튼 추가
<button onClick={handleObjectSave}>객체 저장 (PNG)</button>
```

---

## 4. 주의 사항

*   **데이터 형식**: 슬롯의 이미지 URL은 `data:image/...` 형식이나 `blob:` URL, 혹은 CORS가 허용된 외부 URL이어야 합니다.

---

## 5. 단독 실행용 전체 코드 (Standalone)

기존 파일을 참조하지 않고 다른 파일에서 즉시 실행하고 싶다면, 아래 코드를 복사해서 사용하세요. 모든 타입 정의와 로직이 포함되어 있습니다.

```typescript
/**
 * 객체 저장 기능을 독립적으로 실행하기 위한 모든 코드입니다.
 * 외부 파일 의존성 없이 이 코드 블록만으로 작동합니다.
 */

// --- 1. 타입 정의 (Types) ---

export interface MenuItem {
  id: string;
  name: string;
  price: string;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
  x: number;
  y: number;
}

export interface ImageSlotState {
  url: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number; // 0~100
  bgRemoved: boolean;
}

export interface BorderLine {
  id: string;
  y: number;
  thickness: number;
  color: string;
}

export interface CheckWave {
  enabled: boolean;
  color1: string;
  color2: string;
  cellSize: number;
  offsetY: number;
  amplitude: number;
}

export interface ExportState {
  bgTopColor: string;
  bgBottomColor: string;
  checkWave: CheckWave;
  cafeName: string;
  cafeNamePos: { x: number; y: number };
  sections: MenuSection[];
  imageSlots: Record<string, ImageSlotState>;
  borders: BorderLine[];
}

// --- 2. 상수 및 헬퍼 함수 (Constants & Helpers) ---

const LOGICAL_W = 400;  // 캔버스 논리 너비
const LOGICAL_H = 500;  // 캔버스 논리 높이 (4:5 비율)
const OUTPUT_WIDTH = 1080; // 기본 출력 해상도

/** 이미지를 URL로부터 로드하는 Promise */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // CORS 문제 방지
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로드 실패: ${url.slice(0, 50)}...`));
    img.src = url;
  });
}

/** 물결 모양 패스를 생성하는 함수 */
function traceWave(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  amplitude: number,
  offsetY: number,
): void {
  const startY = (offsetY / 100) * H;
  ctx.beginPath();
  if (amplitude === 0) {
    ctx.moveTo(0, startY); ctx.lineTo(W, startY); ctx.lineTo(W, H); ctx.lineTo(0, H);
    ctx.closePath();
    return;
  }
  ctx.moveTo(0, H);
  ctx.lineTo(0, startY + amplitude);
  for (let i = 0; i <= 60; i++) {
    const x = (i / 60) * W;
    const y = startY + amplitude * Math.sin((i / 60) * Math.PI * 2.5);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
}

/** 실제 캔버스에 레이어를 그리는 핵심 로직 */
async function drawLayers(
  ctx: CanvasRenderingContext2D,
  state: ExportState,
  W: number,
  H: number,
  includeBackground: boolean,
): Promise<void> {
  const scale = W / LOGICAL_W;

  if (includeBackground) {
    // 배경색 채우기
    ctx.fillStyle = state.bgTopColor;
    ctx.fillRect(0, 0, W, H);
    // 하단 물결 영역 채우기
    ctx.fillStyle = state.bgBottomColor;
    traceWave(ctx, W, H, state.checkWave.amplitude * scale, state.checkWave.offsetY);
    ctx.fill();
    // 체크무늬 패턴
    if (state.checkWave.enabled) {
      const cell = state.checkWave.cellSize * scale;
      ctx.save();
      traceWave(ctx, W, H, state.checkWave.amplitude * scale, state.checkWave.offsetY);
      ctx.clip();
      for (let row = 0; row * cell < H; row++) {
        for (let col = 0; col * cell < W; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? state.checkWave.color1 : state.checkWave.color2;
          ctx.fillRect(col * cell, row * cell, cell, cell);
        }
      }
      ctx.restore();
    }
  }

  // 1. 구분선 (Borders)
  for (const border of state.borders) {
    ctx.fillStyle = border.color;
    ctx.fillRect(0, (border.y / 100) * H, W, Math.max(1, border.thickness * scale));
  }

  // 2. 이미지 슬롯 (Images)
  for (const slot of Object.values(state.imageSlots)) {
    if (!slot.url) continue;
    try {
      const img = await loadImage(slot.url);
      ctx.globalAlpha = (slot.opacity ?? 100) / 100;
      ctx.drawImage(img, (slot.x / 100) * W, (slot.y / 100) * H, (slot.width / 100) * W, (slot.height / 100) * H);
      ctx.globalAlpha = 1;
    } catch (e) {
      console.warn("이미지 그리기 실패:", e);
      ctx.globalAlpha = 1;
    }
  }

  // 3. 카페 이름 (Text - Brand)
  const cafeFs = (6 / 100) * W;
  ctx.font = `bold ${cafeFs}px sans-serif`;
  ctx.fillStyle = '#e06060';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(state.cafeName, (state.cafeNamePos.x / 100) * W, (state.cafeNamePos.y / 100) * H);

  // 4. 메뉴 섹션 (Text - Menus)
  const pad = 8 * scale;
  const sectionW = 0.55 * W;
  for (const section of state.sections) {
    const sx = (section.x / 100) * W;
    const sy = (section.y / 100) * H;
    const titleFs = (3.4 / 100) * W;
    const itemFs = (2.9 / 100) * W;

    ctx.font = `bold ${titleFs}px sans-serif`;
    ctx.fillStyle = '#e06060';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(section.title, sx + pad, sy + pad);

    ctx.font = `${itemFs}px sans-serif`;
    let iy = sy + pad + titleFs + 7 * scale;
    for (const item of section.items) {
      ctx.fillStyle = '#222222';
      ctx.textAlign = 'left';
      ctx.fillText(item.name, sx + pad, iy);
      ctx.fillStyle = '#e06060';
      ctx.textAlign = 'right';
      ctx.fillText(item.price, sx + sectionW - pad, iy);
      iy += itemFs + 3 * scale;
    }
  }
}

// --- 3. 기본 내보내기 함수 (Main Functions) ---

/** 객체만 추출 (배경 제외) */
export async function exportObjectsStandalone(
  state: ExportState,
  outputWidth = OUTPUT_WIDTH,
): Promise<Blob> {
  const W = outputWidth;
  const H = Math.round(LOGICAL_H * (W / LOGICAL_W));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // includeBackground를 false로 호출하여 객체만 그림
  await drawLayers(ctx, state, W, H, false);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Blob 생성 실패'))),
      'image/png',
    ),
  );
}

/** 다운로드 실행 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
```

