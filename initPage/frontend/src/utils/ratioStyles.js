/**
 * 비율(ratio) 문자열을 받아 레이아웃에서 공통으로 쓰이는 스타일 값을 반환합니다.
 */
export const getRatioStyles = (ratio) => {
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
};