import type { InitOptions, InitBasicInfo, InitExtraInfo, InitProduct } from '../types';

export const CONCEPT_STYLES: Record<string, string> = {
  premium: 'bg-slate-900 text-white',
  retro: 'bg-[#FDF6E3] border border-[#EAE0C9]',
  modern: 'bg-white border border-slate-100',
  vivid: 'bg-gradient-to-tr from-[#FF4757] to-[#FF6B81] text-white',
};

export const ASPECT_CLASSES: Record<string, string> = {
  '1:1': 'aspect-square',
  '4:5': 'aspect-[4/5]',
  '9:16': 'aspect-[9/16]',
};

export const RATIOS = ['1:1', '4:5', '9:16'] as const;
export const CONCEPTS = ['premium', 'retro', 'modern', 'vivid'] as const;
export const BG_TYPES = ['단색', '그라데이션', '다중색', 'AI 생성'] as const;
export const CURRENCIES = ['원', '$', '€', '¥', '£'] as const;

/** bgType → concept 매핑 (DraftCard 하위 호환용) */
export const BG_TYPE_TO_CONCEPT: Record<string, string> = {
  '단색': 'modern',
  '그라데이션': 'vivid',
  '다중색': 'retro',
  'AI 생성': 'premium',
};

export const createProduct = (): InitProduct => ({
  id: Date.now(),
  name: '',
  price: '',
  currency: '원',
  description: '',
  image: null,
  isAiGen: false,
  showPrice: true,
  showDesc: true,
  showName: true,
});

export const DEFAULT_OPTIONS: InitOptions = {
  ratio: '4:5',
  sampleCount: 4,
  concept: 'vivid',
  bgType: '단색',
  colors: ['#FF4757', '#4A90E2'],
  brandColor: '#ffffff',
  gradientAngle: 135,
  splitPosition: 50,
  splitDirection: 'horizontal',
};

export const DEFAULT_BASIC_INFO: InitBasicInfo = {
  storeName: '',
  industry: '',
  storeDesc: '',
};

export const DEFAULT_EXTRA_INFO: InitExtraInfo = {
  parkingSpaces: '',
  showParkingSpaces: true,
  phone: '',
  showPhone: true,
  address: '',
  showAddress: true,
  petFriendly: false,
  showPetFriendly: true,
  isNoKids: false,
  showIsNoKids: true,
  hasSmokingArea: false,
  showSmokingArea: true,
  hasElevator: false,
  showHasElevator: true,
};

export const FONT_STYLES = `
  @font-face {
    font-family: 'ZenSerif';
    src: url('/fonts/ZEN-SERIF-TTF-Regular.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  .font-zen { font-family: 'ZenSerif', serif; }
`;
