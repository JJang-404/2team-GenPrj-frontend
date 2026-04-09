import { Zap, ChevronRight, ChevronLeft } from 'lucide-react';
import BgSection from './sections/BgSection';
import BasicInfoSection from './sections/BasicInfoSection';
import ExtraInfoSection from './sections/ExtraInfoSection';
import ProductsSection from './sections/ProductsSection';

/**
 * 사이드바 (메뉴바)
 *   - 흰색 테마 (기존 UI 유지)
 *   - 세로 스크롤 (custom-scrollbar)
 *   - 미확장: 420px / 확장: 900px
 *   - 헤더: 프로젝트 로고(홈 링크) + 확장/축소 버튼
 */
const Sidebar = ({
  isExpanded,
  onToggleExpand,
  options,
  updateOption,
  basicInfo,
  updateBasicInfo,
  extraInfo,
  updateExtraInfo,
  products,
  isRemovingBg,
  isFirstRun,
  onAddProduct,
  onRemoveProduct,
  onUpdateProduct,
  onProductImage,
  onRemoveBg,
  onGenerateAiBg,
}) => (
  <aside
    className={`transition-all duration-500 bg-white border-r border-slate-200 flex flex-col shadow-2xl z-30 shrink-0 ${
      isExpanded ? 'w-[900px]' : 'w-[420px]'
    }`}
  >
    {/* 헤더 */}
    <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
      <a
        href="/"
        className="text-base font-bold flex items-center gap-2 font-zen hover:opacity-80 transition-opacity"
        title="홈페이지로 이동"
      >
        <Zap className="text-blue-500 fill-blue-500" size={16} />
        AD-GEN PRO
      </a>
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all"
        title={isExpanded ? '축소' : '상세 확장'}
      >
        {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        {isExpanded ? '축소' : '상세 확장'}
      </button>
    </div>

    {/* 스크롤 가능 콘텐츠 */}
    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
      {/* 구역 1: 배경 종류 */}
      <BgSection options={options} updateOption={updateOption} onGenerateAiBg={onGenerateAiBg} />

      {/* 구역 2: 기본 정보 */}
      <BasicInfoSection
        basicInfo={basicInfo}
        updateBasicInfo={updateBasicInfo}
        brandColor={options.brandColor}
        onBrandColorChange={(v) => updateOption('brandColor', v)}
      />

      {/* 구역 3: 추가 정보 */}
      <ExtraInfoSection extraInfo={extraInfo} updateExtraInfo={updateExtraInfo} />

      {/* 구역 4: 상품 정보 */}
      <ProductsSection
        products={products}
        isRemovingBg={isRemovingBg}
        isFirstRun={isFirstRun}
        isExpanded={isExpanded}
        onAddProduct={onAddProduct}
        onRemoveProduct={onRemoveProduct}
        onUpdateProduct={onUpdateProduct}
        onProductImage={onProductImage}
        onRemoveBg={onRemoveBg}
      />
    </div>
  </aside>
);

export default Sidebar;