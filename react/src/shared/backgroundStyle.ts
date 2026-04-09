export interface SharedBackgroundStyleOptions {
  gradientAngle?: number;
  splitPosition?: number;
  splitDirection?: 'horizontal' | 'vertical';
}

export function getSharedBgStyle(
  bgType?: string,
  startColor?: string,
  endColor?: string,
  opts: SharedBackgroundStyleOptions = {}
) {
  const {
    gradientAngle = 135,
    splitPosition = 50,
    splitDirection = 'horizontal',
  } = opts;

  const safeStart = startColor ?? '#FF4757';
  const safeEnd = endColor ?? '#4A90E2';

  switch (bgType) {
    case '단색':
      return { background: safeStart };
    case '그라데이션':
      return {
        background: `linear-gradient(${gradientAngle}deg, ${safeStart}, ${safeEnd})`,
      };
    case '다중색': {
      const pos = `${splitPosition}%`;
      if (splitDirection === 'vertical') {
        return {
          background: `linear-gradient(180deg, ${safeStart} ${pos}, ${safeEnd} ${pos})`,
        };
      }
      return {
        background: `linear-gradient(90deg, ${safeStart} ${pos}, ${safeEnd} ${pos})`,
      };
    }
    default:
      return null;
  }
}
