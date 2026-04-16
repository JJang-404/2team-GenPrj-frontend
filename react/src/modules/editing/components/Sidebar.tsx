import { useState } from 'react';
import type { BackgroundMode, EditorElement, SidebarRecommendation } from '../types/editor';
import AdInfoSection from './sidebar/AdInfoSection';
import AddElementSection from './sidebar/AddElementSection';
import AdditionalInfoSection from './sidebar/AdditionalInfoSection';
import BackgroundOptionsSection from './sidebar/BackgroundOptionsSection';
import { ImageInfoPanel, TextInfoPanel } from './sidebar/ElementInfoPanels';
import RecommendationsSection from './sidebar/RecommendationsSection';

interface BackgroundColorDraft {
  solid: [string];
  gradient: [string, string];
  pastel: [string, string];
}

interface SidebarProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  templateId?: string | null;
  selectedElement: EditorElement | null;
  selectionCount?: number;
  infoItems: Array<{ label: string; visible: boolean }>;
  storeName: string;
  mainSlogan: string;
  promptHint: string;
  backgroundMode: BackgroundMode;
  backgroundColorDraft: BackgroundColorDraft;
  recommendations: SidebarRecommendation[];
  onPromptHintChange: (value: string) => void;
  onSolidColorChange: (color: string) => void;
  onGradientColorsChange: (colors: [string, string]) => void;
  onMultiColorsChange: (colors: [string, string]) => void;
  onStoreNameChange: (value: string) => void;
  onMainSloganChange: (value: string) => void;
  onGenerateSlogan: () => void;
  onToggleInfoItem: (label: string) => void;
  onAddTextElement: (label: string) => void;
  onAddImageElement: (file: File, label: string) => void;
  onBackgroundModeChange: (mode: BackgroundMode) => void;
  onGenerateBackgrounds: () => void;
  onBackToInitialPage: () => void;
  onBackToBackgrounds: () => void;
  onChangeElement: (id: string, patch: Partial<EditorElement>) => void;
  onSendBackward: (id: string) => void;
  onBringForward: (id: string) => void;
  onReplaceSelectedImage: (file: File) => void;
  onRemoveSelectedImageBackground: () => void;
  onConvertToFrontalView?: () => void;
}

export default function Sidebar({
  expanded,
  onToggleExpanded,
  templateId,
  selectedElement,
  selectionCount = 0,
  infoItems,
  storeName,
  mainSlogan,
  promptHint,
  backgroundMode,
  backgroundColorDraft,
  recommendations,
  onPromptHintChange,
  onSolidColorChange,
  onGradientColorsChange,
  onMultiColorsChange,
  onStoreNameChange,
  onMainSloganChange,
  onGenerateSlogan,
  onToggleInfoItem,
  onAddTextElement,
  onAddImageElement,
  onBackgroundModeChange,
  onGenerateBackgrounds,
  onBackToInitialPage,
  onBackToBackgrounds,
  onChangeElement,
  onSendBackward,
  onBringForward,
  onReplaceSelectedImage,
  onRemoveSelectedImageBackground,
  onConvertToFrontalView,
}: SidebarProps) {
  const [newElementLabel, setNewElementLabel] = useState('');

  return (
    <aside className={`sidebar sidebar--structured ${expanded ? 'sidebar--expanded' : 'sidebar--collapsed'}`}>
      <div className="sidebar__topbar">
        <h1 className="sidebar__brand">AD-GEN <span>PRO</span></h1>
        <div className="sidebar__header-actions">
          <button className="sidebar__topbar-btn" onClick={onBackToInitialPage}>처음으로</button>
          <button className="sidebar__topbar-btn sidebar__topbar-btn--toggle" onClick={onToggleExpanded}>
            {expanded ? '<<' : '>>'}
          </button>
        </div>
      </div>

      <div className="sidebar__body">
        <AdInfoSection
          storeName={storeName}
          mainSlogan={mainSlogan}
          onStoreNameChange={onStoreNameChange}
          onMainSloganChange={onMainSloganChange}
          onGenerateSlogan={onGenerateSlogan}
        />

        <AdditionalInfoSection expanded={expanded} infoItems={infoItems} onToggleInfoItem={onToggleInfoItem} />

        <BackgroundOptionsSection
          expanded={expanded}
          promptHint={promptHint}
          backgroundMode={backgroundMode}
          solidColor={backgroundColorDraft.solid[0]}
          gradientColors={backgroundColorDraft.gradient}
          multiColors={backgroundColorDraft.pastel}
          onPromptHintChange={onPromptHintChange}
          onBackgroundModeChange={onBackgroundModeChange}
          onSolidColorChange={onSolidColorChange}
          onGradientColorsChange={onGradientColorsChange}
          onMultiColorsChange={onMultiColorsChange}
          onGenerateBackgrounds={onGenerateBackgrounds}
          onBackToBackgrounds={onBackToBackgrounds}
        />

        <AddElementSection
          expanded={expanded}
          newElementLabel={newElementLabel}
          onNewElementLabelChange={setNewElementLabel}
          onAddTextElement={onAddTextElement}
          onAddImageElement={onAddImageElement}
        />

        {selectionCount > 1 ? (
          <div className="sidebar-card">
            <h3 className="sidebar-card__title">다중 선택</h3>
            <div className="template-summary">
              <strong>{selectionCount}개 요소 선택됨</strong>
              <span>현재는 동시에 이동만 지원하고, 세부 속성 편집은 단일 선택에서만 지원합니다.</span>
            </div>
          </div>
        ) : null}

        {selectedElement?.kind === 'text' ? (
          <TextInfoPanel
            selectedElement={selectedElement}
            backgroundMode={backgroundMode}
            templateId={templateId}
            onChangeElement={onChangeElement}
            onSendBackward={onSendBackward}
            onBringForward={onBringForward}
          />
        ) : null}

        {selectedElement?.kind === 'image' ? (
          <ImageInfoPanel
            selectedElement={selectedElement}
            onChangeElement={onChangeElement}
            onReplaceSelectedImage={onReplaceSelectedImage}
            onRemoveSelectedImageBackground={onRemoveSelectedImageBackground}
            onSendBackward={onSendBackward}
            onBringForward={onBringForward}
            onConvertToFrontalView={onConvertToFrontalView}
          />
        ) : null}

        {expanded ? <RecommendationsSection recommendations={recommendations} /> : null}

      </div>
    </aside>
  );
}
