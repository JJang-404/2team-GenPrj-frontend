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

/** InitPage 드래프트 카드 표시 개수. 원래 4가지 레이아웃이었으나 현재 1가지만 노출. */
export const SAMPLE_COUNT = 1;

export const DEFAULT_OPTIONS = {
  ratio: '4:5',
  concept: 'vivid',
  bgType: '단색',
  startColor: '#ffffff',
  endColor: '#2f2f2f',        // 기본 종료 색: 거의 검정에 가까운 진회색
  brandColor: '#000000',      // 가게 이름 글자색 (독립 관리)
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
  viewParking: true,
  petFriendly: false,
  viewPet: true,
  phone: '',
  viewPhone: true,
  address: '',
  viewAddress: true,
  isNoKids: false,
  viewNoKids: true,
  hasSmokingArea: false,
  viewSmoking: true,
  hasElevator: false,
  viewElevator: true,
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
