import { useState } from 'react';
import type { BackgroundMode, EditorElement, SidebarRecommendation } from '../types/editor';
import AdInfoSection from './sidebar/AdInfoSection';
import AddElementSection from './sidebar/AddElementSection';
import AdditionalInfoSection from './sidebar/AdditionalInfoSection';
import BackgroundOptionsSection from './sidebar/BackgroundOptionsSection';
import { ImageInfoPanel, TextInfoPanel } from './sidebar/ElementInfoPanels';
import RecommendationsSection from './sidebar/RecommendationsSection';

interface SidebarProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  selectedElement: EditorElement | null;
  infoItems: Array<{ label: string; visible: boolean }>;
  storeName: string;
  mainSlogan: string;
  promptHint: string;
  backgroundMode: BackgroundMode;
  recommendations: SidebarRecommendation[];
  onPromptHintChange: (value: string) => void;
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
  onReplaceSelectedImage: (file: File) => void;
  onRemoveSelectedImageBackground: () => void;
}

export default function Sidebar({
  expanded,
  onToggleExpanded,
  selectedElement,
  infoItems,
  storeName,
  mainSlogan,
  promptHint,
  backgroundMode,
  recommendations,
  onPromptHintChange,
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
  onReplaceSelectedImage,
  onRemoveSelectedImageBackground,
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
          onPromptHintChange={onPromptHintChange}
          onBackgroundModeChange={onBackgroundModeChange}
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

        {selectedElement?.kind === 'text' ? (
          <TextInfoPanel
            selectedElement={selectedElement}
            onChangeElement={onChangeElement}
          />
        ) : null}

        {selectedElement?.kind === 'image' ? (
          <ImageInfoPanel
            selectedElement={selectedElement}
            onChangeElement={onChangeElement}
            onReplaceSelectedImage={onReplaceSelectedImage}
            onRemoveSelectedImageBackground={onRemoveSelectedImageBackground}
          />
        ) : null}

        {expanded ? <RecommendationsSection recommendations={recommendations} /> : null}

      </div>
    </aside>
  );
}
