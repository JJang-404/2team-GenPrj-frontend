import { useState } from 'react';
import { createProduct } from '../constants/design';
import { removeBgPipeline } from '../utils/removeBackground';
import type { InitProduct } from '../types';

export function useProducts() {
  const [products, setProducts] = useState<InitProduct[]>([createProduct()]);
  const [isRemovingBg, setIsRemovingBg] = useState<Record<number, boolean>>({});
  const [isFirstRun, setIsFirstRun] = useState(true);

  const updateProduct = <K extends keyof InitProduct>(id: number, field: K, value: InitProduct[K]) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const addProduct = () => setProducts((prev) => [...prev, createProduct()]);

  const removeProduct = (id: number) =>
    setProducts((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));

  const handleProductImage = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateProduct(id, 'image', reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = async (id: number, imageSrc: string | null) => {
    if (!imageSrc) return;
    setIsRemovingBg((prev) => ({ ...prev, [id]: true }));
    setIsFirstRun(false);
    const prevSrc = imageSrc;
    try {
      const result = await removeBgPipeline(imageSrc);
      updateProduct(id, 'image', result.url);
      if (prevSrc?.startsWith('blob:')) URL.revokeObjectURL(prevSrc);
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
}
