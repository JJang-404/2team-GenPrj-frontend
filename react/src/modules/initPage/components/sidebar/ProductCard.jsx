import { Upload, X, RotateCcw, Trash2 } from 'lucide-react';
import VisibilityToggle from './ui/VisibilityToggle';
import { CURRENCIES } from '../../constants/design';

/**
 * 상품 카드 (구역 4 한 세트)
 *
 * isFirstRun: true이면 배경 제거 최초 실행 경고 메시지를 표시합니다.
 *             (@imgly/background-removal 최초 실행 시 ~40 MB 모델 다운로드 발생)
 */
const ProductCard = ({
  p,
  isRemovingBg,
  isFirstRun,
  canRemove,
  onUpdate,
  onRemove,
  onImageChange,
  onRemoveBg,
}) => (
  <div className="space-y-3 mb-4">
    {/* 사진 업로드 */}
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

    {/* 이름 */}
    <FieldRow visible={p.showName} onToggle={() => onUpdate(p.id, 'showName', !p.showName)}>
      <input
        placeholder="이름"
        value={p.name}
        onChange={(e) => onUpdate(p.id, 'name', e.target.value)}
        className={`${fieldCls} flex-1`}
      />
    </FieldRow>

    {/* 금액 + 통화 */}
    <FieldRow visible={p.showPrice} onToggle={() => onUpdate(p.id, 'showPrice', !p.showPrice)}>
      <input
        placeholder="금액"
        type="number"
        value={p.price}
        onChange={(e) => onUpdate(p.id, 'price', e.target.value)}
        className={`${fieldCls} flex-1 min-w-0`}
      />
      <select
        value={p.currency}
        onChange={(e) => onUpdate(p.id, 'currency', e.target.value)}
        className="p-2 bg-slate-50 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </FieldRow>

    {/* 소개 문구 */}
    <FieldRow visible={p.showDesc} onToggle={() => onUpdate(p.id, 'showDesc', !p.showDesc)}>
      <textarea
        placeholder="소개 문구"
        rows={2}
        value={p.description}
        onChange={(e) => onUpdate(p.id, 'description', e.target.value)}
        className={`${fieldCls} flex-1 resize-none`}
      />
    </FieldRow>

    {/* 배경 제거 + 삭제 */}
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onRemoveBg(p.id, p.image)}
          disabled={!p.image || isRemovingBg}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="브라우저에서 AI로 배경을 자동 제거합니다 (서버 불필요)"
        >
          {isRemovingBg ? (
            <>
              <RotateCcw size={12} className="animate-spin" />
              <span>제거 중...</span>
            </>
          ) : (
            <>
              <span>✂</span>
              <span>배경 제거</span>
            </>
          )}
        </button>

        {canRemove && (
          <button type="button" onClick={() => onRemove(p.id)} className="ml-auto text-red-300 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* 최초 실행 안내 — 아직 한 번도 실행 전일 때만 */}
      {isFirstRun && p.image && (
        <p className="text-[10px] text-amber-500 leading-tight">
          ⚠ 최초 실행 시 AI 모델(~40 MB)을 다운로드합니다. 잠시 기다려 주세요.
        </p>
      )}

      {/* 처리 중 안내 */}
      {isRemovingBg && (
        <p className="text-[10px] text-indigo-400 leading-tight animate-pulse">
          AI가 배경을 분석 중입니다...
        </p>
      )}
    </div>
  </div>
);

/** 입력 필드 + 표시 토글 한 행 */
const FieldRow = ({ visible, onToggle, children }) => (
  <div className="flex items-center gap-1.5">
    {children}
    <VisibilityToggle visible={visible} onToggle={onToggle} />
  </div>
);

const fieldCls = 'p-2 bg-slate-50 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500';

export default ProductCard;
