import { removeBackground } from '@imgly/background-removal';
import { BG_REMOVAL_CONFIG } from '../config/backgroundRemoval';
import { cropToBoundingBox } from './cropToBoundingBox';

/**
 * Background removal pipeline:
 *   1. Remove background via @imgly/background-removal (WebGPU / WASM)
 *   2. Crop to tight bounding box of opaque pixels
 *   3. Release intermediate blob URLs
 *
 * @param {string} imageSrc - data URL or blob URL of the source image
 * @returns {Promise<{url: string, cropWidth: number, cropHeight: number}>}
 */
export async function removeBgPipeline(imageSrc) {
  const bgBlob = await removeBackground(imageSrc, BG_REMOVAL_CONFIG);
  const bgRemovedUrl = URL.createObjectURL(bgBlob);

  let crop;
  try {
    crop = await cropToBoundingBox(bgRemovedUrl);
  } catch (e) {
    URL.revokeObjectURL(bgRemovedUrl);
    throw e;
  }

  if (crop.url !== bgRemovedUrl) {
    URL.revokeObjectURL(bgRemovedUrl);
  }

  return {
    url: crop.url,
    cropWidth: crop.width,
    cropHeight: crop.height,
  };
}

/**
 * Calculate new slot dimensions after cropping.
 * One dimension stays at the original slot size, the other grows
 * to match the bounding box aspect ratio.
 *
 * @param {number} slotWidthPct  - current slot width (% of canvas width)
 * @param {number} slotHeightPct - current slot height (% of canvas height)
 * @param {number} cropWidth     - cropped image pixel width
 * @param {number} cropHeight    - cropped image pixel height
 * @param {number} [canvasWidth=400]  - canvas logical width
 * @param {number} [canvasHeight=500] - canvas logical height
 * @returns {{ width: number, height: number }} in canvas % units
 */
export function calcSlotResize(
  slotWidthPct,
  slotHeightPct,
  cropWidth,
  cropHeight,
  canvasWidth = 400,
  canvasHeight = 500,
) {
  const slotWcu = slotWidthPct * canvasWidth / 100;
  const slotHcu = slotHeightPct * canvasHeight / 100;
  const scale = Math.max(slotWcu / cropWidth, slotHcu / cropHeight);
  return {
    width: (scale * cropWidth) * 100 / canvasWidth,
    height: (scale * cropHeight) * 100 / canvasHeight,
  };
}
