export type EditorStep = 'home' | 'template' | 'background' | 'editor';

export type BackgroundMode = 'solid' | 'gradient' | 'pastel' | 'ai-image';

export type ElementKind = 'text' | 'image' | 'shape';

export interface EditorElement {
  id: string;
  kind: ElementKind;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  imageUrl?: string;
  imageFit?: 'contain' | 'cover';
  shapeCss?: string;
  opacity?: number;
  shadowStrength?: number;
  hidden?: boolean;
  locked?: boolean;
  border?: string;
  borderRadius?: number;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  headline: string;
  description: string;
  priceText: string;
  storeName: string;
  accent: string;
  previewNote: string;
  elements: EditorElement[];
  defaultPromptKo: string;
}

export interface BackgroundCandidate {
  id: string;
  name: string;
  mode: BackgroundMode;
  cssBackground: string;
  imageUrl?: string;
  note: string;
  translatedPrompt: string;
  negativePrompt: string;
}

export interface SidebarRecommendation {
  title: string;
  items: string[];
}

export interface BootstrapResponse {
  templates: TemplateDefinition[];
  sidebarRecommendations: SidebarRecommendation[];
}

export interface HomeProductInput {
  id: number;
  name: string;
  price: string;
  description: string;
  image: string | null;
  isAiGen: boolean;
  showName: boolean;
  showPrice: boolean;
  showDesc: boolean;
}

export interface HomeAdditionalInfo {
  parkingSpaces: string;
  petFriendly: boolean;
  noKidsZone: boolean;
  smokingArea: boolean;
  elevator: boolean;
  phoneNumber: string;
  address: string;
}

export interface HomeProjectData {
  options: {
    ratio: string;
    sampleCount: number;
    concept: string;
    brandColor: string;
  };
  storeName: string;
  mainSlogan: string;
  details: string;
  products: HomeProductInput[];
  additionalInfo: HomeAdditionalInfo;
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
