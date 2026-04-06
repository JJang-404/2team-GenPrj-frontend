import React, { useState, useEffect } from 'react';
import { 
  Zap, Star, Upload, ChevronRight, X, Sparkles, Clock, Check, ChevronLeft, Edit3, Plus, Trash2, Wand2, Layers, Palette, FileText, AlignLeft, MessageSquare, Sparkle, RotateCcw
} from 'lucide-react';

// [폰트 설정] ZEN-SERIF 폰트를 프론트엔드에서 로드합니다.
const fontStyles = `
  @font-face {
    font-family: 'ZenSerif';
    src: url('/fonts/ZEN-SERIF-TTF-Regular.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  .font-zen { font-family: 'ZenSerif', serif; }
`;

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

  const handleSelectDesign = (idx) => setSelectedDesigns([idx]);

  const handleRemoveBackground = async (id, imageSrc) => {
    if (!imageSrc) return;
    setIsRemovingBg(prev => ({ ...prev, [id]: true }));
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('file', blob);
      const res = await fetch('http://localhost:8000/remove-bg', { method: 'POST', body: formData });
      const resultBlob = await res.blob();
      const resultUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(resultBlob);
      });
      setProducts(products.map(p => p.id === id ? { ...p, image: resultUrl } : p));
    } catch (error) {
      alert("배경 제거 실패. server.py 서버를 확인하세요.");
    } finally {
      setIsRemovingBg(prev => ({ ...prev, [id]: false }));
    }
  };

  const generateAiSlogan = () => {
    setIsGeneratingSlogan(true);
    setTimeout(() => {
      setInputData(prev => ({ ...prev, mainSlogan: "품격 있는 일상의 완성" }));
      setIsGeneratingSlogan(false);
    }, 800);
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
    const activeProducts = products.filter(p => p.image); // 이미지가 있는 제품만 필터링
    const productCount = activeProducts.length;
    const firstP = activeProducts[0] || {};
    
    // 비율 및 스케일링 설정
    const isTall = options.ratio === '9:16';
    const isSquare = options.ratio === '1:1';
    const isFiveFour = options.ratio === '4:5';

    const containerPadding = isTall ? "p-10" : isSquare ? "p-4" : "p-6";
    const spaceY = isTall ? "space-y-8" : isSquare ? "space-y-2" : "space-y-4";
    const titleSize = isTall ? "text-5xl" : isSquare ? "text-3xl" : "text-4xl";
    
    
    // [이미지 프레임] 비율별 잘림 방지 로직 적용
    const ImageFrame = ({ className = "", isFull = false }) => {
      if (productCount === 0) return null;

      // 레이아웃 클래스 결정
      let gridClass = "flex flex-row flex-wrap justify-center items-center gap-2";
      if (productCount <= 3) gridClass = "flex flex-row justify-center items-center gap-4 w-full";
      else if (productCount === 4) gridClass = "grid grid-cols-2 gap-3 w-full";
      else if (productCount >= 6) gridClass = "grid grid-cols-3 gap-2 w-full";

      // 비율별 컨테이너 높이 제한 (이미지 잘림 방지 핵심)
      const containerHeight = isSquare ? "max-h-[45%]" : isFiveFour ? "max-h-[55%]" : "max-h-none";


      return (
        <div className={`${gridClass} ${containerHeight} overflow-hidden z-0 ${className} ${isFull ? 'w-full h-full' : 'w-full'}`}>
          {activeProducts.map((p, pIdx) => {
            let itemWidth = "max-w-full";
            if (productCount === 5) itemWidth = pIdx < 2 ? "w-[45%]" : "w-[30%]";
            
            // 비율에 따른 개별 이미지 크기 강제 축소 (1:1, 4:5 대응)
            const scaleFactor = (isSquare || isFiveFour) ? 'scale-[0.85]' : 'scale-100';

            return (
              <div key={p.id} className={`flex items-center justify-center ${scaleFactor}`}>
                <img 
                  src={p.image} 
                  className={`${itemWidth} max-h-full object-contain drop-shadow-2xl transition-all`}
                  style={{ 
                    animationDelay: `${pIdx * 0.1}s`,
                    // 역동적 구도(2번)일 때 개별 이미지 회전
                    transform: styleIdx === 1 ? `rotate(${pIdx % 2 === 0 ? '-5deg' : '5deg'}) translateY(${pIdx % 2 === 0 ? '-10px' : '10px'})` : (isFull ? 'scale(1.15)' : 'none')
                  }} 
                  alt=""
                />
              </div>
            );
          })}
        </div>
      );
    };

    // [개별 선택 로직] 제품 정보 박스 (내용이 있을 때만 박스 생성)
    const ProductInfo = ({ p }) => {
      const hasVisibleContent = (p.showName && p.name) || (p.showPrice && p.price) || (p.showDesc && p.description);
      if (!hasVisibleContent) return null;

      return (
        <div className={`bg-black/50 backdrop-blur-md ${isSquare ? 'p-2 rounded-lg' : 'p-4 rounded-2xl'} text-white z-20 shadow-xl border border-white/10`}>
          {p.showName && p.name && <p className={`${isSquare ? 'text-[10px]' : 'text-[14px]'} font-black font-zen`}>{p.name}</p>}
          {p.showPrice && p.price && <p className={`${isSquare ? 'text-[9px]' : 'text-[13px]'} text-yellow-400 font-bold mt-0.5`}>{p.price}</p>}
          {p.showDesc && p.description && <p className={`${isSquare ? 'text-[10px]' : 'text-[14px]'} font-zen opacity-90 mt-1 leading-tight border-t border-white/20 pt-1`}>{p.description}</p>}
        </div>
      );
    };

    // [최상단 배치] 가게 이름 컴포넌트
    const StoreTitle = ({ className = "" }) => (
      <h3 className={`font-black uppercase tracking-tighter italic font-zen z-30 ${className}`} style={{ color: options.brandColor }}>
        {inputData.storeName || '가게 이름을 입력하세요'}
      </h3>
    );

    const SloganText = ({ className = "" }) => (
      inputData.mainSlogan ? <p className={`text-white/80 font-bold tracking-[0.2em] font-zen uppercase z-30 ${className}`}>{inputData.mainSlogan}</p> : null
    );

    // --- 구도별 렌더링 ---

    // 1. 클래식 (표준 광고 레이아웃)
    if (styleIdx === 0) return (
      <div className={`w-full h-full flex flex-col ${containerPadding} items-center justify-start bg-white/5`}>
        <div className="w-full text-center border-b border-white/10 pb-6 mb-4 z-30">
          <StoreTitle className={`${titleSize} mb-2`} />
          <SloganText className={isSquare ? "text-[10px]" : "text-sm"} />
        </div>
        <ImageFrame className="flex-1 w-full flex items-center justify-center py-4"/>
        <div className={`w-full flex ${isSquare ? 'gap-2' : 'gap-4'} flex-wrap justify-center z-30 pt-4`}>
          {activeProducts.map(p => <ProductInfo key={p.id} p={p} />)}
        </div>
      </div>
    );


    // 2. 역동적 구도
    if (styleIdx === 1) return (
      <div className={`w-full h-full flex flex-col ${containerPadding} relative overflow-hidden bg-white/5`}>
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none"></div>
        <div className="absolute -top-[20%] -right-[10%] w-[75%] h-[140%] bg-white/5 rotate-15 pointer-events-none"></div>
        <div className={`absolute ${isSquare ? 'top-6 left-6' : 'top-12 left-12'} z-30`}>
          <StoreTitle className={`${isSquare ? 'text-4xl' : isTall ? 'text-7xl' : 'text-6xl'} -rotate-3 drop-shadow-2xl`} />
          <SloganText className={`mt-2 ml-2 ${isSquare ? 'text-xs' : 'text-xl'} opacity-60`} />
        </div>
        <div className="flex-1 flex items-center justify-center mt-20">
          <ImageFrame className="w-[98%] h-[75%] scale-110" />
        </div>
        <div className={`absolute bottom-8 right-8 flex flex-col gap-3 items-end z-30`}>
          {activeProducts.slice(0, 3).map(p => <ProductInfo key={p.id} p={p} />)}
        </div>
      </div>
    );

    // 3. 중앙 집중 구도 (텍스트 세로 회전 배치)
    if (styleIdx === 2) return (
      <div className={`w-full h-full flex flex-col ${containerPadding} items-center justify-center relative bg-black/5`}>
        {/* 제품명 (좌측 사이드 - 불투명도 높여 가독성 개선) */}
        {firstP.showName && firstP.name && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 origin-center z-30 whitespace-nowrap">
            <p className={`${isSquare ? 'text-xl' : 'text-4xl'} font-black font-zen text-white/70 uppercase tracking-widest drop-shadow-lg`}>{firstP.name}</p>
          </div>
        )}

        {/* 가격 (우측 사이드 - 시계방향 180도 회전: rotate-90) */}
        {firstP.showPrice && firstP.price && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 origin-center z-30 whitespace-nowrap">
            <p className={`${isSquare ? 'text-lg' : 'text-3xl'} font-bold font-zen text-yellow-400/80 tracking-tighter drop-shadow-lg`}>{firstP.price}</p>
          </div>
        )}

        <div className={`flex-1 w-full flex items-center justify-center z-10`}>
          <ImageFrame forceRotate={-5} className="scale-110" />
        </div>

        {/* 제품 설명 (이미지 하단 배치) */}
        {firstP.showDesc && firstP.description && (
          <div className="w-full text-center px-8 z-30 mt-2">
            <p className={`${isSquare ? 'text-[9px]' : 'text-xs'} font-zen text-white/80 leading-relaxed`}>{firstP.description}</p>
          </div>
        )}

        {/* 가게 이름 (하단 중앙 - 비율별 크기 조정으로 짤림 방지) */}
        <div className="text-center w-full mt-3 z-30 px-6 overflow-hidden">
          <StoreTitle className={isSquare ? "text-2xl" : isFiveFour ? "text-4xl" : "text-6xl"} />
          <SloganText className="text-[10px] tracking-[0.5em] opacity-40 mt-1" />
        </div>
      </div>
    );

    // 4. 풀 이머시브 구도 (캔버스 전체 화면)
    return (
      <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-80 scale-115 p-4">
          <ImageFrame isFull={true} />
        </div>
        <div className="z-30 text-center px-6">
          <StoreTitle className={`${isSquare ? 'text-5xl' : isTall ? 'text-8xl' : 'text-7xl'} drop-shadow-[0_10px_60px_rgba(0,0,0,1)] mb-4`} />
          <SloganText className={`${isSquare ? 'text-sm' : 'text-lg'} bg-black/70 px-8 py-3 rounded-full backdrop-blur-2xl inline-block border border-white/20 shadow-2xl`} />
        </div>
        <div className={`absolute ${isSquare ? 'bottom-6 right-6' : 'bottom-12 right-12'} flex flex-col gap-2 items-end z-30`}>
          {activeProducts.slice(0, 2).map(p => <ProductInfo key={p.id} p={p} />)}
        </div>
      </div>
    );
  };

  const conceptStyles = {
    premium: "bg-slate-900 text-white",
    retro: "bg-[#FDF6E3] border border-[#EAE0C9]",
    modern: "bg-white border border-slate-100",
    vivid: "bg-gradient-to-tr from-[#FF4757] to-[#FF6B81] text-white",
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      <style>{fontStyles}</style>
      
      <aside className={`transition-all duration-500 bg-white border-r border-slate-200 flex flex-col shadow-2xl z-30 shrink-0 ${isExpanded ? 'w-[900px]' : 'w-[420px]'}`}>
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h1 className="text-base font-bold flex items-center gap-2 font-zen"><Zap className="text-blue-500 fill-blue-500" size={16} /> AD-GEN PRO</h1>
          <button onClick={() => setIsExpanded(!isExpanded)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all">{isExpanded ? "축소" : "상세 확장"}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* 디자인 컨셉 */}
          <section className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Sparkles size={14}/> 디자인 컨셉</label>
            <div className="grid grid-cols-4 gap-2">
              {['premium', 'retro', 'modern', 'vivid'].map(c => (
                <button key={c} onClick={() => setOptions({...options, concept: c})} className={`py-3 text-[10px] font-bold rounded-xl border-2 capitalize transition-all ${options.concept === c ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>{c}</button>
              ))}
            </div>
            <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-xl border-none">
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

          {/* 광고 정보 */}
          <section className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><FileText size={14}/> 광고 정보</label>
            <input placeholder="가게 이름을 입력하세요" className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={inputData.storeName} onChange={(e) => setInputData({...inputData, storeName: e.target.value})}/>
            <div className="relative group">
              <input placeholder="슬로건 (미입력 시 AI 생성)" className="w-full p-3 pr-24 bg-blue-50/30 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={inputData.mainSlogan} onChange={(e) => setInputData({...inputData, mainSlogan: e.target.value})}/>
              <button onClick={generateAiSlogan} className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold">AI 생성</button>
            </div>
          </section>

          {/* 제품 리스트 (박스 디자인 최소화 및 입력창 복구) */}
          <section className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Plus size={14}/> 제품 리스트</label>
              <button onClick={addProduct} className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-full font-black">+ 추가</button>
            </div>
            <div className={`grid ${isExpanded ? 'grid-cols-2 gap-6' : 'grid-cols-1 gap-4'}`}>
            {products.map((p, idx) => (
              <div key={p.id} className="p-0 space-y-3 mb-4">
                <div className="aspect-video bg-slate-50 border-none rounded-2xl overflow-hidden relative">
                  {p.image ? <img src={p.image} className="w-full h-full object-contain p-2" alt=""/> : 
                  <label className="flex h-full flex-col items-center justify-center cursor-pointer hover:bg-blue-50 text-slate-300"><Upload size={20}/><input type="file" className="hidden" accept="image/*" onChange={(e) => handleProductImage(p.id, e)}/></label>
                  }
                  {p.image && <button onClick={() => updateProduct(p.id, 'image', null)} className="absolute top-2 right-2 bg-white shadow rounded-full p-1.5 hover:text-red-500"><X size={14}/></button>}
                </div>
                
                <div className="space-y-2 px-1">
      {/* 사진이 없을 때만 기본 입력창 노출, 사진이 있으면 활성화된 버튼에 따라 노출 */}
      {(!p.image || p.showName || p.showPrice || p.showDesc) && (
        <div className="space-y-2">
          {(p.showName || (!p.image && !p.name)) && (
            <div className="flex gap-2">
              <input placeholder="제품명" className="flex-1 p-2 bg-slate-50 border-none rounded-lg text-sm outline-none" value={p.name} onChange={(e) => updateProduct(p.id, 'name', e.target.value)}/>
              {(p.showPrice || !p.image) && <input placeholder="가격" className="w-24 p-2 bg-slate-50 border-none rounded-lg text-sm outline-none" value={p.price} onChange={(e) => updateProduct(p.id, 'price', e.target.value)}/>}
            </div>
          )}
          {(p.showDesc || (!p.image && !p.description)) && (
            <textarea placeholder="제품 상세 설명" rows="2" className="w-full p-2 bg-slate-50 border-none rounded-lg text-xs outline-none resize-none" value={p.description} onChange={(e) => updateProduct(p.id, 'description', e.target.value)} />
          )}
        </div>
      )}
      
      <div className="flex flex-wrap gap-1.5 items-center">
                      {['Name', 'Price', 'Desc'].map(type => (
                        <button key={type} onClick={() => updateProduct(p.id, `show${type}`, !p[`show${type}`])} className={`px-2 py-1 rounded text-[9px] font-black border-none ${p[`show${type}`] ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{type}</button>
                      ))}
                      <button onClick={() => handleRemoveBackground(p.id, p.image)} disabled={!p.image || isRemovingBg[p.id]} className="px-2 py-1 rounded text-[9px] font-black bg-indigo-50 text-indigo-600">
                        {isRemovingBg[p.id] ? <RotateCcw size={10} className="animate-spin"/> : "배경 제거"}
                      </button>
                      {products.length > 1 && <button onClick={() => removeProduct(p.id)} className="ml-auto text-red-300 hover:text-red-500"><Trash2 size={14}/></button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 bg-slate-100/50">
        <header className="flex justify-between items-end mb-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase font-zen">Draft Preview</h2>
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
                  ${isSelected ? 'border-blue-500 scale-105 shadow-blue-500/20' : 'border-transparent group-hover:border-blue-500/30'}
                  ${options.ratio === '1:1' ? 'aspect-square' : options.ratio === '4:5' ? 'aspect-[4/5]' : 'aspect-[9/16]'}
                  ${conceptStyles[options.concept]}`}>
                  <div className="w-full h-full relative z-10">{renderLayeredDraft(idx)}</div>
                </div>
                <button onClick={() => handleSelectDesign(idx)} className={`mt-4 w-full py-3 rounded-2xl text-xs font-black transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-400'}`}>
                  {isSelected ? ' 디자인편집' : '이 디자인 선택'}
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