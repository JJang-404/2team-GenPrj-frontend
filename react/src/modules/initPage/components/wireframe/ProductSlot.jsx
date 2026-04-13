/**
 * ProductSlot — 제품 슬롯
 *
 * 이미지가 있으면 표시하고, 없으면 플레이스홀더를 렌더링합니다.
 * 높이(h-full)는 부모가 결정하며, 너비는 이미지의 자연 비율에 따라 결정됩니다.
 */
export const ProductSlot = ({ product, isSquare, className = '', showLabel = true, style }) => {
  const hasImage = product?.image;

  return (
    <div className={`flex flex-col items-center ${className}`} style={style}>
      <div className="bg-white/5 rounded-lg border border-white/20 overflow-hidden h-full flex items-center justify-center">
        {hasImage ? (
          <img
            src={product.image}
            alt={product.name || ''}
            className="h-full w-auto max-w-full object-contain drop-shadow-lg"
          />
        ) : (
          <div className="flex items-center justify-center p-4">
            <div className={`${isSquare ? 'w-8 h-8' : 'w-12 h-12'} border-2 border-dashed border-white/30 rounded-lg`} />
          </div>
        )}
      </div>
      {showLabel && product?.name && product?.showName && (
        <p className={`${isSquare ? 'text-[8px]' : 'text-[11px]'} text-black/80 font-bold mt-1 text-center truncate w-full`}>
          {product.name}
        </p>
      )}
      {showLabel && product?.price && product?.showPrice && (
        <p className={`${isSquare ? 'text-[7px]' : 'text-[10px]'} text-black/80 font-bold text-center`}>
          {Number(product.price).toLocaleString()}{product.currency ?? '원'}
        </p>
      )}
    </div>
  );
};
