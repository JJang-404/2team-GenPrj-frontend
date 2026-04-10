import type { HomeProductInput } from '../types/home';

interface BakedImageData {
  naturalWidth: number;
  naturalHeight: number;
  leftHalf: string;
  rightHalf: string;
}

/**
 * 이미지 URL을 로드하여 자연 크기와 좌/우 절반 dataURL을 추출합니다.
 * 레이아웃 Type 3/4의 분할 뷰 렌더링에 사용됩니다.
 */
function extractImageHalves(src: string): Promise<BakedImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img;
      const halfWidth = Math.floor(naturalWidth / 2);

      const leftCanvas = document.createElement('canvas');
      leftCanvas.width = halfWidth;
      leftCanvas.height = naturalHeight;
      const leftCtx = leftCanvas.getContext('2d');
      if (!leftCtx) { reject(new Error('canvas context failed')); return; }
      leftCtx.drawImage(img, 0, 0);

      const rightCanvas = document.createElement('canvas');
      rightCanvas.width = naturalWidth - halfWidth;
      rightCanvas.height = naturalHeight;
      const rightCtx = rightCanvas.getContext('2d');
      if (!rightCtx) { reject(new Error('canvas context failed')); return; }
      rightCtx.drawImage(img, -halfWidth, 0);

      resolve({
        naturalWidth,
        naturalHeight,
        leftHalf: leftCanvas.toDataURL('image/png'),
        rightHalf: rightCanvas.toDataURL('image/png'),
      });
    };
    img.onerror = () => reject(new Error(`이미지 로드 실패: ${src}`));
    img.src = src;
  });
}

/**
 * 단일 상품 이미지를 프리베이크합니다.
 * image URL이 없으면 원본을 그대로 반환합니다.
 */
export async function prebakeSingleProductImage(product: HomeProductInput): Promise<HomeProductInput> {
  if (!product.image) return product;

  try {
    const { naturalWidth, naturalHeight, leftHalf, rightHalf } = await extractImageHalves(product.image);
    return {
      ...product,
      imageNaturalWidth: naturalWidth,
      imageNaturalHeight: naturalHeight,
      imageLeftHalf: leftHalf,
      imageRightHalf: rightHalf,
    };
  } catch (err) {
    console.warn(`[prebake] 이미지 프리베이크 실패 (id=${product.id}):`, err);
    return product;
  }
}

/**
 * 상품 배열 전체를 병렬로 프리베이크합니다.
 */
export async function prebakeProductImages(products: HomeProductInput[]): Promise<HomeProductInput[]> {
  return Promise.all(products.map(prebakeSingleProductImage));
}
