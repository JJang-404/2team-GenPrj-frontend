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

export interface HomeProjectOptions {
  ratio: string;
  sampleCount: number;
  concept: string;
  brandColor: string;
}

export interface HomeProjectData {
  options: HomeProjectOptions;
  storeName: string;
  mainSlogan: string;
  details: string;
  products: HomeProductInput[];
  additionalInfo: HomeAdditionalInfo;
}
