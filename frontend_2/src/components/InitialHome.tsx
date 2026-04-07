import { useMemo, useState } from 'react';
import { removeBackgroundImage } from '../api/client';
import type { HomeAdditionalInfo, HomeProjectData, HomeProductInput } from '../types/home';
import HomePreviewCard from './home/HomePreviewCard';
import {
  createEmptyProduct,
  createSloganCandidates,
  initialAdditionalInfo,
  initialHomeOptions,
} from '../utils/homeEditor';

interface InitialHomeProps {
  onStart: (data: HomeProjectData, draftIndex?: number) => void;
}

export default function InitialHome({ onStart }: InitialHomeProps) {
  const conceptOptions = [
    { value: 'solid', label: '단색' },
    { value: 'gradient', label: '그라데이션' },
    { value: 'pastel', label: '다중색' },
    { value: 'ai-image', label: 'AI 이미지 생성' },
  ] as const;

  const [isExpanded, setIsExpanded] = useState(true);
  const [isGeneratingSlogan, setIsGeneratingSlogan] = useState(false);
  const [options, setOptions] = useState({ ...initialHomeOptions });
  const [inputData, setInputData] = useState({
    storeName: '',
    mainSlogan: '',
    details: '',
  });
  const [additionalInfo, setAdditionalInfo] = useState<HomeAdditionalInfo>(initialAdditionalInfo);
  const [products, setProducts] = useState<HomeProductInput[]>([createEmptyProduct(1)]);
  const [processingIds, setProcessingIds] = useState<number[]>([]);

  const activeProducts = useMemo(
    () => products.filter((product) => product.image || product.name || product.isAiGen),
    [products]
  );

  const addProduct = () => {
    setProducts((prev) => [...prev, createEmptyProduct()]);
  };

  const removeProduct = (id: number) => {
    setProducts((prev) => (prev.length > 1 ? prev.filter((product) => product.id !== id) : prev));
  };

  const updateProduct = (id: number, field: string, value: string | boolean | null) => {
    setProducts((prev) => prev.map((product) => (product.id === id ? { ...product, [field]: value } : product)));
  };

  const handleProductImage = (id: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const originalImage = reader.result as string;
      updateProduct(id, 'image', originalImage);
      updateProduct(id, 'isAiGen', false);
      setProcessingIds((prev) => [...prev, id]);

      try {
        const result = await removeBackgroundImage(originalImage);
        updateProduct(id, 'image', result.imageDataUrl);
      } catch (_error) {
        updateProduct(id, 'image', originalImage);
      } finally {
        setProcessingIds((prev) => prev.filter((item) => item !== id));
      }
    };
    reader.readAsDataURL(file);
  };

  const generateAiSlogan = () => {
    if (!inputData.storeName.trim() && !products[0]?.name.trim()) {
      return;
    }

    setIsGeneratingSlogan(true);
    window.setTimeout(() => {
      const store = inputData.storeName || '우리 가게';
      const product = products[0]?.name || '시그니처 메뉴';
      const candidates = createSloganCandidates(store, product, options.concept);
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      setInputData((prev) => ({ ...prev, mainSlogan: next }));
      setIsGeneratingSlogan(false);
    }, 900);
  };

  const buildStartPayload = () => {
    return {
      options,
      storeName: inputData.storeName.trim(),
      mainSlogan: inputData.mainSlogan.trim(),
      details: inputData.details.trim(),
      products,
      additionalInfo,
    };
  };

  const handleStart = (draftIndex?: number) => {
    onStart(buildStartPayload(), draftIndex);
  };

  return (
    <div className="home-shell">
      <aside className="home-sidebar">
        <div className="home-sidebar__header">
          <h1 className="home-sidebar__brand">
            AD-GEN <span>PRO</span>
          </h1>
          <button type="button" className="home-sidebar__expand" onClick={() => setIsExpanded((prev) => !prev)}>
            {isExpanded ? '축소' : '상세 확장'}
          </button>
        </div>

        <div className="home-sidebar__body">
          <section className="home-panel">
            <label className="home-panel__label">디자인 컨셉</label>
            <div className="home-panel__concepts">
              {conceptOptions.map((concept) => (
                <button
                  key={concept.value}
                  type="button"
                  className={`home-panel__concept ${options.concept === concept.value ? 'home-panel__concept--active' : ''}`}
                  onClick={() => setOptions((prev) => ({ ...prev, concept: concept.value }))}
                >
                  {concept.label}
                </button>
              ))}
            </div>
            <div className="home-panel__color-row">
              <input
                type="color"
                value={options.brandColor}
                onChange={(event) => setOptions((prev) => ({ ...prev, brandColor: event.target.value }))}
                className="home-panel__picker"
              />
              <span>컬러: {options.brandColor}</span>
              <input
                type="range"
                min="1"
                max="6"
                value={options.sampleCount}
                onChange={(event) => setOptions((prev) => ({ ...prev, sampleCount: Number(event.target.value) }))}
              />
            </div>
          </section>

          <section className="home-panel">
            <label className="home-panel__label">광고 정보</label>
            <input
              className="home-panel__input"
              placeholder="가게 이름을 입력하세요"
              value={inputData.storeName}
              onChange={(event) => setInputData((prev) => ({ ...prev, storeName: event.target.value }))}
            />
            <div className="home-panel__slogan-wrap">
              <input
                className="home-panel__input home-panel__input--accent"
                placeholder="전체 광고 문구 (미입력 시 AI 생성)"
                value={inputData.mainSlogan}
                onChange={(event) => setInputData((prev) => ({ ...prev, mainSlogan: event.target.value }))}
              />
              <button type="button" className="home-panel__mini-btn" onClick={generateAiSlogan} disabled={isGeneratingSlogan}>
                {isGeneratingSlogan ? '생성 중' : 'AI 문구'}
              </button>
            </div>
            <textarea
              className="home-panel__textarea"
              rows={3}
              placeholder="AI 상세 지시사항 (이미지 구도나 분위기)"
              value={inputData.details}
              onChange={(event) => setInputData((prev) => ({ ...prev, details: event.target.value }))}
            />
          </section>

          <section className="home-panel">
            <label className="home-panel__label">추가 정보</label>
            <div className="home-info-grid">
              <input
                className="home-panel__input"
                placeholder="주차 가능 수"
                value={additionalInfo.parkingSpaces}
                onChange={(event) => setAdditionalInfo((prev) => ({ ...prev, parkingSpaces: event.target.value }))}
              />
              <input
                className="home-panel__input"
                placeholder="전화번호"
                value={additionalInfo.phoneNumber}
                onChange={(event) => setAdditionalInfo((prev) => ({ ...prev, phoneNumber: event.target.value }))}
              />
              <input
                className="home-panel__input home-info-grid__address"
                placeholder="주소"
                value={additionalInfo.address}
                onChange={(event) => setAdditionalInfo((prev) => ({ ...prev, address: event.target.value }))}
              />
            </div>
            <div className="home-info-toggles">
              <button
                type="button"
                className={`home-info-toggle ${additionalInfo.petFriendly ? 'home-info-toggle--active' : ''}`}
                onClick={() => setAdditionalInfo((prev) => ({ ...prev, petFriendly: !prev.petFriendly }))}
              >
                애견 동반 {additionalInfo.petFriendly ? '가능' : '불가'}
              </button>
              <button
                type="button"
                className={`home-info-toggle ${additionalInfo.noKidsZone ? 'home-info-toggle--active' : ''}`}
                onClick={() => setAdditionalInfo((prev) => ({ ...prev, noKidsZone: !prev.noKidsZone }))}
              >
                노키즈존 {additionalInfo.noKidsZone ? '예' : '아니오'}
              </button>
              <button
                type="button"
                className={`home-info-toggle ${additionalInfo.smokingArea ? 'home-info-toggle--active' : ''}`}
                onClick={() => setAdditionalInfo((prev) => ({ ...prev, smokingArea: !prev.smokingArea }))}
              >
                흡연 구역 {additionalInfo.smokingArea ? '있음' : '없음'}
              </button>
              <button
                type="button"
                className={`home-info-toggle ${additionalInfo.elevator ? 'home-info-toggle--active' : ''}`}
                onClick={() => setAdditionalInfo((prev) => ({ ...prev, elevator: !prev.elevator }))}
              >
                엘리베이터 {additionalInfo.elevator ? '있음' : '없음'}
              </button>
            </div>
          </section>

          {isExpanded && (
            <section className="home-panel home-panel--products">
              <div className="home-panel__products-head">
                <label className="home-panel__label">상세 제품 리스트</label>
                <button type="button" className="home-panel__add" onClick={addProduct}>제품 추가 +</button>
              </div>

              <div className="home-product-grid">
                {products.map((product, index) => (
                  <div key={product.id} className="home-product-card">
                    <div className="home-product-card__tag">ITEM {index + 1}</div>
                    <div className="home-product-card__upload">
                      {product.image ? (
                        <div className="home-product-card__preview-wrap">
                          <img src={product.image} alt="" className="home-product-card__preview" />
                          {processingIds.includes(product.id) && (
                            <div className="home-product-card__processing">배경 제거 중...</div>
                          )}
                        </div>
                      ) : (
                        <label className="home-product-card__upload-label">
                          이미지 업로드
                          <input type="file" accept="image/*" hidden onChange={(event) => handleProductImage(product.id, event)} />
                        </label>
                      )}
                    </div>
                    <div className="home-product-card__fields">
                      <div className="home-product-card__row">
                        <input
                          className="home-panel__input"
                          placeholder="제품명"
                          value={product.name}
                          onChange={(event) => updateProduct(product.id, 'name', event.target.value)}
                        />
                        <input
                          className="home-panel__input"
                          placeholder="가격"
                          value={product.price}
                          onChange={(event) => updateProduct(product.id, 'price', event.target.value)}
                        />
                      </div>
                      <textarea
                        className="home-panel__textarea"
                        rows={2}
                        placeholder="제품 설명"
                        value={product.description}
                        onChange={(event) => updateProduct(product.id, 'description', event.target.value)}
                      />
                      <div className="home-product-card__toggles">
                        <button type="button" onClick={() => updateProduct(product.id, 'showName', !product.showName)}>이름 {product.showName ? 'ON' : 'OFF'}</button>
                        <button type="button" onClick={() => updateProduct(product.id, 'showPrice', !product.showPrice)}>가격 {product.showPrice ? 'ON' : 'OFF'}</button>
                        <button type="button" onClick={() => updateProduct(product.id, 'showDesc', !product.showDesc)}>설명 {product.showDesc ? 'ON' : 'OFF'}</button>
                        {products.length > 1 && (
                          <button type="button" className="danger" onClick={() => removeProduct(product.id)}>삭제</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="home-sidebar__footer">
          <button
            type="button"
            className="home-sidebar__generate"
            onClick={() => handleStart()}
            disabled={processingIds.length > 0}
          >
            {processingIds.length > 0 ? '이미지 처리 중...' : 'Generate AI Drafts'}
          </button>
        </div>
      </aside>

      <main className="home-preview">
        <header className="home-preview__header">
          <h2>Draft Preview</h2>
          <div className="home-preview__ratios">
            {['1:1', '4:5', '9:16'].map((ratio) => (
              <button
                key={ratio}
                type="button"
                className={options.ratio === ratio ? 'active' : ''}
                onClick={() => setOptions((prev) => ({ ...prev, ratio }))}
              >
                {ratio}
              </button>
            ))}
          </div>
        </header>

        <div className="home-preview__grid">
          {Array.from({ length: options.sampleCount }).map((_, index) => (
            <HomePreviewCard
              key={index}
              concept={options.concept}
              brandColor={options.brandColor}
              slogan={inputData.mainSlogan}
              storeName={inputData.storeName}
              products={activeProducts}
              sampleIndex={index}
              onSelect={() => handleStart(index)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
