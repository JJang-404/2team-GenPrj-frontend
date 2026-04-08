interface DraftTypography {
  storeSize: number;
  sloganSize: number;
  detailsSize: number;
  summarySize: number;
  storeLineHeight: number;
  sloganLineHeight: number;
}

export function getDraftTypography(draftIndex: number, ratio = '4:5'): DraftTypography {
  const isTall = ratio === '9:16';
  const isSquare = ratio === '1:1';
  const idx = ((draftIndex % 4) + 4) % 4;

  switch (idx) {
    case 0:
      return {
        storeSize: isTall ? 48 : isSquare ? 30 : 36,
        sloganSize: isSquare ? 10 : 14,
        detailsSize: isSquare ? 10 : 14,
        summarySize: isSquare ? 11 : 15,
        storeLineHeight: 1,
        sloganLineHeight: 1.15,
      };
    case 1:
      return {
        storeSize: isSquare ? 36 : isTall ? 72 : 60,
        sloganSize: isSquare ? 12 : 20,
        detailsSize: isSquare ? 10 : 14,
        summarySize: isSquare ? 11 : 15,
        storeLineHeight: 0.95,
        sloganLineHeight: 1.1,
      };
    case 2:
      return {
        storeSize: isSquare ? 20 : isTall ? 60 : 36,
        sloganSize: isSquare ? 10 : 12,
        detailsSize: isSquare ? 9 : 12,
        summarySize: isSquare ? 12 : 14,
        storeLineHeight: 1,
        sloganLineHeight: 1.1,
      };
    case 3:
    default:
      return {
        storeSize: isSquare ? 48 : isTall ? 96 : 72,
        sloganSize: isSquare ? 14 : 18,
        detailsSize: isSquare ? 10 : 14,
        summarySize: isSquare ? 12 : 15,
        storeLineHeight: 0.95,
        sloganLineHeight: 1.1,
      };
  }
}
