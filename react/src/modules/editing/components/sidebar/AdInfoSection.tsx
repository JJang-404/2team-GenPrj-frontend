import SidebarBlock from './SidebarBlock';
import SidebarMiniButton from './SidebarMiniButton';

interface AdInfoSectionProps {
  storeName: string;
  mainSlogan: string;
  onStoreNameChange: (value: string) => void;
  onMainSloganChange: (value: string) => void;
  onGenerateSlogan: () => void;
}

export default function AdInfoSection({
  storeName,
  mainSlogan,
  onStoreNameChange,
  onMainSloganChange,
  onGenerateSlogan,
}: AdInfoSectionProps) {
  return (
    <SidebarBlock title="광고 정보">
      <input
        className="sidebar__input sidebar__input--compact"
        placeholder="가게 이름을 입력하세요"
        value={storeName}
        onChange={(event) => onStoreNameChange(event.target.value)}
      />
      <div className="sidebar-inline-actions sidebar-inline-actions--prompt">
        <input
          className="sidebar__input sidebar__input--compact"
          value={mainSlogan}
          onChange={(event) => onMainSloganChange(event.target.value)}
          placeholder="최종 광고 문구"
        />
        <SidebarMiniButton onClick={onGenerateSlogan}>AI 문구</SidebarMiniButton>
      </div>
    </SidebarBlock>
  );
}
