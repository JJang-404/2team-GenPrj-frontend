import React, { useState } from 'react';
import { 
  Zap, Star, Upload, ChevronRight, X, Sparkles, Clock, Check, ChevronLeft, Edit3, Plus, Trash2, Wand2, Layers, Palette, FileText, AlignLeft, MessageSquare, Sparkle, RotateCcw
} from 'lucide-react';

const App = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingSlogan, setIsGeneratingSlogan] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState({});
  
  const [products, setProducts] = useState([
    { id: Date.now(), name: '', price: '', description: '', image: null, isAiGen: false, showPrice: true, showDesc: true, showName: true }
  ]);

  const [options, setOptions] = useState({
    ratio: '4:5', sampleCount: 4, concept: 'vivid', brandColor: '#FF4757',
  });
  const [selectedDesigns, setSelectedDesigns] = useState([]);

  const [inputData, setInputData] = useState({ 
    storeName: '', 
    mainSlogan: '', 
    details: '' 
  });

  const handleSelectDesign = (idx) => {
    setSelectedDesigns([idx]);
  };

  const handleRemoveBackground = async (id, imageSrc) => {
    if (!imageSrc) return;
    setIsRemovingBg(prev => ({ ...prev, [id]: true }));
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('file', blob);
      const res = await fetch('http://localhost:8000/remove-bg', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Failed');
      const resultBlob = await res.blob();
      const resultUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(resultBlob);
      });
      setProducts(products.map(p => p.id === id ? { ...p, image: resultUrl } : p));
    } catch (error) {
      alert("배경 제거 실패. server.py 실행을 확인하세요.");
    } finally {
      setIsRemovingBg(prev => ({ ...prev, [id]: false }));
    }
  };

  const generateAiSlogan = () => {
    if (!inputData.storeName && products[0].name === '') return;
    setIsGeneratingSlogan(true);
    setTimeout(() => {
      setInputData(prev => ({ ...prev, mainSlogan: "특별함을 더하는 오늘의 선택" }));
      setIsGeneratingSlogan(false);
    }, 1000);
  };

  const addProduct = () => setProducts([...products, { id: Date.now() + 1, name: '', price: '', description: '', image: null, isAiGen: false, showPrice: true, showDesc: true, showName: true }]);
  const removeProduct = (id) => products.length > 1 && setProducts(products.filter(p => p.id !== id));
  const updateProduct = (id, field, value) => setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  const handleProductImage = (id, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProducts(products.map(p => p.id === id ? { ...p, image: reader.result } : p));
      reader.readAsDataURL(file);
    }
  };

  const renderLayeredDraft = (idx) => {
    const styleIdx = idx % 4;
    const activeProducts = products.filter(p => p.image || p.name);
    
    const ImageFrame = ({ className = "" }) => (
      <div className={`flex flex-row gap-4 items-center justify-center ${className}`}>
        {activeProducts.map(p => (
          p.image ? (
            <img key={p.id} src={p.image} className="max-h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]" alt=""/>
          ) : (
            <div key={p.id} className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10"><Wand2 size={20} className="opacity-10"/></div>
          )
        ))}
      </div>
    );

    const ProductInfo = ({ p, className = "" }) => {
      const isVisible = (p.showName && p.name) || (p.showPrice && p.price) || (p.showDesc && p.description);
      if (!isVisible) return null;
      return (
        <div className={`bg-black/40 backdrop-blur-md p-3 rounded-xl text-white ${className}`}>
          {p.showName && p.name && <p className="text-[12px] font-black">{p.name}</p>}
          {p.showPrice && p.price && <p className="text-[11px] text-yellow-400 font-bold mt-0.5">{p.price}</p>}
          {p.showDesc && p.description && <p className="text-[10px] opacity-70 mt-1 leading-tight">{p.description}</p>}
        </div>
      );
    };

    const StoreTitle = ({ className = "" }) => (
      <h3 className={`font-black uppercase tracking-tighter italic ${className}`} style={{ color: options.brandColor }}>
        {inputData.storeName || '가게 이름을 입력하세요'}
      </h3>
    );

    // Style 1: 정갈한 중앙 배치
    if (styleIdx === 0) return (
      <div className="w-full h-full flex flex-col p-10 items-center text-center space-y-6">
        <div className="space-y-2">
          <StoreTitle className="text-3xl" />
          <p className="text-[14px] text-white/60 tracking-widest font-bold uppercase">{inputData.mainSlogan || 'Premium Draft'}</p>
        </div>
        <ImageFrame className="flex-1 w-full" />
        <div className="flex gap-2 flex-wrap justify-center">
          {activeProducts.slice(0, 3).map(p => <ProductInfo key={p.id} p={p} />)}
        </div>
      </div>
    );

    // Style 2: 상단 대각선 타이틀
    if (styleIdx === 1) return (
      <div className="w-full h-full flex flex-col p-12 relative overflow-hidden">
        <StoreTitle className="text-7xl -rotate-6 absolute -left-4 top-12 opacity-90 drop-shadow-2xl" />
        <ImageFrame className="mt-auto ml-auto w-[85%] h-[60%]" />
        <div className="absolute top-1/2 left-12 space-y-3">
          {activeProducts.slice(0, 2).map(p => <ProductInfo key={p.id} p={p} />)}
        </div>
      </div>
    );

    // Style 3: 역동적 기울기 (이미지 회전 강조)
    if (styleIdx === 2) return (
      <div className="w-full h-full flex flex-col p-10 items-center justify-between">
        <div className="w-full h-[65%] rotate-6 flex items-center justify-center">
          <ImageFrame className="h-full w-full" />
        </div>
        <div className="w-full text-center space-y-4">
          <StoreTitle className="text-5xl" />
          <div className="flex gap-3 justify-center">
            {activeProducts.slice(0, 3).map(p => <ProductInfo key={p.id} p={p} />)}
          </div>
        </div>
      </div>
    );

    // Style 4: 오버레이 중첩
    return (
      <div className="w-full h-full p-6 relative flex items-center justify-center">
        <ImageFrame className="w-full h-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <StoreTitle className="text-7xl text-center drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]" />
          {inputData.mainSlogan && <p className="text-white font-bold tracking-[0.3em] bg-black/40 px-4 py-1 mt-4 rounded-full backdrop-blur-sm">{inputData.mainSlogan}</p>}
        </div>
        <div className="absolute bottom-10 right-10 flex flex-col gap-2 items-end">
          {activeProducts.slice(0, 2).map(p => <ProductInfo key={p.id} p={p} />)}
        </div>
      </div>
    );
  };

  const conceptStyles = {
    premium: "bg-slate-950 text-white",
    retro: "bg-[#FDF6E3] border border-[#EAE0C9]",
    modern: "bg-white border border-slate-100",
    vivid: "bg-gradient-to-tr from-[#FF4757] to-[#FF6B81] text-white",
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      
      {/* --- 사이드바 --- */}
      <aside className={`transition-all duration-500 bg-white border-r border-slate-200 flex flex-col shadow-2xl z-30 shrink-0 ${isExpanded ? 'w-[900px]' : 'w-[420px]'}`}>
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h1 className="text-base font-bold flex items-center gap-2"><Zap className="text-blue-500 fill-blue-500" size={16} /> AD-GEN PRO</h1>
          <button onClick={() => setIsExpanded(!isExpanded)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all">{isExpanded ? "축소" : "상세 확장"}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <section className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Sparkles size={14}/> 디자인 컨셉</label>
            <div className="grid grid-cols-4 gap-2">
              {['premium', 'retro', 'modern', 'vivid'].map(c => (
                <button key={c} onClick={() => setOptions({...options, concept: c})} className={`py-3 text-[10px] font-bold rounded-xl border-2 capitalize transition-all ${options.concept === c ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>{c}</button>
              ))}
            </div>
            <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-xl border">
              <div className="flex items-center gap-4">
                <input type="color" value={options.brandColor} onChange={(e) => setOptions({...options, brandColor: e.target.value})} className="w-10 h-8 rounded border-none bg-transparent cursor-pointer"/>
                <span className="text-xs font-mono font-bold text-slate-400">컬러: {options.brandColor}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 shrink-0">프레임 수: {options.sampleCount}</span>
                <input type="range" min="1" max="6" value={options.sampleCount} onChange={(e) => setOptions({...options, sampleCount: parseInt(e.target.value)})} className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><FileText size={14}/> 광고 정보</label>
            <input placeholder="가게 이름을 입력하세요" className="w-full p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" value={inputData.storeName} onChange={(e) => setInputData({...inputData, storeName: e.target.value})}/>
            
            <div className="relative group">
              <input placeholder="광고 슬로건 (미입력 시 AI 생성)" className="w-full p-3 pr-24 bg-blue-50/30 border border-blue-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" value={inputData.mainSlogan} onChange={(e) => setInputData({...inputData, mainSlogan: e.target.value})}/>
              <button onClick={generateAiSlogan} className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold">AI 생성</button>
            </div>
            <textarea placeholder="AI 상세 지시사항" rows="2" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" value={inputData.details} onChange={(e) => setInputData({...inputData, details: e.target.value})} />
          </section>

          <section className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Plus size={14}/> 제품 리스트</label>
              <button onClick={addProduct} className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-full font-black">+ 추가</button>
            </div>
            <div className={`grid ${isExpanded ? 'grid-cols-2 gap-6' : 'grid-cols-1 gap-4'}`}>
              {products.map((p, idx) => (
                <div key={p.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-3 hover:bg-white hover:shadow-xl transition-all">
                  <div className="aspect-video bg-white border-2 border-dashed border-slate-200 rounded-xl overflow-hidden relative">
                    {p.image ? ( <img src={p.image} className="w-full h-full object-contain p-2" alt=""/> ) : (
                      <label className="flex h-full flex-col items-center justify-center cursor-pointer hover:bg-blue-50 text-slate-400"><Upload size={16}/><input type="file" className="hidden" accept="image/*" onChange={(e) => handleProductImage(p.id, e)}/></label>
                    )}
                    {p.image && <button onClick={() => updateProduct(p.id, 'image', null)} className="absolute top-2 right-2 bg-white shadow rounded-full p-1.5 hover:text-red-500"><X size={14}/></button>}
                  </div>
                  
                  {/* [복구] 제품 정보 텍스트 박스 */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input placeholder="제품명" className="flex-1 p-2 bg-white border rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-400" value={p.name} onChange={(e) => updateProduct(p.id, 'name', e.target.value)}/>
                      <input placeholder="가격" className="w-24 p-2 bg-white border rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-400" value={p.price} onChange={(e) => updateProduct(p.id, 'price', e.target.value)}/>
                    </div>
                    <textarea placeholder="제품 설명" rows="2" className="w-full p-2 bg-white border rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-400 resize-none" value={p.description} onChange={(e) => updateProduct(p.id, 'description', e.target.value)} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    <button onClick={() => updateProduct(p.id, 'showName', !p.showName)} className={`px-2 py-1 rounded text-[9px] font-black border ${p.showName ? 'bg-blue-600 text-white' : 'bg-white text-slate-300'}`}>이름 {p.showName ? 'ON' : 'OFF'}</button>
                    <button onClick={() => updateProduct(p.id, 'showPrice', !p.showPrice)} className={`px-2 py-1 rounded text-[9px] font-black border ${p.showPrice ? 'bg-blue-600 text-white' : 'bg-white text-slate-300'}`}>가격 {p.showPrice ? 'ON' : 'OFF'}</button>
                    <button onClick={() => updateProduct(p.id, 'showDesc', !p.showDesc)} className={`px-2 py-1 rounded text-[9px] font-black border ${p.showDesc ? 'bg-blue-600 text-white' : 'bg-white text-slate-300'}`}>설명 {p.showDesc ? 'ON' : 'OFF'}</button>
                    <button onClick={() => handleRemoveBackground(p.id, p.image)} disabled={!p.image || isRemovingBg[p.id]} className="px-2 py-1 rounded text-[9px] font-black border bg-indigo-50 text-indigo-600 border-indigo-200">
                      {isRemovingBg[p.id] ? <RotateCcw size={10} className="animate-spin"/> : "배경 제거"}
                    </button>
                    {products.length > 1 && <button onClick={() => removeProduct(p.id)} className="ml-auto text-red-400"><Trash2 size={14}/></button>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>

      {/* --- 프리뷰 --- */}
      <main className="flex-1 overflow-y-auto p-12 bg-slate-100/50">
        <header className="flex justify-between items-end mb-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Draft Preview</h2>
          <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-xl border border-slate-200">
             {['1:1', '4:5', '9:16'].map(r => <button key={r} onClick={() => setOptions({...options, ratio: r})} className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${options.ratio === r ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{r}</button>)}
          </div>
        </header>

        <div className={`grid gap-12 ${options.sampleCount <= 4 ? 'grid-cols-2' : 'grid-cols-3'} max-w-[1200px] mx-auto pb-20`}>
          {(() => {
            const allIndices = Array.from({ length: options.sampleCount }, (_, i) => i);
            const nonSelected = allIndices.filter(i => !selectedDesigns.includes(i));
            const orderedIndices = [...selectedDesigns, ...nonSelected];
            
            return orderedIndices.map((idx) => {
              const isSelected = selectedDesigns[0] === idx;
              return (
              <div key={idx} className="group relative transition-all duration-500">
                <div className={`rounded-[3.5rem] overflow-hidden shadow-2xl transition-all duration-700 border-4 relative
                  ${isSelected ? 'border-blue-500 scale-105' : 'border-transparent group-hover:border-blue-500/30'}
                  ${options.ratio === '1:1' ? 'aspect-square' : options.ratio === '4:5' ? 'aspect-[4/5]' : 'aspect-[9/16]'}
                  ${conceptStyles[options.concept]}`}>
                  <div className="w-full h-full relative z-10">
                    {renderLayeredDraft(idx)}
                  </div>
                </div>
                <button
                  onClick={() => handleSelectDesign(idx)}
                  className={`mt-3 w-full py-3 rounded-2xl text-xs font-black transition-all
                    ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-400'}`}
                >
                  {isSelected ? '디자인편집' : '이 디자인 선택'}
                </button>
              </div>
            )});
          })()}
        </div>
      </main>
    </div>
  );
};

export default App;