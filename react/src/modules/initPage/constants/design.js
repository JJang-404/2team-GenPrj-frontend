export const CONCEPT_STYLES = {
  premium: 'bg-slate-900 text-white',
  retro: 'bg-[#FDF6E3] border border-[#EAE0C9]',
  modern: 'bg-white border border-slate-100',
  vivid: 'bg-gradient-to-tr from-[#FF4757] to-[#FF6B81] text-white',
};

export const ASPECT_CLASSES = {
  '1:1': 'aspect-square',
  '4:5': 'aspect-[4/5]',
  '9:16': 'aspect-[9/16]',
};

export const RATIOS = ['1:1', '4:5', '9:16'];
export const CONCEPTS = ['premium', 'retro', 'modern', 'vivid'];
export const BG_TYPES = ['단색', '그라데이션', '다중색', 'AI 생성'];

/** bgType → concept 매핑 (DraftCard 하위 호환용) */
export const BG_TYPE_TO_CONCEPT = {
  '단색': 'modern',
  '그라데이션': 'vivid',
  '다중색': 'retro',
  'AI 생성': 'premium',
};

export const CURRENCIES = ['원', '$', '€', '¥', '£'];

export const createProduct = () => ({
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

export const DEFAULT_OPTIONS = {
  ratio: '4:5',
  sampleCount: 4,
  concept: 'vivid',
  bgType: '단색',
  startColor: '#FF4757',
  endColor: '#4A90E2',        // 기본 종료 색: 파랑 (그라데이션/다중색 시 대비 명확)
  brandColor: '#FF4757',      // 가게 이름 글자색 (독립 관리)
  gradientAngle: 135,         // 그라데이션 각도 (deg, 0–360)
  splitPosition: 50,          // 다중색 분할 위치 (%, 10–90)
  splitDirection: 'horizontal', // 다중색 분할 방향: 'horizontal' | 'vertical'
};

export const DEFAULT_BASIC_INFO = {
  storeName: '',
  industry: '',
  storeDesc: '',
};

export const DEFAULT_EXTRA_INFO = {
  parkingCount: 0,
  showParkingCount: true,
  petFriendly: false,
  showPetFriendly: true,
  phone: '',
  showPhone: true,
  address: '',
  showAddress: true,
  isNoKids: false,
  showIsNoKids: true,
  hasSmokingArea: false,
  showSmokingArea: true,
  hasElevator: false,
  showHasElevator: true,
  hasDelivery: false,
  showHasDelivery: true,
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
