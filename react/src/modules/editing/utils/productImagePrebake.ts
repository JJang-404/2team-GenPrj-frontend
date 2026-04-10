/**
 * productImagePrebake — editing 모듈 전용 제품 이미지 프리베이크 유틸.
 *
 * Type 4 반크롭 구도에서 `objectFit: cover + objectPosition`이 컨테이너 리사이즈에
 * 의존해 크롭 영역이 흔들리는 문제를 피하기 위해, 편집 모듈 로드 시점에
 * 제품 원본 이미지를 canvas로 좌/우 절반 PNG dataURL로 잘라 메모리에 저장한다.
 *
 * - 포맷: PNG (투명 배경 보존, 향후 합성 단계 대비)
 * - 실패 허용: 단일 제품 실패는 해당 제품만 크롭 없이 fallback; 전체를 막지 않는다
 * - CORS: 브라우저 tainted canvas 방지를 위해 `crossOrigin='anonymous'` 지정.
 *   현재 editing 모듈 이미지 소스(Vite static, blob URL, data URL)는 모두 안전.
 */

import type { HomeProductInput } from '../types/home';

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로드 실패: ${url}`));
    img.src = url;
  });
}

type HalfSide = 'left' | 'right';

function cropHalfToDataUrl(img: HTMLImageElement, side: HalfSide): string {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const halfW = Math.floor(iw / 2);
  // 오른쪽은 나머지 픽셀을 모두 포함 (홀수 폭 대비)
  const cropW = side === 'left' ? halfW : iw - halfW;
  const sx = side === 'left' ? 0 : halfW;

  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = ih;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('canvas 2D 컨텍스트를 가져올 수 없습니다');
  }
  ctx.drawImage(img, sx, 0, cropW, ih, 0, 0, cropW, ih);
  return canvas.toDataURL('image/png');
}

/**
 * 단일 제품의 원본 이미지를 읽어 좌/우 절반 PNG dataURL + natural 크기를 반환한다.
 * 이미지가 없거나 로드/crop이 실패하면 기존 제품을 그대로 반환한다.
 */
async function prebakeSingleProduct(product: HomeProductInput): Promise<HomeProductInput> {
  if (!product.image) {
    return product;
  }
  try {
    const img = await loadImageElement(product.image);
    const imageLeftHalf = cropHalfToDataUrl(img, 'left');
    const imageRightHalf = cropHalfToDataUrl(img, 'right');
    return {
      ...product,
      imageLeftHalf,
      imageRightHalf,
      imageNaturalWidth: img.naturalWidth,
      imageNaturalHeight: img.naturalHeight,
    };
  } catch (error) {
    console.warn('[productImagePrebake] 제품 이미지 프리베이크 실패', {
      productId: product.id,
      error,
    });
    return product;
  }
}

/**
 * 제품 배열 전체를 병렬로 프리베이크한다. 실패한 제품은 crop 없이 그대로 유지된다.
 */
export async function prebakeProductImages(
  products: HomeProductInput[]
): Promise<HomeProductInput[]> {
  return Promise.all(products.map((product) => prebakeSingleProduct(product)));
}

/**
 * 단일 제품만 재프리베이크한다. editing 안에서 사용자가 이미지를 교체하거나
 * `transformImageToFrontal`로 AI 변환을 수행한 직후 호출한다.
 */
export async function prebakeSingleProductImage(
  product: HomeProductInput
): Promise<HomeProductInput> {
  return prebakeSingleProduct(product);
}
