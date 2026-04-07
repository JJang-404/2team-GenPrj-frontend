/**
 * Crops a background-removed image (with transparent pixels) to the tight
 * bounding box of its opaque pixels, removing empty transparent margins.
 *
 * @param {string} blobUrl - Object URL pointing to a PNG with transparency
 * @returns {Promise<{url: string, width: number, height: number}>}
 *          url: new Object URL of the cropped image
 *          width/height: pixel dimensions of the cropped region
 *          If no opaque pixels found, returns original blobUrl with source dimensions.
 */
export async function cropToBoundingBox(blobUrl) {
  const img = await loadImage(blobUrl);

  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(img, 0, 0);

  const { data } = srcCtx.getImageData(0, 0, srcW, srcH);
  // Release source canvas backing store early to reduce memory pressure
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
  const dstCtx = dstCanvas.getContext('2d');
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

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cropToBoundingBox: failed to load image: ${url}`));
    img.src = url;
  });
}
