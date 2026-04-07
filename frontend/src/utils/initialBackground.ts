import type { BackgroundCandidate } from '../types/api';
import type { HomeProjectData } from '../types/home';

/**
 * options.colors(신규) 또는 [startColor, endColor](구형 폴백)에서
 * 유효한 색상 배열을 반환합니다.
 */
function resolveColors(options: HomeProjectData['options']): string[] {
  if (options.colors && options.colors.length > 0) return options.colors;
  const start = options.startColor ?? options.brandColor ?? '#FF4757';
  const end = options.endColor ?? '#4A90E2';
  return [start, end];
}

/**
 * 다중색 하드-스톱 CSS를 생성합니다.
 *   - 2색: splitPosition 슬라이더 적용
 *   - 3–4색: 균등 분배
 */
function buildMultiColorCss(
  colors: string[],
  splitDirection: 'horizontal' | 'vertical',
  splitPosition: number,
): string {
  const deg = splitDirection === 'vertical' ? 180 : 90;

  if (colors.length === 2) {
    const pos = `${splitPosition}%`;
    return `linear-gradient(${deg}deg, ${colors[0]} ${pos}, ${colors[1]} ${pos})`;
  }

  const step = 100 / colors.length;
  const stops = colors
    .flatMap((c, i) => [
      `${c} ${Math.round(i * step)}%`,
      `${c} ${Math.round((i + 1) * step)}%`,
    ])
    .join(', ');
  return `linear-gradient(${deg}deg, ${stops})`;
}

function getConceptCss(concept?: string): string {
  switch (concept) {
    case 'solid':
      return '#ffffff';
    case 'gradient':
      return 'linear-gradient(135deg, #FF4757 0%, #4A90E2 100%)';
    case 'pastel':
      return 'linear-gradient(90deg, #FDF6E3 50%, #EAE0C9 50%)';
    case 'ai-image':
    default:
      return 'linear-gradient(180deg, #111827 0%, #0f172a 100%)';
  }
}

export function buildInitialBackgroundCandidate(projectData: HomeProjectData): BackgroundCandidate {
  const { options } = projectData;
  const bgType = options.bgType ?? 'AI 생성';
  const colors = resolveColors(options);
  const gradientAngle = options.gradientAngle ?? 135;
  const splitPosition = options.splitPosition ?? 50;
  const splitDirection = options.splitDirection ?? 'horizontal';

  let cssBackground = getConceptCss(options.concept);

  if (bgType === '단색') {
    cssBackground = colors[0];
  } else if (bgType === '그라데이션') {
    cssBackground = `linear-gradient(${gradientAngle}deg, ${colors.join(', ')})`;
  } else if (bgType === '다중색') {
    cssBackground = buildMultiColorCss(colors, splitDirection, splitPosition);
  }

  return {
    id: 'init-preview-background',
    name: 'initPage 배경',
    mode:
      options.concept === 'solid' ||
      options.concept === 'gradient' ||
      options.concept === 'pastel' ||
      options.concept === 'ai-image'
        ? options.concept
        : 'ai-image',
    cssBackground,
    note: 'initPage에서 선택한 배경을 그대로 반영한 초기 후보',
    translatedPrompt: '',
    negativePrompt: '',
  };
}
