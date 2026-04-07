import { Upload, X, RotateCcw, Trash2 } from 'lucide-react';
import VisibilityToggle from './ui/VisibilityToggle';
import { CURRENCIES } from '../../constants/design';
import type { InitProduct } from '../../types';

interface Props {
  p: InitProduct;
  isRemovingBg: boolean;
  isFirstRun: boolean;
  canRemove: boolean;
  onUpdate: <K extends keyof InitProduct>(id: number, field: K, value: InitProduct[K]) => void;
  onRemove: (id: number) => void;
  onImageChange: (id: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBg: (id: number, imageSrc: string | null) => void;
}

const ProductCard = ({ p, isRemovingBg, isFirstRun, canRemove, onUpdate, onRemove, onImageChange, onRemoveBg }: Props) => (
  <div className="space-y-3 mb-4">
    <div className="aspect-video bg-slate-50 rounded-2xl overflow-hidden relative">
      {p.image ? (
        <>
          <img src={p.image} className="w-full h-full object-contain p-2" alt={p.name || ''} />
          <button
            type="button"
            onClick={() => onUpdate(p.id, 'image', null)}
            className="absolute top-2 right-2 bg-white shadow rounded-full p-1.5 hover:text-red-500"
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <label className="flex h-full flex-col items-center justify-center cursor-pointer hover:bg-blue-50 text-slate-300">
          <Upload size={20} />
          <span className="text-[10px] mt-1">이미지 업로드</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => onImageChange(p.id, e)} />
        </label>
      )}
    </div>

    <FieldRow visible={p.showName} onToggle={() => onUpdate(p.id, 'showName', !p.showName)}>
      <input placeholder="이름" value={p.name} onChange={(e) => onUpdate(p.id, 'name', e.target.value)} className={`${fieldCls} flex-1`} />
    </FieldRow>

    <FieldRow visible={p.showPrice} onToggle={() => onUpdate(p.id, 'showPrice', !p.showPrice)}>
      <input
        placeholder="금액" type="number" value={p.price}
        onChange={(e) => onUpdate(p.id, 'price', e.target.value)}
        className={`${fieldCls} flex-1 min-w-0`}
      />
      <select
        value={p.currency}
        onChange={(e) => onUpdate(p.id, 'currency', e.target.value)}
        className="p-2 bg-slate-50 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
      >
        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </FieldRow>

    <FieldRow visible={p.showDesc} onToggle={() => onUpdate(p.id, 'showDesc', !p.showDesc)}>
      <textarea
        placeholder="소개 문구" rows={2} value={p.description}
        onChange={(e) => onUpdate(p.id, 'description', e.target.value)}
        className={`${fieldCls} flex-1 resize-none`}
      />
    </FieldRow>

    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onRemoveBg(p.id, p.image)}
          disabled={!p.image || isRemovingBg}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isRemovingBg
            ? <><RotateCcw size={12} className="animate-spin" /><span>제거 중...</span></>
            : <><span>✂</span><span>배경 제거</span></>}
        </button>
        {canRemove && (
          <button type="button" onClick={() => onRemove(p.id)} className="ml-auto text-red-300 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {isFirstRun && p.image && (
        <p className="text-[10px] text-amber-500 leading-tight">⚠ 최초 실행 시 AI 모델(~40 MB)을 다운로드합니다.</p>
      )}
      {isRemovingBg && (
        <p className="text-[10px] text-indigo-400 leading-tight animate-pulse">AI가 배경을 분석 중입니다...</p>
      )}
    </div>
  </div>
);

const FieldRow = ({ visible, onToggle, children }: { visible: boolean; onToggle: () => void; children: React.ReactNode }) => (
  <div className="flex items-center gap-1.5">
    {children}
    <VisibilityToggle visible={visible} onToggle={onToggle} />
  </div>
);

const fieldCls = 'p-2 bg-slate-50 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500';

export default ProductCard;
