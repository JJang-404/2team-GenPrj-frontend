import type { RatioStyles } from '../types';

export function getRatioStyles(ratio: string): RatioStyles {
  const isTall = ratio === '9:16';
  const isSquare = ratio === '1:1';
  const isFiveFour = ratio === '4:5';
  return {
    isTall,
    isSquare,
    isFiveFour,
    containerPadding: isTall ? 'p-10' : isSquare ? 'p-4' : 'p-6',
    titleSize: isTall ? 'text-5xl' : isSquare ? 'text-3xl' : 'text-4xl',
  };
}
