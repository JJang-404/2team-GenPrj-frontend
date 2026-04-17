import type { BackgroundCandidate } from '../types/api';
import type { EditorElement } from '../types/editor-core';

interface ExportPosterParams {
  width: number;
  height: number;
  background: BackgroundCandidate | null;
  elements: EditorElement[];
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지를 불러오지 못했습니다: ${src}`));
    img.src = src;
  });
}

function parseLinearGradient(input: string) {
  const matched = input.match(/^linear-gradient\((.+)\)$/i);
  if (!matched) return null;

  const parts = matched[1].split(',').map((part) => part.trim());
  if (parts.length < 2) return null;

  const angleToken = parts[0].endsWith('deg') ? parts[0] : '180deg';
  const stops = parts[0].endsWith('deg') ? parts.slice(1) : parts;
  const angle = Number.parseFloat(angleToken);

  if (Number.isNaN(angle) || stops.length < 2) return null;

  return { angle, stops };
}

function buildCanvasGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cssBackground: string
) {
  const parsed = parseLinearGradient(cssBackground);
  if (!parsed) return null;

  const radians = ((parsed.angle - 90) * Math.PI) / 180;
  const centerX = width / 2;
  const centerY = height / 2;
  const distance = Math.max(width, height) / 2;
  const x0 = centerX - Math.cos(radians) * distance;
  const y0 = centerY - Math.sin(radians) * distance;
  const x1 = centerX + Math.cos(radians) * distance;
  const y1 = centerY + Math.sin(radians) * distance;

  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  const stopCount = parsed.stops.length - 1;
  parsed.stops.forEach((stop, index) => {
    const color = stop.split(/\s+/)[0];
    gradient.addColorStop(stopCount <= 0 ? 0 : index / stopCount, color);
  });
  return gradient;
}

function parseColorToken(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (
    /^#[0-9a-f]{3,8}$/i.test(trimmed) ||
    /^rgba?\(/i.test(trimmed) ||
    /^hsla?\(/i.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
}

function parseBorder(border?: string) {
  if (!border) return null;
  const matched = border.match(/(\d+(?:\.\d+)?)px\s+\w+\s+(.+)/i);
  if (!matched) return null;
  return {
    width: Number.parseFloat(matched[1]),
    color: matched[2].trim(),
  };
}

function configureShadow(ctx: CanvasRenderingContext2D, shadowStrength = 0, scale = 1) {
  if (!shadowStrength) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    return;
  }

  ctx.shadowColor = `rgba(0,0,0,${0.12 + shadowStrength / 110})`;
  ctx.shadowBlur = (12 + shadowStrength) * scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8 * scale;
}

function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function getBox(element: EditorElement, width: number, height: number) {
  return {
    x: (element.x / 100) * width,
    y: (element.y / 100) * height,
    width: (element.width / 100) * width,
    height: (element.height / 100) * height,
  };
}

function drawTextWithLetterSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
  align: CanvasTextAlign
) {
  if (!letterSpacing) {
    ctx.fillText(text, x, y);
    return;
  }

  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width);
  const totalWidth = widths.reduce((sum, current) => sum + current, 0) + Math.max(0, chars.length - 1) * letterSpacing;
  let cursor = x;

  if (align === 'center') {
    cursor = x - totalWidth / 2;
  } else if (align === 'right') {
    cursor = x - totalWidth;
  }

  chars.forEach((char, index) => {
    ctx.fillText(char, cursor, y);
    cursor += widths[index] + letterSpacing;
  });
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, letterSpacing: number) {
  const rawLines = text.split('\n');
  const lines: string[] = [];

  rawLines.forEach((rawLine) => {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      return;
    }

    let current = words[0];
    for (let index = 1; index < words.length; index += 1) {
      const nextWord = words[index];
      const candidate = `${current} ${nextWord}`;
      const candidateWidth = ctx.measureText(candidate).width + Math.max(0, candidate.length - 1) * letterSpacing;
      if (candidateWidth <= maxWidth) {
        current = candidate;
        continue;
      }
      lines.push(current);
      current = nextWord;
    }
    lines.push(current);
  });

  return lines;
}

function normalizeFontFamily(fontFamily?: string) {
  const family = fontFamily?.trim();
  if (!family) return 'sans-serif';
  if (family.includes(',') || family.includes('"') || family.includes("'")) {
    return family;
  }
  if (/\s/.test(family)) {
    return `"${family}"`;
  }
  return family;
}

async function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: BackgroundCandidate | null
) {
  const fill = background?.cssBackground ?? '#f3f4f6';
  const gradient = buildCanvasGradient(ctx, width, height, fill);
  ctx.fillStyle = gradient ?? fill;
  ctx.fillRect(0, 0, width, height);

  if (background?.imageUrl) {
    const img = await loadImage(background.imageUrl);
    ctx.drawImage(img, 0, 0, width, height);
  }
}

function drawShapeElement(ctx: CanvasRenderingContext2D, element: EditorElement, canvasWidth: number, canvasHeight: number) {
  const box = getBox(element, canvasWidth, canvasHeight);
  ctx.save();
  ctx.globalAlpha = element.opacity ?? 1;
  configureShadow(ctx, element.shadowStrength, canvasWidth / 580);
  ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
  ctx.rotate((element.rotation * Math.PI) / 180);
  drawRoundRectPath(
    ctx,
    -box.width / 2,
    -box.height / 2,
    box.width,
    box.height,
    element.borderRadius ?? 0
  );

  const fillColor = parseColorToken(element.shapeCss) ?? '#ffffff';
  ctx.fillStyle = fillColor;
  ctx.fill();

  const border = parseBorder(element.border);
  if (border) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.lineWidth = border.width;
    ctx.strokeStyle = border.color;
    ctx.stroke();
  }
  ctx.restore();
}

async function drawImageElement(
  ctx: CanvasRenderingContext2D,
  element: EditorElement,
  canvasWidth: number,
  canvasHeight: number
) {
  if (!element.imageUrl) return;
  const img = await loadImage(element.imageUrl);
  const box = getBox(element, canvasWidth, canvasHeight);
  const fit = element.imageFit ?? 'contain';
  const widthScale = box.width / img.width;
  const heightScale = box.height / img.height;
  const scale = fit === 'cover' ? Math.max(widthScale, heightScale) : Math.min(widthScale, heightScale);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const dx = -drawWidth / 2;
  const dy = -drawHeight / 2;

  ctx.save();
  ctx.globalAlpha = element.opacity ?? 1;
  configureShadow(ctx, element.shadowStrength, canvasWidth / 580);
  ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
  ctx.rotate((element.rotation * Math.PI) / 180);
  drawRoundRectPath(
    ctx,
    -box.width / 2,
    -box.height / 2,
    box.width,
    box.height,
    element.borderRadius ?? 0
  );
  ctx.clip();
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  ctx.restore();
}

function drawTextElement(ctx: CanvasRenderingContext2D, element: EditorElement, canvasWidth: number, canvasHeight: number) {
  if (!element.text) return;
  const box = getBox(element, canvasWidth, canvasHeight);
  const scale = canvasWidth / 580;
  const fontSize = (element.fontSize ?? 24) * scale;
  const lineHeight = (element.lineHeight ?? 1.2) * fontSize;
  const letterSpacing = (element.letterSpacing ?? 0) * scale;
  const align = (element.align ?? 'left') as CanvasTextAlign;
  const fontWeight = element.fontWeight ?? 400;
  const fontFamily = normalizeFontFamily(element.fontFamily);
  const textX =
    align === 'center' ? box.x + box.width / 2 : align === 'right' ? box.x + box.width : box.x;

  ctx.save();
  ctx.globalAlpha = element.opacity ?? 1;
  configureShadow(ctx, element.shadowStrength, scale);
  ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
  ctx.rotate((element.rotation * Math.PI) / 180);
  ctx.translate(-(box.x + box.width / 2), -(box.y + box.height / 2));
  ctx.fillStyle = element.color ?? '#111827';
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  // 기존 폰트 지정 방식. fontFamily가 이미 폰트 스택인 경우 잘못된 font 문자열이 될 수 있어 원복은 비권장.
  // ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  const lines = wrapTextLines(ctx, element.text, Math.max(box.width, fontSize), letterSpacing);
  lines.forEach((line, index) => {
    drawTextWithLetterSpacing(ctx, line, textX, box.y + index * lineHeight, letterSpacing, align);
  });
  ctx.restore();
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('포스터 이미지 생성에 실패했습니다.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

export async function exportPosterAsBlob({
  width,
  height,
  background,
  elements,
}: ExportPosterParams) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('포스터 export 캔버스를 초기화할 수 없습니다.');
  }

  if ('fonts' in document) {
    await (document as Document & { fonts: FontFaceSet }).fonts.ready;
  }

  await drawBackground(ctx, width, height, background);

  const orderedElements = elements
    .filter((element) => !element.hidden)
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const element of orderedElements) {
    if (element.kind === 'shape') {
      drawShapeElement(ctx, element, width, height);
      continue;
    }
    if (element.kind === 'text') {
      drawTextElement(ctx, element, width, height);
      continue;
    }
    if (element.kind === 'image') {
      await drawImageElement(ctx, element, width, height);
    }
  }

  return canvasToBlob(canvas);
}
