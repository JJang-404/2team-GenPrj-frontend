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
    cornerArc: `<rect width="100%" height="100%" fill="${c2}"/><circle cx="0" cy="0" r="900" fill="${c1}"/>`,
    topBlock: `<rect width="100%" height="52%" fill="${c1}"/><rect y="52%" width="100%" height="48%" fill="${c2}"/>`,
    diagonalCorner: `<rect width="100%" height="100%" fill="${c2}"/><path d="M0 0 H1080 V1100 L0 1920 Z" fill="${c1}"/>`,
    doubleCircle: `<rect width="100%" height="100%" fill="${c2}"/><circle cx="950" cy="220" r="380" fill="${c1}"/><circle cx="120" cy="1700" r="340" fill="${c1}"/>`,
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

  // 업종/음식 키워드 → 영문 배경 컨텍스트
  const subjectMap: Array<[string[], string]> = [
    [['말차', '녹차'], 'matcha tea cafe poster background'],
    [['라떼', '카페라떼'], 'latte coffee shop advertising background'],
    [['초코', '초콜릿'], 'chocolate dessert cafe poster background'],
    [['아이스크림'], 'dessert ice cream shop promotion background'],
    [['커피'], 'coffee cafe advertising background'],
    [['베이커리', '빵'], 'artisan bakery shop background'],
    [['한식'], 'traditional korean restaurant background'],
    [['일식', '스시', '라멘'], 'japanese restaurant advertising background'],
    [['이탈리안', '파스타', '피자'], 'italian restaurant poster background'],
    [['꽃', '플라워'], 'flower shop botanical background'],
    [['미용', '헤어', '살롱'], 'beauty salon elegant background'],
  ];
  const subject = subjectMap
    .filter(([keys]) => keys.some((k) => lower.includes(k)))
    .map(([, en]) => en)
    .join(', ');

  // 분위기/스타일 키워드 → 영문 번역
  const styleMap: Array<[RegExp, string]> = [
    [/분위기\s*고급지게/g, 'luxury premium sophisticated'],
    [/고급스럽게/g, 'high-end luxury refined'],
    [/빈티지/g, 'vintage retro nostalgic'],
    [/세련되게/g, 'sleek modern refined'],
    [/카툰화/g, 'illustrated artistic stylized'],
    [/봄/g, 'spring fresh blooming'],
    [/여름/g, 'summer vibrant sunny'],
    [/가을/g, 'autumn warm golden'],
    [/겨울/g, 'winter cozy cool'],
    [/화사한/g, 'bright cheerful radiant'],
    [/따뜻한/g, 'warm cozy inviting'],
    [/시원한/g, 'cool refreshing crisp'],
    [/어두운/g, 'dark moody dramatic'],
    [/밝은/g, 'bright airy luminous'],
    [/미니멀/g, 'minimalist clean simple'],
    [/럭셔리/g, 'luxury premium opulent'],
    [/자연/g, 'natural organic earthy'],
    [/노을/g, 'sunset golden hour warm glow'],
    [/파스텔/g, 'pastel soft gentle colors'],
    [/모던/g, 'modern contemporary sleek'],
  ];
  let translatedKo = lower;
  for (const [pattern, replacement] of styleMap) {
    translatedKo = translatedKo.replace(pattern, replacement);
  }

  const modeHint: Record<string, string> = {
    solid: 'clean solid-color commercial composition',
    gradient: 'smooth gradient backdrop, soft color depth',
    pastel: 'graphic poster background, clean split color blocks',
    'ai-image': 'photorealistic advertising background, cinematic lighting, realistic materials',
  };

  return [
    subject || 'professional advertising poster background',
    guideSummary ? `layout guide: ${guideSummary}` : '',
    modeHint[backgroundMode] || 'commercial backdrop',
    translatedKo !== lower ? translatedKo : '',
    'background only',
    'no foreground objects',
    'no people',
    'no logo',
    'no text',
  ].filter(Boolean).join(', ');
}

function buildNegativePrompt() {
  return [
    'text', 'letters', 'alphabet', 'numbers', 'digits', 'typography', 'font', 'words', 'captions',
    'logo', 'watermark', 'brand name', 'label', 'sign', 'signage', 'banner',
    'people', 'person', 'human', 'face', 'faces', 'hands', 'fingers', 'body parts', 'figure',
    'product', 'cup', 'bottle', 'glass', 'food', 'packaging', 'extra objects',
    'duplicate objects', 'illustration', 'vector art', 'graphic splash',
    'low quality', 'blurry', 'distorted', 'ugly',
  ].join(', ');
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
    const colors = (gradient ?? ['#ffffff', '#2f2f2f']).slice(0, 2);
    candidates = [
      {
        id: 'gradient-local-1',
        name: '사용자 그라데이션 1',
        mode: 'gradient',
        cssBackground: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        note: `대각선 흐름형 그라데이션 ${colors.join(' → ')}`,
        translatedPrompt,
        negativePrompt,
      },
      {
        id: 'gradient-local-2',
        name: '사용자 그라데이션 2',
        mode: 'gradient',
        cssBackground: `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        note: `세로 흐름형 그라데이션 ${colors.join(' → ')}`,
        translatedPrompt,
        negativePrompt,
      },
      {
        id: 'gradient-local-3',
        name: '사용자 그라데이션 3',
        mode: 'gradient',
        cssBackground: `radial-gradient(circle at 30% 25%, ${colors[0]} 0%, ${colors[1]} 78%)`,
        note: `라디얼 스포트형 그라데이션 ${colors.join(' → ')}`,
        translatedPrompt,
        negativePrompt,
      },
      {
        id: 'gradient-local-4',
        name: '사용자 그라데이션 4',
        mode: 'gradient',
        cssBackground: `linear-gradient(90deg, ${colors[0]} 0%, ${colors[0]} 18%, ${colors[1]} 100%)`,
        note: `오프셋 밴드형 그라데이션 ${colors.join(' → ')}`,
        translatedPrompt,
        negativePrompt,
      },
    ];
  } else if (payload.backgroundMode === 'pastel') {
    const colors = (multi ?? ['#ffffff', '#1f1f1f']).slice(0, 2);
    const variants = [
      { id: 'multi-local-1', name: '사용자 다중색 1', variant: 'split', css: `linear-gradient(90deg, ${colors[0]} 50%, ${colors[1]} 50%)`, note: '좌우 분할형 다중색' },
      { id: 'multi-local-2', name: '사용자 다중색 2', variant: 'cornerArc', css: `radial-gradient(circle at 0 0, ${colors[0]} 0 63%, ${colors[1]} 64% 100%)`, note: '코너 아크형 다중색' },
      { id: 'multi-local-3', name: '사용자 다중색 3', variant: 'topBlock', css: `linear-gradient(180deg, ${colors[0]} 0 52%, ${colors[1]} 52% 100%)`, note: '상단 블록형 다중색' },
      { id: 'multi-local-4', name: '사용자 다중색 4', variant: 'diagonalCorner', css: `linear-gradient(150deg, ${colors[0]} 0 60%, ${colors[1]} 60% 100%)`, note: '대각 코너형 다중색' },
    ];
    candidates = variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      mode: 'pastel',
      cssBackground: variant.css,
      imageUrl: createBackgroundSvg({ colors: [colors[0], colors[1], colors[1]], variant: variant.variant }),
      note: `${variant.note} ${colors.join(', ')}`,
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
    {
      id: 'ai-fallback-4',
      name: 'AI 폴백 소프트 라이트',
      mode: 'ai-image' as const,
      cssBackground: 'linear-gradient(135deg, #d8dbe2, #8b93a8)',
      imageUrl: createBackgroundSvg({ colors: ['#d8dbe2', '#8b93a8', '#f4efe6'], variant: 'halo', grain: true }),
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

  // 4가지 포스터 배경 스타일 변형 — 텍스트/로고/사람 없이 배경만 생성
  const variants = [
    {
      name: 'AI 고급 스튜디오',
      suffix: 'luxury premium studio backdrop, dark refined elegant, cinematic dramatic lighting, realistic material textures, high-end commercial poster set',
    },
    {
      name: 'AI 따뜻한 우드',
      suffix: 'warm wooden interior atmosphere, rich natural wood grain, cozy ambient spotlight, soft golden tones, inviting commercial backdrop',
    },
    {
      name: 'AI 골든 아워',
      suffix: 'golden hour outdoor atmosphere, warm sunset glow, soft bokeh depth, atmospheric natural light, premium advertising backdrop',
    },
    {
      name: 'AI 소프트 라이트',
      suffix: 'soft natural daylight, elegant minimal background, clean airy atmosphere, subtle texture, modern clean commercial poster backdrop',
    },
  ];

  const base = getRemoteApiBase();
  // guideImage가 있으면 inpainting, 없으면 순수 생성(pure generation) 사용
  const useChangeImage = Boolean(payload.guideImage);
  const successes: BackgroundCandidate[] = [];
  let lastError = '';

  if (useChangeImage) {
    // changeimage: 순차 실행 — 504 시 즉시 중단해 불필요한 추가 요청을 막습니다.
    for (const [index, variant] of variants.entries()) {
      try {
        const response = await fetch(`${base}/model/changeimage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `${translatedPrompt}, ${variant.suffix}`,
            negative_prompt: negativePrompt,
            image_base64: payload.guideImage,
            strength: 0.72,
          }),
        });

        if (!response.ok) {
          lastError = await readErrorMessage(response);
          if (response.status === 504) break;
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
  } else {
    // generate: 순수 생성 — 4개 요청을 병렬로 실행해 총 대기 시간을 줄입니다.
    const settled = await Promise.allSettled(
      variants.map(async (variant, index) => {
        const url = `${base}/model/generate?${new URLSearchParams({
          prompt: `${translatedPrompt}, ${variant.suffix}`,
          negative_prompt: negativePrompt,
        }).toString()}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }
        return {
          id: `ai-image-live-${index + 1}`,
          name: variant.name,
          mode: 'ai-image' as const,
          cssBackground: 'linear-gradient(135deg, #111827, #374151)',
          imageUrl: await dataUrlFromBlobResponse(response),
          note: variant.suffix,
          translatedPrompt,
          negativePrompt,
        };
      }),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        successes.push(result.value);
      } else {
        lastError = (result.reason as Error)?.message ?? '원격 이미지 생성 요청에 실패했습니다.';
      }
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
