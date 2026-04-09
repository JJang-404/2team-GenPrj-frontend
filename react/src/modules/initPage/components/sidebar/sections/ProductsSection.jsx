import React from 'react';
import { Plus } from 'lucide-react';
import ProductCard from '../ProductCard';

/**
 * 구역 4 – 상품 정보
 *   isFirstRun: 배경 제거 최초 실행 전 여부 (경고 메시지 표시용)
 */
const ProductsSection = ({
  products,
  isRemovingBg,
  isFirstRun,
  isExpanded,
  onAddProduct,
  onRemoveProduct,
  onUpdateProduct,
  onProductImage,
  onRemoveBg,
}) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">상품 정보</h3>
      <button
        type="button"
        onClick={onAddProduct}
        disabled={products.length >= 6}
        className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-bold rounded transition-colors ${
          products.length >= 6 ? 'bg-gray-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-500'
        }`}
      >
        <Plus size={12} /> {products.length >= 6 ? '최대 6개' : '추가'}
      </button>
    </div>

    <div className={isExpanded ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
      {products.map((p) => (
        <ProductCard
          key={p.id}
          p={p}
          isRemovingBg={!!isRemovingBg[p.id]}
          isFirstRun={isFirstRun}
          canRemove={products.length > 1}
          onUpdate={onUpdateProduct}
          onRemove={onRemoveProduct}
          onImageChange={onProductImage}
          onRemoveBg={onRemoveBg}
        />
      ))}
    </div>
  </section>
);

export default ProductsSection;
