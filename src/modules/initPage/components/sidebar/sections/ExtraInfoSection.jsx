import VisibilityToggle from '../ui/VisibilityToggle';

/**
 * 구역 3 – 추가 정보
 *   홍보에 도움이 될 정보; 각 항목별 표시 여부를 원숭이 버튼으로 조절
 */
const ExtraInfoSection = ({ extraInfo, updateExtraInfo }) => {
  const upd = (key) => (val) => updateExtraInfo(key, val);

  return (
    <section className="space-y-3">
      <label className="text-xs font-bold text-slate-400 uppercase block">추가 정보</label>

      {/* 주차장 공간 수 */}
      <Row label="주차장 공간 수" visible={extraInfo.showParkingCount} onToggle={upd('showParkingCount')}>
        <input
          type="number"
          value={extraInfo.parkingCount}
          onChange={(e) => updateExtraInfo('parkingCount', parseInt(e.target.value) || 0)}
          placeholder="0"
          className={numCls}
        />
        <span className="text-[10px] text-slate-400 shrink-0">기본 0</span>
      </Row>

      {/* 연락처 */}
      <Row label="연락처" visible={extraInfo.showPhone} onToggle={upd('showPhone')}>
        <input
          placeholder="연락처"
          value={extraInfo.phone}
          onChange={(e) => updateExtraInfo('phone', e.target.value)}
          className={`${inputCls} min-w-0 flex-1`}
        />
      </Row>

      {/* 주소 */}
      <Row label="주소" visible={extraInfo.showAddress} onToggle={upd('showAddress')}>
        <input
          placeholder="주소"
          value={extraInfo.address}
          onChange={(e) => updateExtraInfo('address', e.target.value)}
          className={`${inputCls} min-w-0 flex-1`}
        />
      </Row>

      {/* 노키즈존 */}
      <CheckRow
        id="isNoKids"
        label="노키즈존"
        checked={extraInfo.isNoKids}
        onCheck={(v) => updateExtraInfo('isNoKids', v)}
        visible={extraInfo.showIsNoKids}
        onToggle={upd('showIsNoKids')}
      />

      {/* 흡연 구역 존재 여부 */}
      <CheckRow
        id="hasSmokingArea"
        label="흡연 구역 존재 여부"
        checked={extraInfo.hasSmokingArea}
        onCheck={(v) => updateExtraInfo('hasSmokingArea', v)}
        visible={extraInfo.showSmokingArea}
        onToggle={upd('showSmokingArea')}
      />

      {/* 엘레베이터 여부 */}
      <CheckRow
        id="hasElevator"
        label="엘레베이터"
        checked={extraInfo.hasElevator}
        onCheck={(v) => updateExtraInfo('hasElevator', v)}
        visible={extraInfo.showHasElevator}
        onToggle={upd('showHasElevator')}
      />
    </section>
  );
};

/** 레이블 + children + 표시 토글 한 행 */
const Row = ({ label, visible, onToggle, children }) => (
  <div className="flex items-center gap-2">
    {label && (
      <span className="text-xs text-slate-500 shrink-0 w-[4.5rem]">{label}</span>
    )}
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      {children}
    </div>
    <VisibilityToggle visible={visible} onToggle={() => onToggle(!visible)} />
  </div>
);

/** 체크박스 행 */
const CheckRow = ({ id, label, checked, onCheck, visible, onToggle }) => (
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheck(e.target.checked)}
      className="w-4 h-4 accent-blue-500 cursor-pointer shrink-0"
    />
    <label htmlFor={id} className="text-xs text-slate-600 cursor-pointer flex-1 min-w-0 truncate">
      {label}
    </label>
    <VisibilityToggle visible={visible} onToggle={() => onToggle(!visible)} />
  </div>
);

const inputCls = 'p-2 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500';
const numCls   = 'w-20 p-2 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shrink-0';

export default ExtraInfoSection;
