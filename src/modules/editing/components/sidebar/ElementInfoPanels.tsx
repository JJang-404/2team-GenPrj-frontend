import { useRef } from 'react';
import type { EditorElement } from '../../types/editor';
import type { BackgroundMode } from '../../types/editor-core';
import SidebarBlock from './SidebarBlock';
import SidebarMiniButton from './SidebarMiniButton';
import { FONT_OPTIONS, getRecommendedFontFamily } from '../../utils/fontRecommendations';

interface TextInfoPanelProps {
  selectedElement: EditorElement;
  backgroundMode: BackgroundMode;
  templateId?: string | null;
  onChangeElement: (id: string, patch: Partial<EditorElement>) => void;
  onSendBackward: (id: string) => void;
  onBringForward: (id: string) => void;
}

export function TextInfoPanel({
  selectedElement,
  backgroundMode,
  templateId,
  onChangeElement,
  onSendBackward,
  onBringForward,
}: TextInfoPanelProps) {
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
      <div className="sidebar-inline-actions">
        <SidebarMiniButton onClick={() => onSendBackward(selectedElement.id)}>
          뒤로
        </SidebarMiniButton>
        <SidebarMiniButton onClick={() => onBringForward(selectedElement.id)}>
          앞으로
        </SidebarMiniButton>
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
      <div className="field-grid">
        <label>
          <span>글씨체</span>
          <select
            className="sidebar__select"
            value={selectedElement.fontFamily ?? FONT_OPTIONS[0].value}
            onChange={(event) => onChangeElement(selectedElement.id, { fontFamily: event.target.value })}
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span>추천</span>
          <SidebarMiniButton
            className="sidebar-mini-btn--wide"
            onClick={() =>
              onChangeElement(selectedElement.id, {
                fontFamily: getRecommendedFontFamily(selectedElement, backgroundMode, templateId),
              })
            }
          >
            추천 폰트 적용
          </SidebarMiniButton>
        </div>
      </div>
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
  onSendBackward: (id: string) => void;
  onBringForward: (id: string) => void;
  onConvertToFrontalView?: () => void;
}

export function ImageInfoPanel({
  selectedElement,
  onChangeElement,
  onReplaceSelectedImage,
  onRemoveSelectedImageBackground,
  onSendBackward,
  onBringForward,
  onConvertToFrontalView,
}: ImageInfoPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedCurrency = selectedElement.priceCurrency ?? '원';
  const hasPrice = Boolean(selectedElement.productPrice?.trim());

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
          <div className="sidebar-inline-actions">
            <SidebarMiniButton onClick={() => onSendBackward(selectedElement.id)}>
              뒤로
            </SidebarMiniButton>
            <SidebarMiniButton onClick={() => onBringForward(selectedElement.id)}>
              앞으로
            </SidebarMiniButton>
            {onConvertToFrontalView && (
              <SidebarMiniButton onClick={onConvertToFrontalView}>
                정면
              </SidebarMiniButton>
            )}
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
            {hasPrice && (
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
            )}
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
