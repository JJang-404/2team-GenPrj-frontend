import { Plus } from 'lucide-react';
import ProductCard from '../ProductCard';
import type { InitProduct } from '../../../types';

interface Props {
  products: InitProduct[];
  isRemovingBg: Record<number, boolean>;
  isFirstRun: boolean;
  isExpanded: boolean;
  onAddProduct: () => void;
  onRemoveProduct: (id: number) => void;
  onUpdateProduct: <K extends keyof InitProduct>(id: number, field: K, value: InitProduct[K]) => void;
  onProductImage: (id: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBg: (id: number, imageSrc: string | null) => void;
}

const ProductsSection = ({
  products, isRemovingBg, isFirstRun, isExpanded,
  onAddProduct, onRemoveProduct, onUpdateProduct, onProductImage, onRemoveBg,
}: Props) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">상품 정보</h3>
      <button
        type="button"
        onClick={onAddProduct}
        className="flex items-center gap-1 px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded transition-colors"
      >
        <Plus size={12} /> 추가
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
