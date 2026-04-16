export type EditorStep = 'background' | 'editor';

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
  productName?: string;
  productPrice?: string;
  productDescription?: string;
  priceCurrency?: '원' | '$';
  shapeCss?: string;
  opacity?: number;
  shadowStrength?: number;
  hidden?: boolean;
  locked?: boolean;
  border?: string;
  borderRadius?: number;
  yOffsetPx?: number;
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

export interface SidebarRecommendation {
  title: string;
  items: string[];
}
