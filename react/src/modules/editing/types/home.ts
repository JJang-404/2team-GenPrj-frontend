export interface ProductTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface HomeProductInput {
  id: number;
  name: string;
  price: string;
  currency?: string;
  description: string;
  image: string | null;
  isAiGen: boolean;
  showName: boolean;
  showPrice: boolean;
  showDesc: boolean;
  /** initPage 드래프트 레이아웃에서 계산된 배치 좌표. 존재 시 템플릿 기본값보다 우선. */
  transform?: ProductTransform | null;
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

export interface HomeProjectOptions {
  draftIndex?: number;
  ratio: string;
  sampleCount: number;
  concept: string;
  brandColor: string;
  bgType?: string;
  startColor?: string;
  endColor?: string;
  gradientAngle?: number;
  splitPosition?: number;
  splitDirection?: 'horizontal' | 'vertical';
}

export interface HomeProjectData {
  options: HomeProjectOptions;
  storeName: string;
  industry: string;
  mainSlogan: string;
  details: string;
  products: HomeProductInput[];
  additionalInfo: HomeAdditionalInfo;
}
