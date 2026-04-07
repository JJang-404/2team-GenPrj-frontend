import { useState } from 'react';
import { removeBackground } from '@imgly/background-removal';
import { createProduct } from '../constants/design';

/**
 * 배경 제거 유틸 — @imgly/background-removal (브라우저 내장 WASM, 서버 불필요)
 *
 * 최초 실행 시 AI 모델 파일(~40 MB)을 CDN에서 다운로드합니다.
 * 이후 실행은 캐시된 모델을 사용해 빠르게 처리됩니다.
 *
 * @param {string} imageSrc - data URL 또는 blob URL
 * @returns {Promise<string>} 투명 배경 처리된 blob URL
 */
async function removeBgClientSide(imageSrc) {
  const blob = await removeBackground(imageSrc);
  return URL.createObjectURL(blob);
}

export const useProducts = () => {
  const [products, setProducts] = useState([createProduct()]);
  /** { [productId]: boolean } — 배경 제거 진행 중 여부 */
  const [isRemovingBg, setIsRemovingBg] = useState({});
  /** 최초 모델 다운로드 여부 (경고 메시지 표시용) */
  const [isFirstRun, setIsFirstRun] = useState(true);

  const updateProduct = (id, field, value) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const addProduct = () =>
    setProducts((prev) => [...prev, createProduct()]);

  const removeProduct = (id) =>
    setProducts((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));

  const handleProductImage = (id, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateProduct(id, 'image', reader.result);
    reader.readAsDataURL(file);
  };

  /**
   * 배경 제거 — 클라이언트 사이드 AI 처리
   * 이전 blob URL은 메모리 누수 방지를 위해 해제합니다.
   */
  const handleRemoveBackground = async (id, imageSrc) => {
    if (!imageSrc) return;

    setIsRemovingBg((prev) => ({ ...prev, [id]: true }));
    // 최초 실행 플래그 업데이트 (처음 한 번만 경고 표시)
    setIsFirstRun(false);

    // 이전 blob URL 저장 (처리 후 해제)
    const prevSrc = imageSrc;

    try {
      const resultUrl = await removeBgClientSide(imageSrc);
      updateProduct(id, 'image', resultUrl);

      // 이전 blob URL 메모리 해제
      if (prevSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(prevSrc);
      }
    } catch (err) {
      console.error('[배경 제거 실패]', err);
      alert('배경 제거에 실패했습니다.\n브라우저 콘솔에서 오류를 확인하세요.');
    } finally {
      setIsRemovingBg((prev) => ({ ...prev, [id]: false }));
    }
  };

  return {
    products,
    isRemovingBg,
    isFirstRun,
    addProduct,
    removeProduct,
    updateProduct,
    handleProductImage,
    handleRemoveBackground,
  };
};
