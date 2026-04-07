import { useState } from 'react';
import { FONT_STYLES, RATIOS } from './constants/design';
import { useDesignOptions } from './hooks/useDesignOptions';
import { useProducts } from './hooks/useProducts';
import { buildProjectData } from './utils/buildProjectData';
import Sidebar from './components/sidebar/Sidebar';
import DraftCard from './components/draft/DraftCard';
import type { HomeProjectData } from '../../types/home';

interface Props {
  /** "디자인 편집" 버튼 또는 카드 더블클릭 시 호출 */
  onEnterEditor: (projectData: HomeProjectData, draftIndex: number) => void;
}

const InitPage = ({ onEnterEditor }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const {
    products, isRemovingBg, isFirstRun,
    addProduct, removeProduct, updateProduct,
    handleProductImage, handleRemoveBackground,
  } = useProducts();

  const {
    options, basicInfo, extraInfo, inputData,
    updateOption, updateBasicInfo, updateExtraInfo,
  } = useDesignOptions();

  const handleSelectDesign = (idx: number) => setSelectedIdx(idx);

  const handleEditDesign = (idx: number) => {
    const data = buildProjectData(options, basicInfo, extraInfo, products);
    onEnterEditor(data, idx);
  };

  const orderedIndices = (() => {
    const all = Array.from({ length: options.sampleCount }, (_, i) => i);
    return selectedIdx !== null
      ? [selectedIdx, ...all.filter((i) => i !== selectedIdx)]
      : all;
  })();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      <style>{FONT_STYLES}</style>

      <Sidebar
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded((e) => !e)}
        options={options}
        updateOption={updateOption}
        basicInfo={basicInfo}
        updateBasicInfo={updateBasicInfo}
        extraInfo={extraInfo}
        updateExtraInfo={updateExtraInfo}
        products={products}
        isRemovingBg={isRemovingBg}
        isFirstRun={isFirstRun}
        onAddProduct={addProduct}
        onRemoveProduct={removeProduct}
        onUpdateProduct={updateProduct}
        onProductImage={handleProductImage}
        onRemoveBg={handleRemoveBackground}
      />

      <main className="flex-1 overflow-y-auto p-12 bg-slate-100/50">
        <header className="flex justify-between items-end mb-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase font-zen">
            Draft Preview
          </h2>
          <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-xl border border-slate-200">
            {RATIOS.map((r) => (
              <button
                key={r}
                onClick={() => updateOption('ratio', r)}
                className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${
                  options.ratio === r ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </header>

        <div
          className={`grid gap-12 ${
            options.sampleCount <= 4 ? 'grid-cols-2' : 'grid-cols-3'
          } max-w-[1200px] mx-auto pb-20`}
        >
          {orderedIndices.map((idx) => (
            <DraftCard
              key={idx}
              idx={idx}
              isSelected={selectedIdx === idx}
              onSelect={handleSelectDesign}
              onEditDesign={handleEditDesign}
              products={products}
              options={options}
              inputData={inputData}
              extraInfo={extraInfo}
              onUpdateOption={updateOption}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default InitPage;
