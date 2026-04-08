import type { BackgroundCandidate } from '../types/api';
import type { HomeProjectData } from '../types/home';

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

export function buildInitialBackgroundCandidate(projectData: HomeProjectData): BackgroundCandidate {
  const { options } = projectData;
  const bgType = options.bgType ?? 'AI 생성';
  const startColor = options.startColor ?? options.brandColor ?? '#FF4757';
  const endColor = options.endColor ?? '#4A90E2';
  const gradientAngle = options.gradientAngle ?? 135;
  const splitPosition = options.splitPosition ?? 50;
  const splitDirection = options.splitDirection ?? 'horizontal';

  let cssBackground = getConceptCss(options.concept);

  if (bgType === '단색') {
    cssBackground = startColor;
  } else if (bgType === '그라데이션') {
    cssBackground = `linear-gradient(${gradientAngle}deg, ${startColor}, ${endColor})`;
  } else if (bgType === '다중색') {
    const pos = `${splitPosition}%`;
    cssBackground =
      splitDirection === 'vertical'
        ? `linear-gradient(180deg, ${startColor} ${pos}, ${endColor} ${pos})`
        : `linear-gradient(90deg, ${startColor} ${pos}, ${endColor} ${pos})`;
  }

  return {
    id: 'init-preview-background',
    name: 'initPage 배경',
    mode: options.concept === 'solid' || options.concept === 'gradient' || options.concept === 'pastel' || options.concept === 'ai-image'
      ? options.concept
      : 'ai-image',
    cssBackground,
    note: 'initPage에서 선택한 배경을 그대로 반영한 초기 후보',
    translatedPrompt: '',
    negativePrompt: '',
  };
}
