import VisibilityToggle from '../ui/VisibilityToggle';
import type { InitExtraInfo } from '../../../types';

interface Props {
  extraInfo: InitExtraInfo;
  updateExtraInfo: <K extends keyof InitExtraInfo>(key: K, value: InitExtraInfo[K]) => void;
}

const ExtraInfoSection = ({ extraInfo, updateExtraInfo }: Props) => {
  const upd = <K extends keyof InitExtraInfo>(key: K) => (val: InitExtraInfo[K]) => updateExtraInfo(key, val);

  return (
    <section className="space-y-3">
      <label className="text-xs font-bold text-slate-400 uppercase block">추가 정보</label>

      <Row label="주차 공간 수" visible={extraInfo.showParkingSpaces} onToggle={upd('showParkingSpaces')}>
        <input
          type="text"
          value={extraInfo.parkingSpaces}
          onChange={(e) => updateExtraInfo('parkingSpaces', e.target.value)}
          placeholder="예: 10대"
          className={`${inputCls} min-w-0 flex-1`}
        />
      </Row>

      <Row label="연락처" visible={extraInfo.showPhone} onToggle={upd('showPhone')}>
        <input
          placeholder="연락처"
          value={extraInfo.phone}
          onChange={(e) => updateExtraInfo('phone', e.target.value)}
          className={`${inputCls} min-w-0 flex-1`}
        />
      </Row>

      <Row label="주소" visible={extraInfo.showAddress} onToggle={upd('showAddress')}>
        <input
          placeholder="주소"
          value={extraInfo.address}
          onChange={(e) => updateExtraInfo('address', e.target.value)}
          className={`${inputCls} min-w-0 flex-1`}
        />
      </Row>

      <CheckRow
        id="petFriendly" label="애견 동반 가능 여부"
        checked={extraInfo.petFriendly}
        onCheck={(v) => updateExtraInfo('petFriendly', v)}
        visible={extraInfo.showPetFriendly}
        onToggle={upd('showPetFriendly')}
      />
      <CheckRow
        id="isNoKids" label="노키즈존"
        checked={extraInfo.isNoKids}
        onCheck={(v) => updateExtraInfo('isNoKids', v)}
        visible={extraInfo.showIsNoKids}
        onToggle={upd('showIsNoKids')}
      />
      <CheckRow
        id="hasSmokingArea" label="흡연 구역 존재 여부"
        checked={extraInfo.hasSmokingArea}
        onCheck={(v) => updateExtraInfo('hasSmokingArea', v)}
        visible={extraInfo.showSmokingArea}
        onToggle={upd('showSmokingArea')}
      />
      <CheckRow
        id="hasElevator" label="엘레베이터"
        checked={extraInfo.hasElevator}
        onCheck={(v) => updateExtraInfo('hasElevator', v)}
        visible={extraInfo.showHasElevator}
        onToggle={upd('showHasElevator')}
      />
    </section>
  );
};

const Row = ({ label, visible, onToggle, children }: { label: string; visible: boolean; onToggle: (v: boolean) => void; children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-500 shrink-0 w-[4.5rem]">{label}</span>
    <div className="flex items-center gap-1.5 flex-1 min-w-0">{children}</div>
    <VisibilityToggle visible={visible} onToggle={() => onToggle(!visible)} />
  </div>
);

const CheckRow = ({ id, label, checked, onCheck, visible, onToggle }: {
  id: string; label: string; checked: boolean;
  onCheck: (v: boolean) => void; visible: boolean; onToggle: (v: boolean) => void;
}) => (
  <div className="flex items-center gap-2">
    <input
      type="checkbox" id={id} checked={checked}
      onChange={(e) => onCheck(e.target.checked)}
      className="w-4 h-4 accent-blue-500 cursor-pointer shrink-0"
    />
    <label htmlFor={id} className="text-xs text-slate-600 cursor-pointer flex-1 min-w-0 truncate">{label}</label>
    <VisibilityToggle visible={visible} onToggle={() => onToggle(!visible)} />
  </div>
);

const inputCls = 'p-2 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500';

export default ExtraInfoSection;
