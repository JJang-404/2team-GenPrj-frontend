import { removeBackground } from '@imgly/background-removal';
import { BG_REMOVAL_CONFIG } from '../config/backgroundRemoval';
import { cropToBoundingBox } from './cropToBoundingBox';

interface RemoveBgResult {
  url: string;
  cropWidth: number;
  cropHeight: number;
}

/**
 * 배경 제거 파이프라인:
 *   1. @imgly/background-removal로 배경 제거 (WebGPU / WASM)
 *   2. 불투명 픽셀 바운딩 박스로 크롭
 *   3. 중간 blob URL 해제
 */
export async function removeBgPipeline(imageSrc: string): Promise<RemoveBgResult> {
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

  return { url: crop.url, cropWidth: crop.width, cropHeight: crop.height };
}
