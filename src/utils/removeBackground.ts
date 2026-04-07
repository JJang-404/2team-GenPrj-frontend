import { removeBackground } from '@imgly/background-removal';
import { BG_REMOVAL_CONFIG } from '../config/backgroundRemoval';
import { cropToBoundingBox, type CropResult } from './cropToBoundingBox';

export interface RemoveBgResult {
  /** Cropped image blob URL (caller must revoke when done) */
  url: string;
  /** Pixel width of the cropped bounding box */
  cropWidth: number;
  /** Pixel height of the cropped bounding box */
  cropHeight: number;
}

/**
 * Background removal pipeline:
 *   1. Remove background via @imgly/background-removal (WebGPU / WASM)
 *   2. Crop to tight bounding box of opaque pixels
 *   3. Release intermediate blob URLs
 *
 * @param imageSrc - data URL or blob URL of the source image
 * @returns RemoveBgResult with cropped blob URL and dimensions
 */
export async function removeBgPipeline(imageSrc: string): Promise<RemoveBgResult> {
  const bgBlob = await removeBackground(imageSrc, BG_REMOVAL_CONFIG);
  const bgRemovedUrl = URL.createObjectURL(bgBlob);

  let crop: CropResult;
  try {
    crop = await cropToBoundingBox(bgRemovedUrl);
  } catch (e) {
    URL.revokeObjectURL(bgRemovedUrl);
    throw e;
  }

  // Release uncropped intermediate if crop created a new blob
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
 * @param slotWidthPct  - current slot width (% of canvas width)
 * @param slotHeightPct - current slot height (% of canvas height)
 * @param cropWidth     - cropped image pixel width
 * @param cropHeight    - cropped image pixel height
 * @param canvasWidth   - canvas logical width (default 400)
 * @param canvasHeight  - canvas logical height (default 500)
 * @returns { width, height } in canvas % units
 */
export function calcSlotResize(
  slotWidthPct: number,
  slotHeightPct: number,
  cropWidth: number,
  cropHeight: number,
  canvasWidth = 400,
  canvasHeight = 500,
): { width: number; height: number } {
  const slotWcu = slotWidthPct * canvasWidth / 100;
  const slotHcu = slotHeightPct * canvasHeight / 100;
  const scale = Math.max(slotWcu / cropWidth, slotHcu / cropHeight);
  return {
    width: (scale * cropWidth) * 100 / canvasWidth,
    height: (scale * cropHeight) * 100 / canvasHeight,
  };
}
