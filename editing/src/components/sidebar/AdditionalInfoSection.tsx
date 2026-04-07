import { useMemo } from 'react';
import SidebarBlock from './SidebarBlock';
import SidebarMiniButton from './SidebarMiniButton';

interface AdditionalInfoSectionProps {
  expanded: boolean;
  infoItems: Array<{ label: string; visible: boolean }>;
  onToggleInfoItem: (label: string) => void;
}

export default function AdditionalInfoSection({
  expanded,
  infoItems,
  onToggleInfoItem,
}: AdditionalInfoSectionProps) {
  const visibleInfoCount = useMemo(() => infoItems.filter((item) => item.visible).length, [infoItems]);

  return (
    <SidebarBlock title="추가 정보">
      <div className={`sidebar-info-grid ${expanded ? 'sidebar-info-grid--expanded' : ''}`}>
        {infoItems.map(({ label, visible }) => (
          <div key={label} className="sidebar-info-item">
            <span>{label}</span>
            <SidebarMiniButton
              active={visible}
              onClick={() => onToggleInfoItem(label)}
              aria-label={`${label} ${visible ? '숨기기' : '표시하기'}`}
              title={visible ? '숨기기' : '표시하기'}
            >
              {visible ? '🙉' : '🙈'}
            </SidebarMiniButton>
          </div>
        ))}
      </div>
      {visibleInfoCount > 0 ? (
        <span className="sidebar__text">보이는 항목은 템플릿에 텍스트와 이미지 요소로 추가됩니다.</span>
      ) : null}
    </SidebarBlock>
  );
}
