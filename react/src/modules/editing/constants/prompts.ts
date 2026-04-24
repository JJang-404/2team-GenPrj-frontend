/**
 * AI 배경 생성용 씬(Scene) 프롬프트 상수 및 생성 함수
 */
export const SCENE_PROMPTS = {
  /**
   * [Universal] 업종 구분 없이 적용 가능한 고출력 범용 프롬프트 템플릿
   * {GPT_TRANSLATED_KEYWORDS} 자리에 사용자 입력값이 삽입됩니다.
   */
  UNIVERSAL: `photorealistic landscape photography, cinematic lighting, (completely empty center:1.5), (no objects in center:1.5), (unobstructed view:1.4), beautiful nature, masterpiece, best quality, 8k resolution, raw photo.`,

  /**
   * [Legacy] 다크 씬 (커피/디저트용)
   */
  COFFEE: `A highly detailed, photorealistic, professional advertising quality macro shot of a premium coffee poster background. An empty, luxurious dark espresso bar counter in the foreground, featuring deep black marble texture with subtle gold veins. Extremely shallow depth of field. The background is completely out of focus, dissolved into beautiful, warm golden bokeh from elegant cafe pendant lighting, melting into deep dark walnut wood paneled walls. Moody, sophisticated atmosphere, rich deep black and dark brown color palette with glowing gold accents. Pure empty surface in the center and foreground perfectly designed for product placement and typography. Minimalist luxury cafe vibe, cinematic lighting, 8k resolution.`,

  /**
   * [Legacy] 화이트 씬 (범용 제품용)
   */
  GENERAL: `premium luxury minimalist cafe background, high-end modern minimalist interior aesthetic. Focused on a flawless large slab of polished white Carrara marble with subtle light grey veining in the foreground. Clean, bright, and uncluttered composition. Soft natural daylight filtering in from a large window on the left, creating very soft, delicate shadows. The color palette is dominated by pure white, cream, and pale ivory. Extremely shallow depth of field. The background is completely dissolved into a beautiful, clean white and cream bokeh, hinting at a modern, bright cafe atmosphere without showing any distinct objects. A single, super-subtle thin line of brushed champagne gold metal runs along the very far edge. Large, pure empty copy space in the center. Photorealistic, 8k resolution, professional architectural photography style, clean and crisp lighting.`,
};

/**
 * [SYSTEM DEFAULT] 범용 부정적 프롬프트 (face:2.0, human:2.0 등 포함)
 */
export const UNIVERSAL_NEGATIVE_PROMPT = `(object in center:1.8), (giant table, furniture in middle:1.7), (cup, glass, product:1.9), depth of field blur on center, low quality, worst quality, artificial, blurry.`;

/**
 * 범용 긍정적 프롬프트 생성 함수
 * @param {string} keywords 사용자가 입력한 핵심 문구/키워드
 */
export const createUniversalPositivePrompt = (keywords: string): string => {
  const trimmed = (keywords || '').trim();
  // 템플릿 내의 {GPT_TRANSLATED_KEYWORDS} 자리를 실제 값으로 치환합니다.
  return SCENE_PROMPTS.UNIVERSAL.replace('{GPT_TRANSLATED_KEYWORDS}', trimmed);
};

/**
 * 범용 부정적 프롬프트 반환 함수
 */
export const getUniversalNegativePrompt = (): string => {
  return UNIVERSAL_NEGATIVE_PROMPT;
};

/**
 * AI 배경 img2img(opt 0/1/2) 호출에 전달할 고정 positive 프롬프트.
 * 사용자가 제공한 템플릿을 명시적인 편집 페이지 API 이름으로 노출합니다.
 */
export const createAiBackgroundPositivePrompt = (keywords: string): string => {
  return createUniversalPositivePrompt(keywords);
};

/**
 * AI 배경 img2img(opt 0/1/2) 호출에 전달할 고정 negative 프롬프트.
 */
export const getAiBackgroundNegativePrompt = (): string => {
  return getUniversalNegativePrompt();
};

/**
 * 커피군으로 판별할 업종 키워드 리스트
 */
export const COFFEE_RELATED_KEYWORDS = [
  '커피',
  '카페',
  '디저트',
  '빵',
  '베이커리',
  '바리스타',
  '원두',
  '에스프레소',
  'dessert',
  'coffee',
  'cafe',
  'bakery',
];
