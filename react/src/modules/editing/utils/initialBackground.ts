import type { BackgroundCandidate } from '../types/api';
import type { BackgroundMode } from '../types/editor-core';
import type { HomeProjectData } from '../types/home';
import { getSharedBgStyle } from '../../../shared/backgroundStyle';

function extractBackgroundToken(promptHint = '', type: 'SOLID' | 'GRADIENT' | 'MULTI') {
  const matched = promptHint.match(new RegExp(`BG_${type}\\(([^)]*)\\)`));
  if (!matched) return null;
  return matched[1]
    .split(',')
    .map((item) => item.trim())
    .filter((item) => /^#[0-9a-fA-F]{6}$/.test(item) || /^#[0-9a-fA-F]{3}$/.test(item));
}

function getConceptCss(concept?: string) {
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

export function buildInitialBackgroundCandidate(
  projectData: HomeProjectData,
  backgroundMode?: BackgroundMode,
  promptHint = ''
): BackgroundCandidate {
  const { options } = projectData;
  const normalizedMode = backgroundMode ?? (
    options.concept === 'solid' || options.concept === 'gradient' || options.concept === 'pastel' || options.concept === 'ai-image'
      ? options.concept
      : 'ai-image'
  );
  const tokenSolid = extractBackgroundToken(promptHint, 'SOLID')?.[0];
  const tokenGradient = extractBackgroundToken(promptHint, 'GRADIENT') ?? [];
  const tokenMulti = extractBackgroundToken(promptHint, 'MULTI') ?? [];
  const bgType =
    normalizedMode === 'solid'
      ? '단색'
      : normalizedMode === 'gradient'
        ? '그라데이션'
        : normalizedMode === 'pastel'
          ? '다중색'
          : options.bgType ?? 'AI 생성';
  const startColor =
    tokenSolid ??
    tokenGradient[0] ??
    tokenMulti[0] ??
    options.startColor ??
    options.brandColor ??
    '#FF4757';
  const endColor =
    tokenGradient[1] ??
    tokenMulti[1] ??
    options.endColor ??
    '#4A90E2';
  const gradientAngle = options.gradientAngle ?? 135;
  const splitPosition = options.splitPosition ?? 50;
  const splitDirection = options.splitDirection ?? 'horizontal';

  let cssBackground = getConceptCss(options.concept);
  const sharedStyle = getSharedBgStyle(bgType, startColor, endColor, {
    gradientAngle,
    splitPosition,
    splitDirection,
  });

  if (sharedStyle?.background) {
    cssBackground = sharedStyle.background;
  }

  return {
    id: 'init-preview-background',
    name: 'initPage 배경',
    mode: normalizedMode,
    cssBackground,
    note: 'initPage에서 선택한 배경을 그대로 반영한 초기 후보',
    translatedPrompt: '',
    negativePrompt: '',
  };
}
