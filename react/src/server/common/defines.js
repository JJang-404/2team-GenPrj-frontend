export const BACKEND_BASE_URL = 'http://localhost:8000/addhelper'
//'https://gen-proj.duckdns.org/addhelper'
//'/addhelper';

export const IMAGE_GENERATE_TIMEOUT_MS = 10 * 60 * 1000;
export const IMAGE_CHANGE_TIMEOUT_MS = 20 * 60 * 1000;

export const EMPTY_INPUT_FALLBACK = '미입력';
export const AI_BACKGROUND_PROMPT_HEADER = '아래 정보과 같이 배경을 만들어 주세요.';
export const AI_BACKGROUND_NEGATIVE_PROMPT = '배경에 문자는 넣지 말아 주세요';
export const AI_BACKGROUND_PROMPT_FIELDS = [
	{ no: 1, label: '가게이름', key: 'storeName' },
	{ no: 2, label: '업종', key: 'industry' },
	{ no: 3, label: '업종', key: 'industry' },
	{ no: 4, label: '가게 소개 문구', key: 'storeDesc' },
];

export const CURRENCIES = ['원', '$', '€', '¥', '£'];

export const DEFAULT_OPTIONS = {
	ratio: '4:5',
	sampleCount: 4,
	concept: 'vivid',
	bgType: '단색',
	aiBackgroundImage: '',
	startColor: '#FF4757',
	endColor: '#4A90E2',
	brandColor: '#FF4757',
	gradientAngle: 135,
	splitPosition: 50,
	splitDirection: 'horizontal',
};

export const DEFAULT_BASIC_INFO = {
	storeName: '',
	industry: '',
	storeDesc: '',
};

export const DEFAULT_EXTRA_INFO = {
	parkingCount: 0,
	showParkingCount: true,
	phone: '',
	showPhone: true,
	address: '',
	showAddress: true,
	hasDelivery: false,
	showDelivery: true,
	isNoKids: false,
	showIsNoKids: true,
	hasSmokingArea: false,
	showSmokingArea: true,
	hasElevator: false,
	showHasElevator: true,
};

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
