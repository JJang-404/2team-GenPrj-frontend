import type { BackgroundMode, SidebarRecommendation, TemplateDefinition } from './editor-core';

export interface BackgroundCandidate {
  id: string;
  name: string;
  mode: BackgroundMode;
  cssBackground: string;
  imageUrl?: string;
  colors?: string[];
  note: string;
  translatedPrompt: string;
  negativePrompt: string;
}

export interface BootstrapResponse {
  templates: TemplateDefinition[];
  sidebarRecommendations: SidebarRecommendation[];
}

export interface GenerateBackgroundRequest {
  templateId: string;
  backgroundMode: BackgroundMode;
  promptKo: string;
  guideImage?: string;
  guideSummary?: string;
}

export interface GenerateBackgroundResponse {
  translatedPrompt: string;
  negativePrompt: string;
  candidates: BackgroundCandidate[];
}

export interface RemoveBackgroundResponse {
  imageDataUrl: string;
  maskDataUrl: string;
  label: string;
  score: number | null;
}
