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
  deliveryPlatform: boolean;
  noKidsZone: boolean;
  smokingArea: boolean;
  elevator: boolean;
  phoneNumber: string;
  address: string;
}

export interface HomeProjectOptions {
  ratio: string;
  sampleCount: number;
  concept: string;
  brandColor: string;
  bgType?: string;
  /** 다중 색상 배열 (1_initPage v2+): 단색 1개, 그라데이션/다중색 2–4개 */
  colors?: string[];
  /** @deprecated colors 배열로 대체됨. 하위 호환용으로만 유지 */
  startColor?: string;
  /** @deprecated colors 배열로 대체됨. 하위 호환용으로만 유지 */
  endColor?: string;
  gradientAngle?: number;
  splitPosition?: number;
  splitDirection?: 'horizontal' | 'vertical';
}

export interface HomeProjectData {
  options: HomeProjectOptions;
  storeName: string;
  mainSlogan: string;
  details: string;
  products: HomeProductInput[];
  additionalInfo: HomeAdditionalInfo;
}
