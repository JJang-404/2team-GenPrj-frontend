import React, { useState } from 'react';
import { 
  Maximize2, RotateCcw, FileText, Palette, LayoutGrid, Layers,
  Zap, Star, Upload, ChevronRight, X, Sparkles, Clock, Check
} from 'lucide-react';

const App = () => {
  const [options, setOptions] = useState({
    ratio: '1:1', sampleCount: 4, concept: 'vivid', brandColor: '#FF4757',
    showPrice: true, 
    showBusinessHours: false, // 영업시간 노출 여부 상태
    showDetails: true
  });
  
  const [inputData, setInputData] = useState({ 
    storeName: '', 
    price: '', 
    businessHours: '', // 영업시간 데이터 상태
    details: '' 
  });
  
  const [imagePreviews, setImagePreviews] = useState([]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews].slice(0, 3));
  };

  const removeImage = (index) => {
    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const getDraftLayout = (concept, images, sampleIndex) => {
    const imgCount = images.length;
    if (imgCount === 0) {
      return (
        <div className="flex-1 flex items-center justify-center opacity-20">
          <Layers size={64} className="text-slate-400" />
        </div>
      );
    }

    const baseImgStyle = "object-cover rounded-lg shadow-md transition-transform group-hover:scale-105 duration-500";
    const dropShadowStyle = "drop-shadow-[0_10px_30px_rgba(0,0,0,0.3)]";

    if (imgCount === 1) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <img src={images[0]} alt="Product" className={`max-w-[85%] max-h-[85%] ${baseImgStyle} ${dropShadowStyle}`} />
        </div>
      );
    }

    if (imgCount === 2) {
      if (sampleIndex % 2 === 0) {
        return (
          <div className="flex-1 grid grid-cols-5 gap-4 items-center p-4 min-h-0 relative">
            <img src={images[0]} alt="P1" className={`col-span-3 aspect-[3/4] ${baseImgStyle} ${dropShadowStyle}`} />
            <img src={images[1]} alt="P2" className={`col-span-2 aspect-square self-end ${baseImgStyle} ${dropShadowStyle}`} />
          </div>
        );
      } else {
        return (
          <div className="flex-1 flex flex-col gap-2 p-4 relative min-h-0">
            <img src={images[0]} alt="P1" className={`w-[70%] aspect-square self-start z-10 ${baseImgStyle} ${dropShadowStyle}`} />
            <img src={images[1]} alt="P2" className={`w-[70%] aspect-square self-end -mt-16 z-0 opacity-80 ${baseImgStyle}`} />
          </div>
        );
      }
    }

    if (imgCount === 3) {
      if (sampleIndex % 3 === 0) {
        return (
          <div className="flex-1 flex flex-col gap-4 p-4 min-h-0 relative">
            <img src={images[0]} alt="Main" className={`w-full aspect-[4/3] ${baseImgStyle} ${dropShadowStyle}`} />
            <div className="grid grid-cols-2 gap-4">
              <img src={images[1]} alt="Sub 1" className={`aspect-square ${baseImgStyle} ${dropShadowStyle}`} />
              <img src={images[2]} alt="Sub 2" className={`aspect-square scale-90 self-center ${baseImgStyle} ${dropShadowStyle}`} />
            </div>
          </div>
        );
      } else if (sampleIndex % 3 === 1) {
        return (
          <div className="flex-1 flex items-center justify-center p-2 relative min-h-0">
            <img src={images[0]} alt="P1" className={`absolute w-[50%] aspect-square top-8 left-8 z-20 ${baseImgStyle} ${dropShadowStyle}`} />
            <img src={images[1]} alt="P2" className={`absolute w-[45%] aspect-square top-24 right-8 z-10 opacity-90 ${baseImgStyle} ${dropShadowStyle}`} />
            <img src={images[2]} alt="P3" className={`absolute w-[40%] aspect-square bottom-8 left-20 z-0 opacity-70 ${baseImgStyle}`} />
          </div>
        );
      } else {
        return (
          <div className="flex-1 flex items-center justify-center p-4 relative min-h-0 text-white">
            <img src={images[0]} alt="P1" className={`absolute w-[70%] aspect-[3/4] z-10 ${baseImgStyle} ${dropShadowStyle}`} />
            <img src={images[1]} alt="P2" className={`absolute w-[50%] aspect-square -left-4 top-16 z-0 rotate-[-10deg] opacity-60 ${baseImgStyle}`} />
            <img src={images[2]} alt="P3" className={`absolute w-[50%] aspect-square -right-4 bottom-16 z-0 rotate-[10deg] opacity-60 ${baseImgStyle}`} />
          </div>
        );
      }
    }
  };

  const samples = Array.from({ length: options.sampleCount }, (_, i) => i + 1);
  const conceptStyles = {
    premium: "bg-gradient-to-br from-slate-950 via-slate-800 to-slate-950 text-white",
    retro: "bg-[#FDF6E3] border border-[#EAE0C9] text-[#5F4B32]",
    modern: "bg-white border border-slate-100 text-slate-900",
    vivid: "bg-gradient-to-tr from-[#FF4757] to-[#FF6B81] text-white",
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      <aside className="w-[420px] bg-white border-r border-slate-200 flex flex-col shadow-2xl z-20 overflow-hidden text-white">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2 italic">
            <Zap className="text-yellow-400 fill-yellow-400" size={20} /> AD-GEN <span className="text-blue-400">PRO</span>
          </h1>
          <button className="p-2 hover:bg-slate-800 rounded-full transition-colors"><RotateCcw size={18} className="text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar text-white">
          <section className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Sparkles size={14}/> 컨셉 및 시안 개수</label>
            <div className="grid grid-cols-4 gap-2">
              {['premium', 'retro', 'modern', 'vivid'].map(c => (
                <button key={c} onClick={() => setOptions({...options, concept: c})}
                  className={`py-2 text-[10px] font-bold rounded-lg border-2 capitalize transition-all ${options.concept === c ? 'border-blue-600 bg-blue-50 text-blue-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500"><span>시안 개수 (X)</span><span>{options.sampleCount}개</span></div>
              <input type="range" min="1" max="6" value={options.sampleCount} onChange={(e) => setOptions({...options, sampleCount: parseInt(e.target.value)})} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
            </div>
          </section>

          <section className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Upload size={14}/> 상품 이미지 (최대 3장)</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors cursor-pointer relative">
              <input type="file" multiple accept="image/*" id="img-upload" className="hidden" onChange={handleFileChange} />
              <label htmlFor="img-upload" className="flex flex-col items-center justify-center gap-1 min-h-[60px] cursor-pointer">
                <Upload className="text-slate-400 mb-1" size={20} />
                <span className="text-[10px] text-slate-500 mt-1 font-medium text-white">클릭하여 이미지 업로드</span>
              </label>
            </div>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-100">
                    <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-white/70 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={10} className="text-slate-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><FileText size={14}/> 정보 입력 및 노출 설정</label>
            
            {/* 가게 이름 */}
            <input placeholder="가게 이름 (필수)" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900" 
              onChange={(e) => setInputData({...inputData, storeName: e.target.value})}/>
            
            {/* 가격 정보 + 토글 */}
            <div className="flex items-center gap-2">
              <input placeholder="가격 정보" className="flex-1 p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900" 
                onChange={(e) => setInputData({...inputData, price: e.target.value})}/>
              <button onClick={() => setOptions({...options, showPrice: !options.showPrice})} 
                className={`p-2.5 rounded-lg border transition-colors ${options.showPrice ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-300 border-slate-100'}`}>
                <Check size={16} />
              </button>
            </div>

            {/* 영업 시간 + 토글 (추가된 부분) */}
            <div className="flex items-center gap-2">
              <input placeholder="영업 시간 (예: 10:00 - 22:00)" className="flex-1 p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900" 
                onChange={(e) => setInputData({...inputData, businessHours: e.target.value})}/>
              <button onClick={() => setOptions({...options, showBusinessHours: !options.showBusinessHours})} 
                className={`p-2.5 rounded-lg border transition-colors ${options.showBusinessHours ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-300 border-slate-100'}`}>
                <Clock size={16} />
              </button>
            </div>

            <div className="space-y-2">
               <textarea placeholder="AI 세부 지시사항 (예: '수박을 메인으로 강조해줘')" rows="3" 
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900" 
                onChange={(e) => setInputData({...inputData, details: e.target.value})} />
            </div>
          </section>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
             Generate Drafts <ChevronRight size={18}/>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 bg-slate-100/30 custom-scrollbar">
        <header className="flex justify-between items-center mb-10 text-white">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Generated Templates</h2>
            <p className="text-sm text-slate-500 mt-1">업로드된 이미지: <span className="font-bold text-blue-600">{imagePreviews.length}장</span></p>
          </div>
          <div className="flex gap-2">
             {['1:1', '4:5', '9:16'].map(r => (
               <button key={r} onClick={() => setOptions({...options, ratio: r})} className={`px-4 py-1.5 text-xs font-bold rounded-full border ${options.ratio === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 shadow-sm'}`}>{r}</button>
             ))}
          </div>
        </header>

        <div className={`grid gap-10 ${options.sampleCount <= 4 ? 'grid-cols-2' : 'grid-cols-3'} max-w-[1200px] mx-auto`}>
          {samples.map((s, index) => (
            <div key={s} className="group cursor-pointer">
              <div className={`rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 border-4 border-transparent group-hover:border-blue-500/30 relative
                ${options.ratio === '1:1' ? 'aspect-square' : options.ratio === '4:5' ? 'aspect-[4/5]' : 'aspect-[9/16]'}
                ${conceptStyles[options.concept]}
              `}>
                <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none bg-black/20 text-white"></div>
                <div className="w-full h-full flex flex-col p-8 relative min-h-0 z-10 text-white">
                  <div className="flex justify-between items-center mb-4 text-white">
                    <span className="text-[10px] font-black uppercase opacity-60 tracking-tighter">Draft 0{s}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 border border-white/10 uppercase tracking-widest">{options.concept}</span>
                  </div>
                  
                  {getDraftLayout(options.concept, imagePreviews, index)}
                  
                  <div className={`mt-6 space-y-2 ${options.concept === 'premium' ? 'text-center items-center' : 'text-left'}`}>
                    <h3 className={`font-black tracking-tight truncate
                      ${options.concept === 'vivid' ? 'text-4xl' : 'text-3xl'}
                    `} style={{color: options.concept === 'premium' ? '#fff' : options.brandColor}}>
                      {inputData.storeName || '가게 이름'}
                    </h3>
                    
                    <div className={`flex flex-col gap-1 ${options.concept === 'premium' ? 'items-center' : 'items-start'}`}>
                      {options.showPrice && inputData.price && (
                        <p className={`font-bold ${options.concept === 'vivid' ? 'text-2xl' : 'text-xl'}`}>{inputData.price}</p>
                      )}
                      {/* 시안에 영업시간 표시 (추가된 부분) */}
                      {options.showBusinessHours && inputData.businessHours && (
                        <p className="text-xs opacity-70 flex items-center gap-1 font-medium italic">
                          <Clock size={12}/> {inputData.businessHours}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 backdrop-blur-sm">
                  <button className="px-6 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 hover:bg-blue-700 transition-colors">
                    <LayoutGrid size={14} /> 상세 편집하기
                  </button>
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