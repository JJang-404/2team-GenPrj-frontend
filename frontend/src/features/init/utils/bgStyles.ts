import type { InitOptions } from '../types';

type BgStyleResult = { background: string } | null;

/**
 * bgType에 따른 드래프트 카드 배경 인라인 스타일을 반환합니다.
 *
 * 단색       : colors[0]
 * 그라데이션 : colors 배열 전체 → 선형 그라데이션 (자연 보간)
 * 다중색     : 하드-스톱 분할. 2색 → splitPosition, 3–4색 → 균등 분배
 * AI 생성    : null → 호출자가 CONCEPT_STYLES 클래스 사용
 */
export function getBgStyle(
  bgType: string,
  colors: string[] = ['#FF4757', '#4A90E2'],
  opts: Partial<Pick<InitOptions, 'gradientAngle' | 'splitPosition' | 'splitDirection'>> = {},
): BgStyleResult {
  const { gradientAngle = 135, splitPosition = 50, splitDirection = 'horizontal' } = opts;

  switch (bgType) {
    case '단색':
      return { background: colors[0] };

    case '그라데이션':
      return { background: `linear-gradient(${gradientAngle}deg, ${colors.join(', ')})` };

    case '다중색': {
      const deg = splitDirection === 'vertical' ? 180 : 90;
      if (colors.length === 2) {
        const pos = `${splitPosition}%`;
        return { background: `linear-gradient(${deg}deg, ${colors[0]} ${pos}, ${colors[1]} ${pos})` };
      }
      const step = 100 / colors.length;
      const stops = colors
        .flatMap((c, i) => [`${c} ${Math.round(i * step)}%`, `${c} ${Math.round((i + 1) * step)}%`])
        .join(', ');
      return { background: `linear-gradient(${deg}deg, ${stops})` };
    }

    case 'AI 생성':
    default:
      return null;
  }
}
