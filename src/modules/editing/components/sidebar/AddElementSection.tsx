import { useRef } from 'react';
import SidebarBlock from './SidebarBlock';
import SidebarMiniButton from './SidebarMiniButton';

interface AddElementSectionProps {
  expanded: boolean;
  newElementLabel: string;
  onNewElementLabelChange: (value: string) => void;
  onAddTextElement: (label: string) => void;
  onAddImageElement: (file: File, label: string) => void;
}

export default function AddElementSection({
  expanded,
  newElementLabel,
  onNewElementLabelChange,
  onAddTextElement,
  onAddImageElement,
}: AddElementSectionProps) {
  const addImageInputRef = useRef<HTMLInputElement>(null);

  return (
    <SidebarBlock title="요소 추가">
      <div className={`sidebar-add-grid ${expanded ? 'sidebar-add-grid--expanded' : ''}`}>
        {expanded ? (
          <input
            className="sidebar__input sidebar__input--compact"
            placeholder="요소 이름"
            value={newElementLabel}
            onChange={(event) => onNewElementLabelChange(event.target.value)}
          />
        ) : null}
        <SidebarMiniButton onClick={() => onAddTextElement(newElementLabel.trim())}>텍스트 추가</SidebarMiniButton>
        <SidebarMiniButton onClick={() => addImageInputRef.current?.click()}>상품 사진 추가</SidebarMiniButton>
        <input
          ref={addImageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            onAddImageElement(file, newElementLabel.trim());
            event.currentTarget.value = '';
          }}
        />
      </div>
    </SidebarBlock>
  );
}
