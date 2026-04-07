import { Zap, ChevronRight, ChevronLeft } from 'lucide-react';
import BgSection from './sections/BgSection';
import BasicInfoSection from './sections/BasicInfoSection';
import ExtraInfoSection from './sections/ExtraInfoSection';
import ProductsSection from './sections/ProductsSection';
import type { InitOptions, InitBasicInfo, InitExtraInfo, InitProduct } from '../../types';

interface Props {
  isExpanded: boolean;
  onToggleExpand: () => void;
  options: InitOptions;
  updateOption: <K extends keyof InitOptions>(key: K, value: InitOptions[K]) => void;
  basicInfo: InitBasicInfo;
  updateBasicInfo: <K extends keyof InitBasicInfo>(key: K, value: InitBasicInfo[K]) => void;
  extraInfo: InitExtraInfo;
  updateExtraInfo: <K extends keyof InitExtraInfo>(key: K, value: InitExtraInfo[K]) => void;
  products: InitProduct[];
  isRemovingBg: Record<number, boolean>;
  isFirstRun: boolean;
  onAddProduct: () => void;
  onRemoveProduct: (id: number) => void;
  onUpdateProduct: <K extends keyof InitProduct>(id: number, field: K, value: InitProduct[K]) => void;
  onProductImage: (id: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBg: (id: number, imageSrc: string | null) => void;
}

const Sidebar = ({
  isExpanded, onToggleExpand,
  options, updateOption,
  basicInfo, updateBasicInfo,
  extraInfo, updateExtraInfo,
  products, isRemovingBg, isFirstRun,
  onAddProduct, onRemoveProduct, onUpdateProduct, onProductImage, onRemoveBg,
}: Props) => (
  <aside
    className={`transition-all duration-500 bg-white border-r border-slate-200 flex flex-col shadow-2xl z-30 shrink-0 ${
      isExpanded ? 'w-[900px]' : 'w-[420px]'
    }`}
  >
    <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
      <span className="text-base font-bold flex items-center gap-2 font-zen">
        <Zap className="text-blue-500 fill-blue-500" size={16} />
        AD-GEN PRO
      </span>
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

    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
      <BgSection options={options} updateOption={updateOption} />
      <BasicInfoSection
        basicInfo={basicInfo}
        updateBasicInfo={updateBasicInfo}
        brandColor={options.brandColor}
        onBrandColorChange={(v) => updateOption('brandColor', v)}
      />
      <ExtraInfoSection extraInfo={extraInfo} updateExtraInfo={updateExtraInfo} />
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
