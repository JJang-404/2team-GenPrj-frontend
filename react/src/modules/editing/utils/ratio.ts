export function ratioToAspectValue(ratio?: string) {
  switch (ratio) {
    case '1:1':
      return '1 / 1';
    case '9:16':
      return '9 / 16';
    case '4:5':
    default:
      return '4 / 5';
  }
}

/** 비율 문자열 → canvasHeight / canvasWidth (예: '4:5' → 1.25) */
export function ratioToCanvasAR(ratio?: string): number {
  switch (ratio) {
    case '1:1':
      return 1.0;
    case '9:16':
      return 16 / 9;
    case '4:5':
    default:
      return 5 / 4;
  }
}
