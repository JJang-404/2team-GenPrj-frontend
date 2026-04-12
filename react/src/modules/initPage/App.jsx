import { useState } from 'react';
import { FONT_STYLES, RATIOS } from './constants/design';
import { useProducts } from './hooks/useProducts';
import { useDesignOptions } from './hooks/useDesignOptions';
import Sidebar from './components/sidebar/Sidebar';
import DraftCard from './components/draft/DraftCard';
import {
  buildEditingPayload,
  getEditingAppUrl,
  storeEditingPayload,
} from './utils/editingBridge';

import { storeInfo } from '../../server/api/storeInfo';

const App = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDesigns, setSelectedDesigns] = useState([]);
  // 다음 단계 확인 모달용 — null 이면 비표시, 숫자면 해당 draftIndex 대기 중
  const [pendingIdx, setPendingIdx] = useState(null);

  const {
    products, isRemovingBg, isFirstRun,
    addProduct, removeProduct, updateProduct,
    handleProductImage, handleRemoveBackground,
  } = useProducts();

  const {
    options, basicInfo, extraInfo, inputData,
    updateOption, updateBasicInfo, updateExtraInfo,
    generateAiBgImage,
  } = useDesignOptions();

  /** 실제 편집 페이지 이동 로직 (확인 모달에서 "네" 선택 시 호출) */
  const handleSelectDesign = async (idx) => {
    console.log('[App] 디자인 선택 이벤트 발생 - 인덱스:', idx);
    setSelectedDesigns([idx]);

    // 가게 정보 저장 (편집 페이지 연동용 - 기본 정보 및 상품 소개문구 위주)
    console.log('[App] 가게 정보 저장 시도...');
    storeInfo.saveStoreInfo({ basicInfo, products });

    try {
      const payload = await buildEditingPayload({
        options,
        basicInfo,
        extraInfo,
        products,
        draftIndex: idx,
      });

      const token = await storeEditingPayload(payload);
      const baseUrl = getEditingAppUrl();
      const redirectUrl = token ? `${baseUrl}?token=${token}` : baseUrl;

      window.location.href = redirectUrl;
      return;
    } catch (error) {
      console.error('[editing 브리지 실패]', error);
      alert(`편집 페이지로 데이터를 넘기지 못했습니다.\n${error instanceof Error ? error.message : ''}`);
    }
  };

  /** "이 디자인 선택" 버튼 클릭 → 확인 모달 표시 */
  const handleRequestSelect = (idx) => {
    setPendingIdx(idx);
  };

  /** 확인 모달 "네" → 실제 이동 */
  const handleConfirmYes = () => {
    const idx = pendingIdx;
    setPendingIdx(null);
    handleSelectDesign(idx);
  };

  /** 확인 모달 "아니요" → 모달 닫고 initPage 계속 작업 */
  const handleConfirmNo = () => {
    setPendingIdx(null);
  };

  const orderedIndices = (() => {
    const all = Array.from({ length: options.sampleCount }, (_, i) => i);
    return [...selectedDesigns, ...all.filter((i) => !selectedDesigns.includes(i))];
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
        onGenerateAiBg={generateAiBgImage}
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
              isSelected={selectedDesigns[0] === idx}
              onSelect={handleRequestSelect}
              products={products}
              options={options}
              inputData={inputData}
              extraInfo={extraInfo}
              onUpdateOption={updateOption}
            />
          ))}
        </div>
      </main>

      {/* 다음 단계 확인 모달 */}
      {pendingIdx !== null && (
        <ConfirmNextStepModal onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
      )}
    </div>
  );
};

/** 다음 단계 이동 확인 모달 컴포넌트 */
const ConfirmNextStepModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center gap-6 w-[360px] border border-slate-100">
      <p className="text-lg font-black text-slate-800 text-center leading-snug">
        다음 단계로 넘어가겠습니까?
      </p>
      <p className="text-xs text-slate-400 text-center -mt-2">
        선택한 디자인으로 편집 페이지로 이동합니다.
      </p>
      <div className="flex gap-3 w-full">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
        >
          아니요
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 py-3 rounded-2xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 shadow-lg transition-all"
        >
          네
        </button>
      </div>
    </div>
  </div>
);

export default App;
