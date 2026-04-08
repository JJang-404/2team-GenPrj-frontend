import type { GenerateBackgroundRequest, GenerateBackgroundResponse, BackgroundCandidate } from '../types/api';
import { getRemoteApiBase } from '../config/remoteApi';

function svgData(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createBackgroundSvg({ colors, variant, grain = false }: { colors: string[]; variant: string; grain?: boolean }) {
  const [c1, c2, c3, c4 = c3 ?? c2] = colors;
  const shapes: Record<string, string> = {
    split: `<rect width="50%" height="100%" fill="${c1}"/><rect x="50%" width="50%" height="100%" fill="${c2}"/>`,
    diagonal: `<path d="M0 0 H1080 V400 L0 820 Z" fill="${c1}"/><path d="M1080 0 V1920 H0 V910 Z" fill="${c2}"/>`,
    halo: `<rect width="100%" height="100%" fill="${c1}"/><circle cx="780" cy="420" r="280" fill="${c2}" opacity="0.45"/><circle cx="240" cy="1450" r="220" fill="${c3}" opacity="0.38"/>`,
    arch: `<rect width="100%" height="100%" fill="${c1}"/><path d="M150 1920 V920 C150 640 330 420 540 420 C750 420 930 640 930 920 V1920 Z" fill="${c2}"/>`,
    cafe: `<defs><radialGradient id="g1" cx="30%" cy="18%" r="58%"><stop offset="0%" stop-color="${c2}" stop-opacity="0.95"/><stop offset="48%" stop-color="${c1}" stop-opacity="0.42"/><stop offset="100%" stop-color="${c1}" stop-opacity="0"/></radialGradient><linearGradient id="desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c2}"/><stop offset="100%" stop-color="${c3}"/></linearGradient></defs><rect width="100%" height="100%" fill="${c1}"/><rect y="1440" width="100%" height="480" fill="url(#desk)"/><rect y="1380" width="100%" height="18" fill="rgba(255,255,255,0.12)"/><circle cx="300" cy="320" r="480" fill="url(#g1)"/>`,
    landscape: `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="60%" stop-color="${c2}"/><stop offset="100%" stop-color="${c3}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#sky)"/><circle cx="540" cy="430" r="180" fill="rgba(255,245,214,0.8)"/><path d="M0 1220 C110 1040 220 930 380 900 C470 884 560 924 620 988 C728 842 854 816 1080 1110 V1920 H0 Z" fill="rgba(63,87,59,0.84)"/><rect y="1470" width="100%" height="450" fill="rgba(129,92,58,0.88)"/>`,
    studio: `<defs><radialGradient id="spot" cx="50%" cy="28%" r="52%"><stop offset="0%" stop-color="${c2}" stop-opacity="0.95"/><stop offset="44%" stop-color="${c1}" stop-opacity="0.45"/><stop offset="100%" stop-color="${c1}" stop-opacity="0"/></radialGradient><linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c3}" stop-opacity="0.9"/><stop offset="100%" stop-color="${c1}" stop-opacity="0.96"/></linearGradient></defs><rect width="100%" height="100%" fill="${c1}"/><circle cx="540" cy="520" r="520" fill="url(#spot)"/><path d="M0 1380 C190 1280 340 1250 540 1250 C740 1250 900 1280 1080 1380 V1920 H0 Z" fill="url(#floor)"/>`,
  };

  return svgData(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
      ${shapes[variant] ?? shapes.split}
      ${grain ? `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" opacity="0.08" filter="url(#n)"/>` : ''}
    </svg>
  `);
}

function parseBackgroundToken(prompt: string, type: 'SOLID' | 'GRADIENT' | 'MULTI') {
  const matched = prompt.match(new RegExp(`BG_${type}\\(([^)]*)\\)`));
  if (!matched) return null;
  return matched[1]
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^#[0-9a-fA-F]{6}$/.test(value));
}

function heuristicTranslation(promptKo: string, backgroundMode: string, guideSummary = '') {
  const lower = promptKo.trim();
  const subject = [
    lower.includes('말차') || lower.includes('녹차') ? 'matcha drink advertisement poster background' : '',
    lower.includes('라떼') ? 'latte campaign backdrop' : '',
    lower.includes('초코') || lower.includes('초콜릿') ? 'chocolate beverage poster background' : '',
    lower.includes('아이스크림') ? 'dessert promotion background' : '',
    lower.includes('커피') ? 'coffee advertising background' : '',
  ].filter(Boolean).join(', ');
  const modeHint: Record<string, string> = {
    solid: 'clean solid-color composition with bold panels',
    gradient: 'smooth gradient backdrop with soft depth',
    pastel: 'graphic poster background with clean split color blocks',
    'ai-image': 'photorealistic advertising background with cinematic lighting and real materials',
  };
  return [
    subject || 'advertising poster background',
    guideSummary ? `guide layout: ${guideSummary}` : '',
    modeHint[backgroundMode] || 'commercial backdrop',
    lower,
    'background only',
    'preserve object silhouette and text layout',
    'no extra product',
    'no people',
    'no hand',
    'no logo',
    'no text',
  ].filter(Boolean).join(', ');
}

function buildNegativePrompt() {
  return 'product, cup, bottle, glass, food, person, hand, typography, logo, watermark, label, duplicate object, extra packaging, extra drink, illustration, vector art, graphic splash, cream splash, floating toppings, floating garnish';
}

function createLocalColorCandidates(payload: GenerateBackgroundRequest): GenerateBackgroundResponse {
  const translatedPrompt = heuristicTranslation(payload.promptKo, payload.backgroundMode, payload.guideSummary);
  const negativePrompt = buildNegativePrompt();
  const solid = parseBackgroundToken(payload.promptKo, 'SOLID');
  const gradient = parseBackgroundToken(payload.promptKo, 'GRADIENT');
  const multi = parseBackgroundToken(payload.promptKo, 'MULTI');

  let candidates: BackgroundCandidate[] = [];
  if (payload.backgroundMode === 'solid') {
    const base = solid?.[0] ?? '#60a5fa';
    candidates = [{
      id: 'solid-local-1',
      name: '사용자 단색',
      mode: 'solid',
      cssBackground: base,
      note: `사용자 지정 단색 ${base}`,
      translatedPrompt,
      negativePrompt,
    }];
  } else if (payload.backgroundMode === 'gradient') {
    const colors = (gradient ?? ['#93c5fd', '#1d4ed8']).slice(0, 2);
    candidates = [
      {
        id: 'gradient-local-1',
        name: '사용자 그라데이션 1',
        mode: 'gradient',
        cssBackground: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        note: `사용자 지정 그라데이션 ${colors.join(' → ')}`,
        translatedPrompt,
        negativePrompt,
      },
      {
        id: 'gradient-local-2',
        name: '사용자 그라데이션 2',
        mode: 'gradient',
        cssBackground: `linear-gradient(180deg, ${colors[0]}, ${colors[1]})`,
        note: `사용자 지정 그라데이션 ${colors.join(' → ')}`,
        translatedPrompt,
        negativePrompt,
      },
      {
        id: 'gradient-local-3',
        name: '사용자 그라데이션 3',
        mode: 'gradient',
        cssBackground: `linear-gradient(45deg, ${colors[1]}, ${colors[0]})`,
        note: `사용자 지정 그라데이션 ${colors.join(' → ')}`,
        translatedPrompt,
        negativePrompt,
      },
    ];
  } else if (payload.backgroundMode === 'pastel') {
    const colors = (multi ?? ['#c4b5fd', '#93c5fd']).slice(0, 2);
    const variants = [
      { id: 'multi-local-1', name: '사용자 다중색 1', variant: 'split', css: `linear-gradient(90deg, ${colors[0]} 50%, ${colors[1]} 50%)` },
      { id: 'multi-local-2', name: '사용자 다중색 2', variant: 'diagonal', css: `linear-gradient(135deg, ${colors[0]} 0 50%, ${colors[1]} 50% 100%)` },
      { id: 'multi-local-3', name: '사용자 다중색 3', variant: 'arch', css: `linear-gradient(180deg, ${colors[0]} 50%, ${colors[1]} 50%)` },
    ];
    candidates = variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      mode: 'pastel',
      cssBackground: variant.css,
      imageUrl: createBackgroundSvg({ colors: [colors[0], colors[1], colors[1]], variant: variant.variant }),
      note: `사용자 지정 다중색 ${colors.join(', ')}`,
      translatedPrompt,
      negativePrompt,
    }));
  }

  return { translatedPrompt, negativePrompt, candidates };
}

async function dataUrlFromBlobResponse(response: Response) {
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('생성 이미지를 읽지 못했습니다.'));
    reader.readAsDataURL(blob);
  });
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text().catch(() => '');

  if (response.status === 504) {
    return '원격 이미지 생성 서버가 시간 초과(504)로 응답했습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (contentType.includes('text/html')) {
    return `원격 이미지 생성 요청이 실패했습니다. (HTTP ${response.status})`;
  }

  return raw || `원격 이미지 생성 요청이 실패했습니다. (HTTP ${response.status})`;
}

function createAiFallbackCandidates(
  translatedPrompt: string,
  negativePrompt: string,
  errorMessage: string
): BackgroundCandidate[] {
  const presets = [
    {
      id: 'ai-fallback-1',
      name: 'AI 폴백 스튜디오',
      mode: 'ai-image' as const,
      cssBackground: 'linear-gradient(135deg, #1f1720, #59443a)',
      imageUrl: createBackgroundSvg({ colors: ['#1f1720', '#7b5e46', '#3a241a'], variant: 'studio', grain: true }),
      note: `실사 생성 실패 폴백 | ${errorMessage}`,
      translatedPrompt,
      negativePrompt,
    },
    {
      id: 'ai-fallback-2',
      name: 'AI 폴백 카페',
      mode: 'ai-image' as const,
      cssBackground: 'linear-gradient(135deg, #261a16, #705237)',
      imageUrl: createBackgroundSvg({ colors: ['#261a16', '#6f4c31', '#342019'], variant: 'cafe', grain: true }),
      note: `실사 생성 실패 폴백 | ${errorMessage}`,
      translatedPrompt,
      negativePrompt,
    },
    {
      id: 'ai-fallback-3',
      name: 'AI 폴백 랜드스케이프',
      mode: 'ai-image' as const,
      cssBackground: 'linear-gradient(135deg, #7aa6b6, #e3c984)',
      imageUrl: createBackgroundSvg({ colors: ['#8fb7c5', '#f0d899', '#5f7d45'], variant: 'landscape', grain: true }),
      note: `실사 생성 실패 폴백 | ${errorMessage}`,
      translatedPrompt,
      negativePrompt,
    },
  ];

  return presets;
}

async function createAiImageCandidates(payload: GenerateBackgroundRequest): Promise<GenerateBackgroundResponse> {
  const translatedPrompt = heuristicTranslation(payload.promptKo, payload.backgroundMode, payload.guideSummary);
  const negativePrompt = buildNegativePrompt();
  const variants = [
    { name: 'AI 프리미엄 스튜디오', suffix: 'photoreal premium studio lighting, dark refined backdrop, realistic material textures, high-end beverage campaign set' },
    { name: 'AI 카페 우드 무드', suffix: 'photoreal coffee shop interior, rich wooden tabletop, cinematic spotlight, natural reflections' },
    { name: 'AI 골든 아워 밸리', suffix: 'photoreal golden hour landscape backdrop, atmospheric depth, realistic mountains and field' },
    { name: 'AI 소프트 윈도 라이트', suffix: 'photoreal daylight through cafe window, elegant wall texture, realistic shadows' },
  ];

  const base = getRemoteApiBase();
  const useChangeImage = Boolean(payload.guideImage);
  const successes: BackgroundCandidate[] = [];
  let lastError = '';

  for (const [index, variant] of variants.entries()) {
    try {
      const url = useChangeImage
        ? `${base}/model/changeimage`
        : `${base}/model/generate?${new URLSearchParams({
            prompt: `${translatedPrompt}, ${variant.suffix}`,
            negative_prompt: negativePrompt,
          }).toString()}`;
      const response = await fetch(url, {
        method: useChangeImage ? 'POST' : 'GET',
        headers: useChangeImage ? { 'Content-Type': 'application/json' } : undefined,
        body: useChangeImage
          ? JSON.stringify({
              prompt: `${translatedPrompt}, ${variant.suffix}`,
              negative_prompt: negativePrompt,
              image_base64: payload.guideImage,
              strength: 0.72,
            })
          : undefined,
      });

      if (!response.ok) {
        lastError = await readErrorMessage(response);
        continue;
      }

      successes.push({
        id: `ai-image-live-${index + 1}`,
        name: variant.name,
        mode: 'ai-image',
        cssBackground: 'linear-gradient(135deg, #111827, #374151)',
        imageUrl: await dataUrlFromBlobResponse(response),
        note: variant.suffix,
        translatedPrompt,
        negativePrompt,
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : '원격 이미지 생성 요청에 실패했습니다.';
    }
  }

  if (successes.length > 0) {
    return { translatedPrompt, negativePrompt, candidates: successes };
  }

  return {
    translatedPrompt,
    negativePrompt,
    candidates: createAiFallbackCandidates(
      translatedPrompt,
      negativePrompt,
      lastError || '원격 이미지 생성 서버가 응답하지 않았습니다.'
    ),
  };
}

export async function generateBackgroundCandidates(payload: GenerateBackgroundRequest): Promise<GenerateBackgroundResponse> {
  if (payload.backgroundMode === 'ai-image') {
    return createAiImageCandidates(payload);
  }

  return createLocalColorCandidates(payload);
}
