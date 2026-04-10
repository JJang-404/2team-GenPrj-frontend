import html2canvas from 'html2canvas';

export async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        })
    )
  );
}

export async function captureElementAsDataUrl(root: HTMLElement, scale = 1.5) {
  await waitForImages(root);
  await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));

  const canvas = await html2canvas(root, {
    backgroundColor: null,
    scale,
    useCORS: true,
  });

  return canvas.toDataURL('image/png');
}

/**
 * 투명 PNG의 투명 영역을 지정한 색으로 채워 반환합니다.
 * AI 모델에 가이드 이미지 전달 시 투명(=검은색) 문제를 방지하기 위해 사용합니다.
 */
export async function fillTransparentWithColor(dataUrl: string, fillColor = '#ffffff'): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = dataUrl;
  });
}

export interface InpaintMaskOptions {
  /** 객체로 판단할 최소 알파값 (기본: 8) */
  alphaThreshold?: number;
  /** 객체 영역 팽창 반경(px) (기본: 0) */
  padding?: number;
  /** 경계 블러 반경(px) (기본: 0) */
  blur?: number;
}

/**
 * 이미지의 알파 채널 상태를 검사하여 투명/불투명 픽셀 수를 반환합니다.
 */
export async function inspectAlpha(
  dataUrl: string
): Promise<{ transparent: number; opaque: number; total: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0;
      let opaque = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] === 0) transparent++;
        else opaque++;
      }
      resolve({ transparent, opaque, total: transparent + opaque });
    };
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = dataUrl;
  });
}

/**
 * 투명 PNG 이미지를 기반으로 인페인팅용 마스크를 생성합니다.
 * - 원본 알파 채널을 직접 참조하여 객체 영역 판별
 * - padding 으로 객체 주변 보호 범위 확장
 * - blur 로 경계 부드럽게 처리
 *
 * 객체 영역 → 검은색 (#000000) / 배경 영역 → 흰색 (#ffffff)
 */
export async function generateInpaintMask(
  dataUrl: string,
  options: InpaintMaskOptions = {}
): Promise<string> {
  const { alphaThreshold = 8, padding = 0, blur = 0 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const { width, height } = img;

      // 1. 원본 알파 채널 직접 추출
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = width;
      srcCanvas.height = height;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      srcCtx.drawImage(img, 0, 0);
      const srcData = srcCtx.getImageData(0, 0, width, height).data;

      // 2. 알파 임계값 기반으로 객체 마스크 생성 (1 = 객체, 0 = 배경)
      const objectMask = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i++) {
        objectMask[i] = srcData[i * 4 + 3] > alphaThreshold ? 1 : 0;
      }

      // 3. 패딩 적용 (객체 영역 팽창)
      let paddedMask = objectMask;
      if (padding > 0) {
        paddedMask = new Uint8Array(width * height);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (objectMask[y * width + x] !== 1) continue;
            for (let dy = -padding; dy <= padding; dy++) {
              for (let dx = -padding; dx <= padding; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                  paddedMask[ny * width + nx] = 1;
                }
              }
            }
          }
        }
      }

      // 4. 마스크 캔버스 생성 (객체=검은색, 배경=흰색)
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) {
        reject(new Error('Mask canvas context failed'));
        return;
      }
      const maskImageData = maskCtx.createImageData(width, height);
      const maskData = maskImageData.data;
      for (let i = 0; i < width * height; i++) {
        const val = paddedMask[i] === 1 ? 0 : 255;
        maskData[i * 4] = val;
        maskData[i * 4 + 1] = val;
        maskData[i * 4 + 2] = val;
        maskData[i * 4 + 3] = 255;
      }
      maskCtx.putImageData(maskImageData, 0, 0);

      // 5. 블러 적용 (부드러운 경계)
      if (blur > 0) {
        const blurCanvas = document.createElement('canvas');
        blurCanvas.width = width;
        blurCanvas.height = height;
        const blurCtx = blurCanvas.getContext('2d');
        if (blurCtx) {
          blurCtx.filter = `blur(${blur}px)`;
          blurCtx.drawImage(maskCanvas, 0, 0);
          resolve(blurCanvas.toDataURL('image/png'));
          return;
        }
      }

      resolve(maskCanvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = dataUrl;
  });
}
