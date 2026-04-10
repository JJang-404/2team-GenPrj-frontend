# 전체 저장 기능 구현 가이드

이 문서는 배경색, 물결 패턴, 이미지, 텍스트를 모두 포함한 '전체 저장(Full Save)' 기능을 구현하려는 개발자를 위한 가이드입니다.

## 1. 참고 문서 및 파일

*   **기술 보고서**: [canvas-export.md](file:///d:/01.project/2team-GenPrj-frontend_United/demo_with_save/docs/canvas-export.md)
    *   전체적인 레이어 구조와 4:5 비율 좌표계에 대한 상세 설명이 포함되어 있습니다.
*   **핵심 유틸리티**: `src/utils/exportCanvas.ts`
    *   `exportFull` 함수가 정의된 실제 로직 파일입니다.

---

## 2. 핵심 함수 및 인터페이스

### `ExportState` 인터페이스
캔버스의 모든 요소(배경, 슬롯, 메뉴, 선) 상태를 정의합니다.

### `exportFull(state: ExportState, outputWidth?: number): Promise<Blob>`
배경을 포함한 모든 레이어를 합성하여 PNG Blob을 생성합니다.
*   `state`: 현재 캔버스 상태 스냅샷
*   `outputWidth`: 출력 해상도 너비 (기본값: 1080px, 높이는 비율에 맞춰 자동 계산)

---

## 3. 구현 패턴 (React 예시)

```tsx
import { exportFull, downloadBlob, type ExportState } from '../utils/exportCanvas';

const handleFullSave = async () => {
  // 1. 현재 상태 수집 (상태 정의에 맞춰 매핑)
  const state: ExportState = {
    bgTopColor,
    bgBottomColor,
    checkWave,
    cafeName,
    cafeNamePos,
    sections,
    imageSlots,
    borders,
  };

  try {
    // 2. 전체 합성 이미지 생성 (배경 포함)
    const blob = await exportFull(state);
    
    // 3. 파일 다운로드
    downloadBlob(blob, 'cafe_menu_full.png');
  } catch (error) {
    console.error('이미지 저장 중 오류 발생:', error);
  }
};
```

---

## 4. 단독 실행용 전체 코드 (Standalone)

프로젝트 구조에 의존하지 않고 즉시 실행 가능한 코드입니다.

```typescript
/**
 * 전체 저장 기능을 독립적으로 실행하기 위한 코드입니다.
 */

// --- 1. 타입 정의 ---
export interface ExportState {
  bgTopColor: string;
  bgBottomColor: string;
  checkWave: {
    enabled: boolean;
    color1: string;
    color2: string;
    cellSize: number;
    offsetY: number;
    amplitude: number;
  };
  cafeName: string;
  cafeNamePos: { x: number; y: number };
  sections: any[];
  imageSlots: Record<string, any>;
  borders: any[];
}

// --- 2. 유틸리티 및 그리기 로직 ---
const LOGICAL_W = 400;
const LOGICAL_H = 500; // 4:5 비율

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = url;
  });
}

function traceWave(ctx: CanvasRenderingContext2D, W: number, H: number, amplitude: number, offsetY: number) {
  const startY = (offsetY / 100) * H;
  ctx.beginPath();
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

/** 핵심 합성 함수 */
async function drawAllLayers(ctx: CanvasRenderingContext2D, state: ExportState, W: number, H: number) {
  const scale = W / LOGICAL_W;

  // 1. 상단 배경
  ctx.fillStyle = state.bgTopColor;
  ctx.fillRect(0, 0, W, H);

  // 2. 하단 물결 및 체크무늬
  ctx.fillStyle = state.bgBottomColor;
  traceWave(ctx, W, H, state.checkWave.amplitude * scale, state.checkWave.offsetY);
  ctx.fill();

  if (state.checkWave.enabled) {
    ctx.save();
    traceWave(ctx, W, H, state.checkWave.amplitude * scale, state.checkWave.offsetY);
    ctx.clip();
    const cell = state.checkWave.cellSize * scale;
    for (let row = 0; row * cell < H; row++) {
      for (let col = 0; col * cell < W; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? state.checkWave.color1 : state.checkWave.color2;
        ctx.fillRect(col * cell, row * cell, cell, cell);
      }
    }
    ctx.restore();
  }

  // 3. 객체 그리기 (구분선, 이미지, 텍스트 순)
  // ... (상세 구현은 exportCanvas.ts의 drawLayers 참조)
}

/** 메인 실행 함수 */
export async function exportFullStandalone(state: ExportState, outputWidth = 1080): Promise<Blob> {
  const W = outputWidth;
  const H = Math.round(LOGICAL_H * (W / LOGICAL_W));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  await drawAllLayers(ctx, state, W, H);

  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('생성 실패'))), 'image/png')
  );
}

/** 다운로드 실행 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

---

## 5. 주의 사항

*   **CORS**: 외부 이미지를 사용하는 경우 해당 서버에서 CORS를 허용해야 합성이 가능합니다.
*   **웹폰트**: 캔버스 폰트가 깨진다면 폰트가 완전히 로드된 후 `exportFull`을 호출해야 합니다.
*   **해상도**: `outputWidth`를 높이면 더 고화질의 결과물을 얻을 수 있습니다 (권장: 1080~2160).