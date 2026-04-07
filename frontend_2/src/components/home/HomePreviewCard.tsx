import type { HomeProductInput } from '../../types/editor';
import { getDraftLayoutStyle } from '../../utils/homeEditor';

interface HomePreviewCardProps {
  concept: string;
  brandColor: string;
  slogan: string;
  storeName: string;
  products: HomeProductInput[];
  sampleIndex: number;
  onSelect: () => void;
}

export default function HomePreviewCard({
  concept,
  brandColor,
  slogan,
  storeName,
  products,
  sampleIndex,
  onSelect,
}: HomePreviewCardProps) {
  return (
    <button type="button" className="home-preview__card home-preview__card-button" onClick={onSelect}>
      <div className={`home-preview__poster home-preview__poster--${concept}`}>
        <div className="home-preview__badge">{slogan || 'AI SLOGAN'}</div>
        {products.slice(0, 3).map((product, productIndex) => (
          <div
            key={product.id}
            className={`home-preview__product home-preview__product--layout-${sampleIndex}-${productIndex}`}
            style={getDraftLayoutStyle(sampleIndex, productIndex)}
          >
            {product.image ? (
              <img src={product.image} alt="" className="home-preview__product-image" />
            ) : (
              <div className="home-preview__product-placeholder">AUTO GEN</div>
            )}
            {(product.showName && product.name) || (product.showPrice && product.price) ? (
              <div className="home-preview__product-caption">
                {product.showName && product.name && <strong>{product.name}</strong>}
                {product.showPrice && product.price && <span>{product.price}</span>}
              </div>
            ) : null}
          </div>
        ))}
        <div className="home-preview__store" style={{ color: brandColor }}>
          {storeName || 'STORE NAME'}
        </div>
      </div>
    </button>
  );
}
