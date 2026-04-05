/**
 * exportCanvas.ts
 * ---------------
 * Programmatic Canvas 2D export — no external dependencies.
 *
 * Two export paths:
 *   exportFull()    — all layers (background + objects) → PNG blob
 *   exportObjects() — objects only (image slots + text), transparent bg → PNG blob
 *
 * downloadBlob()   — triggers browser download
 */

import type { MenuSection, ImageSlotState, BorderLine, CheckWave } from '../App';

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

// Logical canvas dimensions (same as Canvas.tsx, 4:5)
const LOGICAL_W = 400;
const LOGICAL_H = 500; // Math.round(400 * 5/4)

export const OUTPUT_WIDTH = 1080;

// ── Helpers ────────────────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image load failed: ${url.slice(0, 60)}`));
    img.src = url;
  });
}

function traceWave(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  amplitude: number,
  offsetY: number,
): void {
  const startY = (offsetY / 100) * H;
  ctx.beginPath();
  if (amplitude === 0) {
    ctx.moveTo(0, startY);
    ctx.lineTo(W, startY);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
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

// ── Core drawing function ──────────────────────────────────────────────────

async function drawLayers(
  ctx: CanvasRenderingContext2D,
  state: ExportState,
  W: number,
  H: number,
  includeBackground: boolean,
): Promise<void> {
  const scale = W / LOGICAL_W;

  if (includeBackground) {
    // Layer 0a: top background colour (full canvas)
    ctx.fillStyle = state.bgTopColor;
    ctx.fillRect(0, 0, W, H);

    // Layer 0b: bottom colour in wave region
    ctx.fillStyle = state.bgBottomColor;
    traceWave(ctx, W, H, state.checkWave.amplitude * scale, state.checkWave.offsetY);
    ctx.fill();

    // Layer 1: checkerboard pattern clipped to wave
    if (state.checkWave.enabled) {
      const cell = state.checkWave.cellSize * scale;
      ctx.save();
      traceWave(ctx, W, H, state.checkWave.amplitude * scale, state.checkWave.offsetY);
      ctx.clip();
      for (let row = 0; row * cell < H; row++) {
        for (let col = 0; col * cell < W; col++) {
          ctx.fillStyle =
            (row + col) % 2 === 0 ? state.checkWave.color1 : state.checkWave.color2;
          ctx.fillRect(col * cell, row * cell, cell, cell);
        }
      }
      ctx.restore();
    }

  }

  // Layer 2: border lines (배경 포함 여부와 관계없이 항상 합성)
  for (const border of state.borders) {
    ctx.fillStyle = border.color;
    ctx.fillRect(0, (border.y / 100) * H, W, Math.max(1, border.thickness * scale));
  }

  // Layer 3: image slots
  for (const slot of Object.values(state.imageSlots)) {
    if (!slot.url) continue;
    try {
      const img = await loadImage(slot.url);
      ctx.globalAlpha = (slot.opacity ?? 100) / 100;
      ctx.drawImage(
        img,
        (slot.x / 100) * W,
        (slot.y / 100) * H,
        (slot.width / 100) * W,
        (slot.height / 100) * H,
      );
      ctx.globalAlpha = 1;
    } catch {
      ctx.globalAlpha = 1; // ensure reset even on failure
    }
  }

  // Layer 4: cafe name  (6cqw bold, centred at cafeNamePos)
  const cafeFs = (6 / 100) * W;
  ctx.font = `bold ${cafeFs}px sans-serif`;
  ctx.fillStyle = '#e06060';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(
    state.cafeName,
    (state.cafeNamePos.x / 100) * W,
    (state.cafeNamePos.y / 100) * H,
  );

  // Layer 5: menu sections  (title 3.4cqw bold, items 2.9cqw)
  const pad = 8 * scale;
  const sectionW = 0.55 * W; // matches Canvas.tsx width: '55%'
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

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Export the full canvas (background + all objects) as a PNG blob.
 */
export async function exportFull(
  state: ExportState,
  outputWidth = OUTPUT_WIDTH,
): Promise<Blob> {
  const W = outputWidth;
  const H = Math.round(LOGICAL_H * (W / LOGICAL_W));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  await drawLayers(ctx, state, W, H, true);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('exportFull: toBlob returned null'))),
      'image/png',
    ),
  );
}

/**
 * Export objects only (image slots + text) on a transparent background.
 * Used for testing and as the payload for background-generation API.
 */
export async function exportObjects(
  state: ExportState,
  outputWidth = OUTPUT_WIDTH,
): Promise<Blob> {
  const W = outputWidth;
  const H = Math.round(LOGICAL_H * (W / LOGICAL_W));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  // canvas is transparent by default — no fillRect needed

  await drawLayers(ctx, state, W, H, false);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('exportObjects: toBlob returned null'))),
      'image/png',
    ),
  );
}

/**
 * Trigger a browser download for a Blob.
 */
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
