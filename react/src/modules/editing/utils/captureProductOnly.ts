import type { EditorElement } from '../types/editor';
import { isPrimaryImageElement } from './editorFlow';

/**
 * 편집 캔버스에서 product 이미지만 현재 위치/크기/회전/투명도 그대로 투명 배경 PNG로 캡처한다.
 *
 * DOM의 offsetLeft/Top/Width/Height를 직접 사용해 %→px 계산을 생략한다.
 * rotation/opacity는 element 데이터에서 읽는다.
 *
 * @param canvasRoot `.editor-stage__canvas` 요소 (positioned ancestor 역할)
 * @param elements 현재 렌더 중인 EditorElement 배열 (zIndex 순서와 product 필터용)
 * @returns dataURL `data:image/png;base64,...`
 */
export async function captureProductOnly(
  canvasRoot: HTMLElement,
  elements: EditorElement[],
): Promise<string> {
  const W = canvasRoot.offsetWidth;
  const H = canvasRoot.offsetHeight;
  if (W === 0 || H === 0) {
    throw new Error('캡처 대상 캔버스 크기가 0입니다.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context 생성 실패');

  const products = elements
    .filter((el) => !el.hidden && el.kind === 'image' && isPrimaryImageElement(el) && el.imageUrl)
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const el of products) {
    const node = canvasRoot.querySelector<HTMLElement>(
      `[data-element-id="${CSS.escape(el.id)}"]`,
    );
    if (!node) continue;
    const imgEl = node.querySelector('img');
    if (!imgEl) continue;

    if (!imgEl.complete || imgEl.naturalWidth === 0) {
      await new Promise<void>((resolve) => {
        imgEl.addEventListener('load', () => resolve(), { once: true });
        imgEl.addEventListener('error', () => resolve(), { once: true });
      });
    }
    if (!imgEl.naturalWidth) continue;

    const x = node.offsetLeft;
    const y = node.offsetTop;
    const w = node.offsetWidth;
    const h = node.offsetHeight;

    const fit = el.imageFit ?? 'contain';
    let dx = 0;
    let dy = 0;
    let dw = w;
    let dh = h;
    if (fit === 'contain') {
      const imgRatio = imgEl.naturalWidth / imgEl.naturalHeight;
      const boxRatio = w / h;
      if (imgRatio > boxRatio) {
        dh = w / imgRatio;
        dy = (h - dh) / 2;
      } else {
        dw = h * imgRatio;
        dx = (w - dw) / 2;
      }
    }

    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;
    if (el.rotation) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    ctx.drawImage(imgEl, x + dx, y + dy, dw, dh);
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}
