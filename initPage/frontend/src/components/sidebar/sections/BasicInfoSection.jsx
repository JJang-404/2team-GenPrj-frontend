/**
 * 구역 2 – 기본 정보
 *   brandColor: 가게 이름 글자색 (드래프트 미리보기에 반영)
 *   * 표시 → 필수 입력
 *   * 없음  → AI 자동 생성
 */
const BasicInfoSection = ({ basicInfo, updateBasicInfo, brandColor, onBrandColorChange }) => (
  <section className="space-y-3">
    <label className="text-xs font-bold text-slate-400 uppercase block">기본 정보</label>

    <InfoField label="가게 이름" required>
      <div className="flex items-center gap-2">
        <input
          placeholder="가게 이름을 입력하세요"
          value={basicInfo.storeName}
          onChange={(e) => updateBasicInfo('storeName', e.target.value)}
          className={`${inputCls} flex-1`}
        />
        {/* 가게 이름 글자색 변경 */}
        <input
          type="color"
          value={brandColor}
          onChange={(e) => onBrandColorChange(e.target.value)}
          className="w-8 h-8 rounded border-none bg-transparent cursor-pointer shrink-0"
          title="가게 이름 색상"
        />
      </div>
    </InfoField>

    <InfoField label="업종" required>
      <input
        placeholder="업종을 입력하세요"
        value={basicInfo.industry}
        onChange={(e) => updateBasicInfo('industry', e.target.value)}
        className={inputCls}
      />
    </InfoField>

    <InfoField label="가게 소개 문구">
      <textarea
        placeholder="소개 문구 (미입력 시 AI 생성)"
        rows={2}
        value={basicInfo.storeDesc}
        onChange={(e) => updateBasicInfo('storeDesc', e.target.value)}
        className={`${inputCls} resize-none`}
      />
    </InfoField>
  </section>
);

/** 라벨 + 입력 필드 공통 래퍼 */
const InfoField = ({ label, required = false, children }) => (
  <div className="space-y-1">
    <span className="text-[10px] font-bold text-slate-500">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </span>
    {children}
  </div>
);

const inputCls =
  'w-full p-2.5 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all';

export default BasicInfoSection;