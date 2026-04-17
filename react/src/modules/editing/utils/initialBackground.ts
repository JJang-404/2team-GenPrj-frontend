import type { BackgroundCandidate } from '../types/api';
import type { BackgroundMode } from '../types/editor-core';
import type { HomeProjectData } from '../types/home';
import { getSharedBgStyle } from '../../../shared/backgroundStyle';

interface BackgroundColorDraft {
  solid: [string];
  gradient: [string, string];
  pastel: [string, string];
}

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
      return '#ffffff';
    case 'pastel':
      return '#ffffff';
    case 'ai-image':
    default:
      return '#ffffff';
  }
}

export function buildInitialBackgroundCandidate(
  projectData: HomeProjectData,
  backgroundMode?: BackgroundMode,
  promptHint = '',
  colorDraft?: BackgroundColorDraft
): BackgroundCandidate {
  const { options } = projectData;
  const normalizedMode = backgroundMode ?? (
    options.concept === 'solid' || options.concept === 'gradient' || options.concept === 'pastel' || options.concept === 'ai-image'
      ? options.concept
      : 'ai-image'
  );
  // 기존 promptHint 토큰 파싱 방식. 필요 시 이 값들을 다시 우선 사용하도록 원복 가능.
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
  const draftStartColor =
    normalizedMode === 'solid'
      ? colorDraft?.solid?.[0]
      : normalizedMode === 'gradient'
        ? colorDraft?.gradient?.[0]
        : normalizedMode === 'pastel'
          ? colorDraft?.pastel?.[0]
          : undefined;
  const draftEndColor =
    normalizedMode === 'gradient'
      ? colorDraft?.gradient?.[1]
      : normalizedMode === 'pastel'
        ? colorDraft?.pastel?.[1]
        : undefined;
  const startColor =
    draftStartColor ??
    tokenSolid ??
    tokenGradient[0] ??
    tokenMulti[0] ??
    options.startColor ??
    options.brandColor ??
    '#ffffff';
  const endColor =
    draftEndColor ??
    tokenGradient[1] ??
    tokenMulti[1] ??
    options.endColor ??
    '#2f2f2f';
  const gradientAngle = options.gradientAngle ?? 135;
  const splitPosition = options.splitPosition ?? 50;
  const splitDirection = options.splitDirection ?? 'horizontal';

  let cssBackground = getConceptCss(options.concept);
  const sharedStyle = getSharedBgStyle(bgType, startColor, endColor, {
    gradientAngle,
    splitPosition,
    splitDirection,
  });

  if (sharedStyle?.background && normalizedMode !== 'ai-image') {
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
