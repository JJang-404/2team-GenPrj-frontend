interface CropResult {
  url: string;
  width: number;
  height: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cropToBoundingBox: failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * 배경이 제거된 이미지를 불투명 픽셀의 타이트한 바운딩 박스로 크롭합니다.
 */
export async function cropToBoundingBox(blobUrl: string): Promise<CropResult> {
  const img = await loadImage(blobUrl);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(img, 0, 0);

  const { data } = srcCtx.getImageData(0, 0, srcW, srcH);
  srcCanvas.width = 0;
  srcCanvas.height = 0;

  const ALPHA_THRESHOLD = 25;
  let minX = srcW, minY = srcH, maxX = -1, maxY = -1;
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const alpha = data[(y * srcW + x) * 4 + 3];
      if (alpha > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return { url: blobUrl, width: srcW, height: srcH };

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = cropW;
  dstCanvas.height = cropH;
  const dstCtx = dstCanvas.getContext('2d')!;
  dstCtx.drawImage(img, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  return new Promise((resolve, reject) => {
    dstCanvas.toBlob(
      (blob) =>
        blob
          ? resolve({ url: URL.createObjectURL(blob), width: cropW, height: cropH })
          : reject(new Error('cropToBoundingBox: toBlob failed')),
      'image/png',
    );
  });
}
