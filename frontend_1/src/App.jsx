import React, { useState } from 'react';
import { 
  Zap, Star, Upload, ChevronRight, X, Sparkles, Clock, Check, ChevronLeft, Edit3, Plus, Trash2, Wand2, Layers, Palette, FileText, AlignLeft, MessageSquare, Sparkle, RotateCcw
} from 'lucide-react';

const App = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingSlogan, setIsGeneratingSlogan] = useState(false); // 슬로건 생성 로딩 상태
  
  // 1. 초기 제품 리스트 (완전히 비워진 상태)
  const [products, setProducts] = useState([
    { id: Date.now(), name: '', price: '', description: '', image: null, isAiGen: false, showPrice: true, showDesc: true, showName: true }
  ]);

  const [options, setOptions] = useState({
    ratio: '4:5', sampleCount: 4, concept: 'vivid', brandColor: '#FF4757',
  });
  
  const [inputData, setInputData] = useState({ 
    storeName: '', 
    mainSlogan: '', // 전체 광고 문구
    details: '' 
  });

  // --- [OpenAI 기준] 슬로건 생성: 가게명 + 첫번째 제품명 + 컨셉 조합 ---
  const generateAiSlogan = () => {
    if (!inputData.storeName && products[0].name === '') {
      alert("가게 이름이나 제품명을 먼저 입력해야 적절한 문구가 생성됩니다.");
      return;
    }
    setIsGeneratingSlogan(true);
    setTimeout(() => {
      const store = inputData.storeName || "우리 가게";
      const product = products[0].name || "인기 메뉴";
      const mockSlogans = [
        `${store}에서 만나는 ${product}의 진수`,
        `오늘 같은 날, ${store}의 ${product} 어떠세요?`,
        `${product}의 특별한 변신, 오직 ${store}에서만`,
        `${options.concept.toUpperCase()}한 감성으로 담아낸 ${product}`
      ];
      const randomSlogan = mockSlogans[Math.floor(Math.random() * mockSlogans.length)];
      setInputData(prev => ({ ...prev, mainSlogan: randomSlogan }));
      setIsGeneratingSlogan(false);
    }, 1200);
  };

  const addProduct = () => {
    setProducts([...products, { id: Date.now() + 1, name: '', price: '', description: '', image: null, isAiGen: false, showPrice: true, showDesc: true, showName: true }]);
  };

  const removeProduct = (id) => {
    if (products.length > 1) setProducts(products.filter(p => p.id !== id));
  };

  const updateProduct = (id, field, value) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleProductImage = (id, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProducts(products.map(p => p.id === id ? { ...p, image: reader.result, isAiGen: false } : p));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- [핵심] 모든 제품 통합 렌더링 + 불필요한 박스 자동 숨김 로직 ---
  const renderAllProductsInOneDraft = (sampleIdx) => {
    // 유효한 데이터(이미지, 이름, AI생성 중 하나라도 해당)가 있는 제품만 필터링
    const activeProducts = products.filter(p => p.image || p.name || p.isAiGen);

    return (
      <div className="flex-1 relative w-full h-full min-h-0">
        {activeProducts.map((product, pIdx) => {
          const zIndex = 10 - pIdx;
          const layouts = [
            { top: pIdx === 0 ? '15%' : `${20 + pIdx * 25}%`, left: pIdx === 0 ? '15%' : `${50 - pIdx * 10}%`, size: pIdx === 0 ? 'w-[70%]' : 'w-[45%]', rot: pIdx % 2 === 0 ? 'rotate-3' : '-rotate-6' },
            { top: `${10 + pIdx * 25}%`, left: pIdx % 2 === 0 ? '5%' : '40%', size: 'w-[55%]', rot: pIdx % 2 === 0 ? '-rotate-3' : 'rotate-6' },
            { top: `${5 + pIdx * 20}%`, left: '22.5%', size: 'w-[55%]', rot: 'rotate-0' },
            { top: `${20 + pIdx * 10}%`, left: `${10 + pIdx * 15}%`, size: 'w-[60%]', rot: `${pIdx * 5}deg` }
          ];
          const pos = layouts[sampleIdx % 4];

          return (
            <div key={product.id} className={`absolute transition-all duration-500 ${pos.size}`} style={{ top: pos.top, left: pos.left, zIndex, transform: `rotate(${pos.rot})` }}>
              {/* 이미지 영역 */}
              {product.image ? (
                <img src={product.image} className="w-full h-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)]" alt=""/>
              ) : product.isAiGen ? (
                <div className="w-full aspect-square bg-white/10 backdrop-blur-md rounded-[2.5rem] border border-white/20 flex flex-col items-center justify-center">
                  <Wand2 size={24} className="opacity-40 animate-pulse" />
                  <p className="text-[8px] font-bold opacity-40 mt-1 uppercase text-center">{product.name || 'Auto Gen'}</p>
                </div>
              ) : null}
              
              {/* [수정] 텍스트 박스: 실제로 보여줄 내용이 있고 스위치가 켜져있을 때만 렌더링 */}
              {((product.showName && product.name) || (product.showPrice && product.price)) && (
                <div className="mt-2 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg inline-block animate-in fade-in duration-300">
                  {product.showName && product.name && <p className="text-[10px] font-black leading-none">{product.name}</p>}
                  {product.showPrice && product.price && <p className="text-[9px] font-bold text-yellow-400 mt-1">{product.price}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const conceptStyles = {
    premium: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
    retro: "bg-[#FDF6E3] border border-[#EAE0C9]",
    modern: "bg-white border border-slate-100",
    vivid: "bg-gradient-to-tr from-[#FF4757] to-[#FF6B81]",
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      
      {/* --- 사이드바 (900px 확장형) --- */}
      <aside className={`transition-all duration-500 bg-white border-r border-slate-200 flex flex-col shadow-2xl z-30 shrink-0 ${isExpanded ? 'w-[900px]' : 'w-[420px]'}`}>
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <h1 className="text-xl font-bold italic flex items-center gap-2"><Zap className="text-yellow-400 fill-yellow-400" size={20} /> AD-GEN <span className="text-blue-400">PRO</span></h1>
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-2 text-xs transition-all">{isExpanded ? <><ChevronLeft size={16}/> 축소</> : <><Edit3 size={16}/> 상세 확장</>}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* 1. 디자인 컨셉 & 컬러 */}
          <section className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Sparkles size={14}/> 디자인 컨셉</label>
            <div className="grid grid-cols-4 gap-2">
              {['premium', 'retro', 'modern', 'vivid'].map(c => (
                <button key={c} onClick={() => setOptions({...options, concept: c})} className={`py-3 text-[10px] font-bold rounded-xl border-2 capitalize transition-all ${options.concept === c ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>{c}</button>
              ))}
            </div>
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border">
               <input type="color" value={options.brandColor} onChange={(e) => setOptions({...options, brandColor: e.target.value})} className="w-10 h-8 rounded border-none bg-transparent cursor-pointer"/>
               <span className="text-xs font-mono font-bold text-slate-400">컬러: {options.brandColor}</span>
               <input type="range" min="1" max="6" value={options.sampleCount} onChange={(e) => setOptions({...options, sampleCount: parseInt(e.target.value)})} className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
            </div>
          </section>

          {/* 2. 광고 텍스트 정보 */}
          <section className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><FileText size={14}/> 광고 정보</label>
            <input placeholder="가게 이름을 입력하세요" className="w-full p-3 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={inputData.storeName} onChange={(e) => setInputData({...inputData, storeName: e.target.value})}/>
            
            <div className="relative group">
              <input placeholder="전체 광고 문구 (미입력 시 AI 생성)" className="w-full p-3 pr-24 bg-blue-50/30 border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={inputData.mainSlogan} onChange={(e) => setInputData({...inputData, mainSlogan: e.target.value})}/>
              <button onClick={generateAiSlogan} disabled={isGeneratingSlogan} className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-blue-700 disabled:bg-slate-300 transition-all">
                {isGeneratingSlogan ? <RotateCcw size={12} className="animate-spin"/> : <Sparkle size={12}/>} AI 문구
              </button>
            </div>
            <textarea placeholder="AI 상세 지시사항 (이미지 구도나 분위기)" rows="2" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" value={inputData.details} onChange={(e) => setInputData({...inputData, details: e.target.value})} />
          </section>

          {/* 3. [확장 모드] 제품 리스트 상세 */}
          {isExpanded && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center border-b pb-2">
                <label className="text-xs font-bold text-blue-600 uppercase flex items-center gap-2"><Plus size={14}/> 상세 제품 리스트</label>
                <button onClick={addProduct} className="text-[10px] bg-blue-600 text-white px-4 py-1.5 rounded-full font-black shadow-lg">제품 추가 +</button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {products.map((product, idx) => (
                  <div key={product.id} className="p-5 border border-slate-100 rounded-[2rem] bg-slate-50/50 space-y-4 relative group hover:bg-white hover:shadow-xl transition-all">
                    <div className="absolute -top-3 left-6 bg-slate-900 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-md">ITEM {idx + 1}</div>
                    <div className="aspect-video bg-white border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden relative">
                      {product.image ? ( <img src={product.image} className="w-full h-full object-contain p-3" alt=""/> ) : (
                        <label className="flex h-full flex-col items-center justify-center cursor-pointer hover:bg-blue-50 text-slate-400">
                          <Upload size={20}/><span className="mt-2 text-[9px] font-bold uppercase text-center text-slate-500">이미지 업로드<br/>(비워둘 시 AI생성)</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleProductImage(product.id, e)}/>
                        </label>
                      )}
                      {product.image && <button onClick={() => updateProduct(product.id, 'image', null)} className="absolute top-2 right-2 bg-white shadow rounded-full p-1.5 hover:text-red-500 transition-all"><X size={14}/></button>}
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input placeholder="제품명" className="flex-1 p-2.5 bg-white border rounded-xl text-sm" value={product.name} onChange={(e) => updateProduct(product.id, 'name', e.target.value)}/>
                        <input placeholder="가격" className="w-24 p-2.5 bg-white border rounded-xl text-sm" value={product.price} onChange={(e) => updateProduct(product.id, 'price', e.target.value)}/>
                      </div>
                      <textarea placeholder="제품 설명" className="w-full p-2.5 bg-white border rounded-xl text-[12px] min-h-[60px] resize-none" value={product.description} onChange={(e) => updateProduct(product.id, 'description', e.target.value)} />
                      <div className="flex flex-wrap gap-1 items-center text-[9px] font-black">
                         <button onClick={() => updateProduct(product.id, 'showName', !product.showName)} className={`px-2 py-1 rounded border transition-all ${product.showName ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-300'}`}>이름 {product.showName ? 'ON' : 'OFF'}</button>
                         <button onClick={() => updateProduct(product.id, 'showPrice', !product.showPrice)} className={`px-2 py-1 rounded border transition-all ${product.showPrice ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-300'}`}>가격 {product.showPrice ? 'ON' : 'OFF'}</button>
                         <button onClick={() => updateProduct(product.id, 'showDesc', !product.showDesc)} className={`px-2 py-1 rounded border transition-all ${product.showDesc ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-300'}`}>설명 {product.showDesc ? 'ON' : 'OFF'}</button>
                         {products.length > 1 && <button onClick={() => removeProduct(product.id)} className="ml-auto text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t shrink-0">
          <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-sm">Generate AI Drafts</button>
        </div>
      </aside>

      {/* --- 우측 프리뷰 영역: 실시간 반영 --- */}
      <main className="flex-1 overflow-y-auto p-12 bg-slate-100/50 transition-all duration-500">
        <header className="flex justify-between items-end mb-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Draft Preview</h2>
          <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-xl border border-slate-200">
             {['1:1', '4:5', '9:16'].map(r => <button key={r} onClick={() => setOptions({...options, ratio: r})} className={`px-5 py-2 text-xs font-black rounded-xl ${options.ratio === r ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{r}</button>)}
          </div>
        </header>

        <div className={`grid gap-12 ${options.sampleCount <= 4 ? 'grid-cols-2' : 'grid-cols-3'} max-w-[1200px] mx-auto pb-20`}>
          {Array.from({ length: options.sampleCount }).map((_, idx) => (
            <div key={idx} className="group relative">
              <div className={`rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] transition-all duration-700 border-4 border-transparent group-hover:border-blue-500/30 relative ${options.ratio === '1:1' ? 'aspect-square' : options.ratio === '4:5' ? 'aspect-[4/5]' : 'aspect-[9/16]'} ${conceptStyles[options.concept]}`}>
                <div className="w-full h-full flex flex-col p-10 relative z-10 text-white">
                   {/* 1. 상단 광고 슬로건 (입력값이 있을 때만 표시) */}
                   <div className="text-center mb-4 min-h-[30px]">
                      {inputData.mainSlogan && (
                        <p className="text-[12px] font-black tracking-[0.2em] uppercase drop-shadow-md bg-black/20 py-1 rounded animate-in fade-in duration-300 px-3">
                          {inputData.mainSlogan}
                        </p>
                      )}
                   </div>

                   {/* 2. 다중 제품 통합 렌더링 (Item 1, 2, 3이 모여서 렌더링됨) */}
                   {renderAllProductsInOneDraft(idx)}

                   {/* 3. 하단 가게명 (브랜드 포인트 컬러 적용) */}
                   <div className="mt-6 text-center border-t border-white/10 pt-6 min-h-[40px]">
                      <h3 className="text-2xl font-black italic tracking-widest uppercase transition-all" style={{ color: options.brandColor }}>
                         {inputData.storeName || ''}
                      </h3>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;