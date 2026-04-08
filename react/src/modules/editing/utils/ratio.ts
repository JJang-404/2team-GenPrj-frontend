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
