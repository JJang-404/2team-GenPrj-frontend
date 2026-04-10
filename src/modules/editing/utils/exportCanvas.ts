import type { BackgroundCandidate, EditorElement } from '../types/editor';

/** 출력 기준 너비 (px) */
export const EXPORT_WIDTH = 1080;

/** 에디터 논리 좌표계 기준 크기 */
const LOGICAL_W = 400;
const LOGICAL_H = 500;

// ─── 헬퍼 ────────────────────────────────────────────────

function ratioToHeight(outputWidth: number, ratio: string): number {
  const [w, h] = ratio.split(':').map(Number);
  if (!w || !h) return Math.round(outputWidth * (LOGICAL_H / LOGICAL_W));
  return Math.round(outputWidth * (h / w));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로드 실패: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

/**
 * CSS linear-gradient 문자열 → CanvasGradient
 * 지원 형태: linear-gradient([angle|to dir,] color [stop%], ...)
 */
function parseLinearGradient(
  ctx: CanvasRenderingContext2D,
  css: string,
  W: number,
  H: number,
): CanvasGradient | null {
  const inner = css.match(/linear-gradient\((.+)\)$/s)?.[1];
  if (!inner) return null;

  // 괄호 안 쉼표는 분리하지 않음
  const parts = inner.split(/,(?![^(]*\))/).map((s) => s.trim());

  let angleRad = Math.PI; // 기본: 아래 방향(180deg)
  const first = parts[0];
  if (/^[\d.]+deg$/.test(first)) {
    angleRad = (parseFloat(first) * Math.PI) / 180;
    parts.shift();
  } else if (/^to /i.test(first)) {
    const dir = first.slice(3).trim().toLowerCase();
    const dirMap: Record<string, number> = {
      bottom: Math.PI,
      top: 0,
      right: Math.PI / 2,
      left: (3 * Math.PI) / 2,
      'bottom right': (3 * Math.PI) / 4,
      'bottom left': (5 * Math.PI) / 4,
      'top right': Math.PI / 4,
      'top left': (7 * Math.PI) / 4,
    };
    angleRad = dirMap[dir] ?? Math.PI;
    parts.shift();
  }

  // gradient line endpoints
  const cos = Math.cos(angleRad - Math.PI / 2);
  const sin = Math.sin(angleRad - Math.PI / 2);
  const len = Math.abs(cos * W) + Math.abs(sin * H);
  const x1 = W / 2 - (cos * len) / 2;
  const y1 = H / 2 - (sin * len) / 2;
  const x2 = W / 2 + (cos * len) / 2;
  const y2 = H / 2 + (sin * len) / 2;

  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  parts.forEach((part, i) => {
    const stopMatch = part.match(/^(.*?)\s+([\d.]+%)\s*$/);
    if (stopMatch) {
      gradient.addColorStop(parseFloat(stopMatch[2]) / 100, stopMatch[1].trim());
    } else {
      gradient.addColorStop(parts.length > 1 ? i / (parts.length - 1) : 0, part);
    }
  });

  return gradient;
}

/** drawImage with objectFit: contain / cover */
function drawImageFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  fit: 'contain' | 'cover',
) {
  const imgAR = img.naturalWidth / img.naturalHeight;
  const boxAR = dw / dh;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  let rdx = dx, rdy = dy, rdw = dw, rdh = dh;

  if (fit === 'cover') {
    if (imgAR > boxAR) {
      sw = img.naturalHeight * boxAR;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = img.naturalWidth / boxAR;
      sy = (img.naturalHeight - sh) / 2;
    }
  } else {
    if (imgAR > boxAR) {
      rdh = dw / imgAR;
      rdy = dy + (dh - rdh) / 2;
    } else {
      rdw = dh * imgAR;
      rdx = dx + (dw - rdw) / 2;
    }
  }

  ctx.drawImage(img, sx, sy, sw, sh, rdx, rdy, rdw, rdh);
}

/** 둥근 사각형 경로 (ctx.roundRect 미지원 브라우저 대응) */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

// ─── 레이어 드로잉 ────────────────────────────────────────

async function drawBackground(
  ctx: CanvasRenderingContext2D,
  background: BackgroundCandidate | null,
  W: number,
  H: number,
) {
  // AI/Pastel 이미지 우선
  if (
    (background?.mode === 'ai-image' || background?.mode === 'pastel') &&
    background.imageUrl
  ) {
    try {
      const img = await loadImage(background.imageUrl);
      ctx.drawImage(img, 0, 0, W, H);
      return;
    } catch {
      // 이미지 로드 실패 시 cssBackground로 폴백
    }
  }

  const css = background?.cssBackground?.trim() ?? '#f3f4f6';

  if (css.includes('linear-gradient')) {
    const gradient = parseLinearGradient(ctx, css, W, H);
    if (gradient) {
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
      return;
    }
  }

  // solid color or fallback
  ctx.fillStyle = css || '#f3f4f6';
  ctx.fillRect(0, 0, W, H);
}

async function drawElement(
  ctx: CanvasRenderingContext2D,
  element: EditorElement,
  W: number,
  H: number,
  scale: number,
) {
  if (element.hidden) return;

  const x = (element.x / 100) * W;
  const y = (element.y / 100) * H;
  const w = (element.width / 100) * W;
  const h = (element.height / 100) * H;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rotation = (element.rotation * Math.PI) / 180;

  ctx.save();
  ctx.globalAlpha = element.opacity ?? 1;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.translate(-cx, -cy);

  // ── 이미지 ──
  if (element.kind === 'image' && element.imageUrl) {
    try {
      const img = await loadImage(element.imageUrl);
      drawImageFit(ctx, img, x, y, w, h, element.imageFit ?? 'contain');
    } catch {
      // 이미지 로드 실패 시 회색 박스 대체
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(x, y, w, h);
    }
  }

  // ── 도형 ──
  if (element.kind === 'shape') {
    const shapeCss = element.shapeCss ?? '#cccccc';
    if (shapeCss.includes('linear-gradient')) {
      ctx.fillStyle = parseLinearGradient(ctx, shapeCss, W, H) ?? shapeCss;
    } else {
      ctx.fillStyle = shapeCss;
    }
    const radius = (element.borderRadius ?? 0) * scale;
    roundRectPath(ctx, x, y, w, h, radius);
    ctx.fill();

    if (element.border) {
      const borderMatch = element.border.match(/^([\d.]+)px\s+\S+\s+(.+)$/);
      if (borderMatch) {
        ctx.strokeStyle = borderMatch[2].trim();
        ctx.lineWidth = parseFloat(borderMatch[1]) * scale;
        ctx.stroke();
      }
    }
  }

  // ── 텍스트 ──
  if (element.kind === 'text' && element.text) {
    const fontSize = (element.fontSize ?? 24) * scale;
    const fontWeight = element.fontWeight ?? 400;
    const fontFamily = element.fontFamily ?? 'sans-serif';
    const lineHeight = (element.lineHeight ?? 1.4) * fontSize;
    const letterSpacing = (element.letterSpacing ?? 0) * scale;
    const align = element.align ?? 'left';

    ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = element.color ?? '#000000';
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    // Canvas 2D letterSpacing (Chrome 99+, Firefox 112+)
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
      `${letterSpacing}px`;

    const textX =
      align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
    const lines = element.text.split('\n');

    lines.forEach((line, i) => {
      ctx.fillText(line, textX, y + i * lineHeight, w);
    });
  }

  ctx.restore();
}

// ─── 공개 API ─────────────────────────────────────────────

/**
 * 에디터 요소와 배경을 Canvas 2D로 합성하여 PNG dataURL을 반환합니다.
 * @param elements - 렌더링할 요소 배열
 * @param background - 배경 후보 (null이면 투명)
 * @param ratio - 캔버스 비율 문자열 (예: '4:5')
 * @param outputWidth - 출력 너비 px (기본: 1080)
 */
export async function exportEditorAsDataUrl(
  elements: EditorElement[],
  background: BackgroundCandidate | null,
  ratio = '4:5',
  outputWidth = EXPORT_WIDTH,
): Promise<string> {
  const W = outputWidth;
  const H = ratioToHeight(outputWidth, ratio);
  const scale = W / LOGICAL_W;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context를 생성할 수 없습니다.');

  await drawBackground(ctx, background, W, H);

  const sorted = [...elements]
    .filter((el) => !el.hidden)
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const element of sorted) {
    await drawElement(ctx, element, W, H, scale);
  }

  return canvas.toDataURL('image/png');
}
