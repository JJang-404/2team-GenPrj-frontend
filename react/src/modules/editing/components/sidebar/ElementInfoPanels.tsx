import { useRef } from 'react';
import type { EditorElement } from '../../types/editor';
import SidebarBlock from './SidebarBlock';
import SidebarMiniButton from './SidebarMiniButton';

interface TextInfoPanelProps {
  selectedElement: EditorElement;
  onChangeElement: (id: string, patch: Partial<EditorElement>) => void;
}

export function TextInfoPanel({ selectedElement, onChangeElement }: TextInfoPanelProps) {
  return (
    <SidebarBlock title="텍스트 정보">
      <div className="sidebar-edit-row">
        <span>투명도</span>
        <input
          type="range"
          min="0.2"
          max="1"
          step="0.05"
          value={selectedElement.opacity ?? 1}
          onChange={(event) => onChangeElement(selectedElement.id, { opacity: Number(event.target.value) })}
        />
        <SidebarMiniButton onClick={() => onChangeElement(selectedElement.id, { hidden: true })}>제거</SidebarMiniButton>
      </div>
      <div className="sidebar-edit-grid">
        <span>정렬</span>
        <div className="sidebar-segment">
          <SidebarMiniButton onClick={() => onChangeElement(selectedElement.id, { align: 'left' })}>왼쪽</SidebarMiniButton>
          <SidebarMiniButton onClick={() => onChangeElement(selectedElement.id, { align: 'center' })}>가운데</SidebarMiniButton>
          <SidebarMiniButton onClick={() => onChangeElement(selectedElement.id, { align: 'right' })}>오른쪽</SidebarMiniButton>
        </div>
      </div>
      <label className="sidebar-form-row">
        <span>색상</span>
        <input
          type="color"
          value={selectedElement.color ?? '#ffffff'}
          onChange={(event) => onChangeElement(selectedElement.id, { color: event.target.value })}
        />
      </label>
      <label className="sidebar-form-row">
        <span>텍스트 내용</span>
        <textarea
          className="sidebar__textarea sidebar__textarea--compact"
          value={selectedElement.text ?? ''}
          onChange={(event) => onChangeElement(selectedElement.id, { text: event.target.value })}
        />
      </label>
    </SidebarBlock>
  );
}

interface ImageInfoPanelProps {
  selectedElement: EditorElement;
  onChangeElement: (id: string, patch: Partial<EditorElement>) => void;
  onReplaceSelectedImage: (file: File) => void;
  onRemoveSelectedImageBackground: () => void;
}

export function ImageInfoPanel({
  selectedElement,
  onChangeElement,
  onReplaceSelectedImage,
  onRemoveSelectedImageBackground,
}: ImageInfoPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedCurrency = selectedElement.priceCurrency ?? '원';

  return (
    <SidebarBlock title="상품 사진 정보">
      <div className="sidebar-image-panel">
        <div className="sidebar-image-preview">
          {selectedElement.imageUrl ? <img src={selectedElement.imageUrl} alt={selectedElement.label} /> : <span>사진</span>}
        </div>
        <div className="sidebar-image-controls">
          <div className="sidebar-inline-actions">
            <SidebarMiniButton onClick={onRemoveSelectedImageBackground}>배경 제거</SidebarMiniButton>
            <SidebarMiniButton onClick={() => onChangeElement(selectedElement.id, { hidden: true })}>객체 제거</SidebarMiniButton>
          </div>
          <div className="sidebar-edit-row">
            <span>투명도</span>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={selectedElement.opacity ?? 1}
              onChange={(event) => onChangeElement(selectedElement.id, { opacity: Number(event.target.value) })}
            />
          </div>
          <label className="sidebar-form-row">
            <span>이름</span>
            <input
              className="sidebar__input"
              value={selectedElement.productName ?? ''}
              onChange={(event) => onChangeElement(selectedElement.id, { productName: event.target.value })}
            />
          </label>
          <div className="field-grid">
            <label>
              <span>금액</span>
              <input
                className="sidebar__input"
                value={selectedElement.productPrice ?? ''}
                onChange={(event) => onChangeElement(selectedElement.id, { productPrice: event.target.value })}
              />
            </label>
            <label>
              <span>통화</span>
              <select
                className="sidebar__select"
                value={selectedCurrency}
                onChange={(event) =>
                  onChangeElement(selectedElement.id, {
                    priceCurrency: event.target.value === '$' ? '$' : '원',
                  })
                }
              >
                <option value="원">원</option>
                <option value="$">$</option>
              </select>
            </label>
          </div>
          <label className="sidebar-form-row">
            <span>소개문구</span>
            <textarea
              className="sidebar__textarea sidebar__textarea--compact"
              value={selectedElement.productDescription ?? ''}
              onChange={(event) => onChangeElement(selectedElement.id, { productDescription: event.target.value })}
            />
          </label>
          <SidebarMiniButton className="sidebar-mini-btn--wide" onClick={() => inputRef.current?.click()}>
            사진 수정
          </SidebarMiniButton>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onReplaceSelectedImage(file);
              event.currentTarget.value = '';
            }}
          />
        </div>
      </div>
    </SidebarBlock>
  );
}
