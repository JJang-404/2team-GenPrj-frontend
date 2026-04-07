// ─── Init Feature 공유 타입 ───────────────────────────────────────────────

export interface InitOptions {
  ratio: string;
  sampleCount: number;
  concept: string;
  bgType: string;
  colors: string[];
  brandColor: string;
  gradientAngle: number;
  splitPosition: number;
  splitDirection: 'horizontal' | 'vertical';
}

export interface InitBasicInfo {
  storeName: string;
  industry: string;
  storeDesc: string;
}

export interface InitExtraInfo {
  parkingSpaces: string;
  showParkingSpaces: boolean;
  phone: string;
  showPhone: boolean;
  address: string;
  showAddress: boolean;
  petFriendly: boolean;
  showPetFriendly: boolean;
  isNoKids: boolean;
  showIsNoKids: boolean;
  hasSmokingArea: boolean;
  showSmokingArea: boolean;
  hasElevator: boolean;
  showHasElevator: boolean;
}

export interface InitProduct {
  id: number;
  name: string;
  price: string;
  currency: string;
  description: string;
  image: string | null;
  isAiGen: boolean;
  showPrice: boolean;
  showDesc: boolean;
  showName: boolean;
}

export interface RatioStyles {
  isTall: boolean;
  isSquare: boolean;
  isFiveFour: boolean;
  containerPadding: string;
  titleSize: string;
}

export interface InputData {
  storeName: string;
  mainSlogan: string;
}
