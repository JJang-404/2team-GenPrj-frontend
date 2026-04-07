export interface CropResult {
  url: string;
  width: number;  // pixel width of the cropped region
  height: number; // pixel height of the cropped region
}

/**
 * Crops a background-removed image (with transparent pixels) to the tight
 * bounding box of its opaque pixels, removing empty transparent margins.
 *
 * @param blobUrl - Object URL pointing to a PNG with transparency
 * @returns CropResult with the new Object URL and bounding box pixel dimensions.
 *          If no opaque pixels are found, returns the original blobUrl with
 *          the source image's natural dimensions.
 */
export async function cropToBoundingBox(blobUrl: string): Promise<CropResult> {
  const img = await loadImage(blobUrl);

  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  // Draw source image onto a full-size offscreen canvas to read pixel data
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(img, 0, 0);

  const { data } = srcCtx.getImageData(0, 0, srcW, srcH);
  // Release the source canvas backing store eagerly to reduce memory pressure
  // before allocating the destination canvas for large images.
  srcCanvas.width = 0;
  srcCanvas.height = 0;

  // Find bounding box of visibly opaque pixels.
  // Threshold > 10 skips near-invisible anti-aliasing artifacts from
  // background removal that would otherwise inflate the bounding box.
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

  // Guard: no opaque pixels found — return original unchanged with source dimensions
  if (maxX < 0) return { url: blobUrl, width: srcW, height: srcH };

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  // Draw the cropped region onto a new canvas using the original img element
  // (srcCanvas was released above to free its pixel buffer)
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = cropW;
  dstCanvas.height = cropH;
  const dstCtx = dstCanvas.getContext('2d')!;
  dstCtx.drawImage(img, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  return new Promise<CropResult>((resolve, reject) => {
    dstCanvas.toBlob(
      blob => (blob
        ? resolve({ url: URL.createObjectURL(blob), width: cropW, height: cropH })
        : reject(new Error('cropToBoundingBox: toBlob failed'))),
      'image/png',
    );
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cropToBoundingBox: failed to load image: ${url}`));
    img.src = url;
  });
}
