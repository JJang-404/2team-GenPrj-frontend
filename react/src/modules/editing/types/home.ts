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
  /** Pre-bake 왼쪽 절반 crop (PNG dataURL). Type 4 반크롭 구도에서 사용. */
  imageLeftHalf?: string;
  /** Pre-bake 오른쪽 절반 crop (PNG dataURL). Type 4 반크롭 구도에서 사용. */
  imageRightHalf?: string;
  /** 원본 이미지의 natural width. Type 3 오버랩 AR 계산용. */
  imageNaturalWidth?: number;
  /** 원본 이미지의 natural height. Type 3 오버랩 AR 계산용. */
  imageNaturalHeight?: number;
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

export interface ZonePosition {
  x: number;
  y: number;
  width: number;
  align?: 'left' | 'center' | 'right';
  rotation?: number;
  zIndex?: number;
}

export interface ZonePositions {
  store: ZonePosition;
  slogan: ZonePosition;
  details: ZonePosition;
  summary: ZonePosition;
}

export interface HomeProjectData {
  options: HomeProjectOptions;
  storeName: string;
  industry: string;
  mainSlogan: string;
  details: string;
  products: HomeProductInput[];
  additionalInfo: HomeAdditionalInfo;
  zonePositions?: ZonePositions;
}
