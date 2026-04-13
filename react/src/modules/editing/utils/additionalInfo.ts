import type { HomeProjectData } from '../types/editor';

const INFO_ICON_PATHS = {
  parkingYes: '/info-icons/parking-yes.png',
  parkingNo: '/info-icons/parking-no.png',
  petFriendlyYes: '/info-icons/pet-friendly-yes.png',
  petFriendlyNo: '/info-icons/pet-friendly-no.png',
  noKidsZoneYes: '/info-icons/no-kids-yes.png',
  noKidsZoneNo: '/info-icons/no-kids-no.png',
  smokingAreaYes: '/info-icons/smoking-yes.png',
  smokingAreaNo: '/info-icons/smoking-no.png',
  elevatorYes: '/info-icons/elevator-yes.png',
  elevatorNo: '/info-icons/elevator-no.png',
} as const;

function svgDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function circleBadge({
  ringColor,
  accentFill = '#ffffff',
  content,
  badgeText,
  badgeFill,
}: {
  ringColor: string;
  accentFill?: string;
  content: string;
  badgeText?: string;
  badgeFill?: string;
}) {
  const badge = badgeText
    ? `
      <circle cx="72" cy="24" r="16" fill="${badgeFill ?? ringColor}" stroke="#0f172a" stroke-width="4"/>
      <text x="72" y="30" text-anchor="middle" font-size="16" font-weight="900" font-family="Arial, sans-serif" fill="#ffffff">${badgeText}</text>
    `
    : '';

  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r="40" fill="${accentFill}" stroke="${ringColor}" stroke-width="8"/>
      ${content}
      ${badge}
    </svg>
  `);
}

function parkingIcon(count: string) {
  const trimmed = count.trim();
  const normalized = Number(trimmed);
  const hasParking = Number.isFinite(normalized) ? normalized > 0 : Boolean(trimmed);
  if (!hasParking) {
    return INFO_ICON_PATHS.parkingNo;
  }

  const badgeText = trimmed.slice(0, 2);
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <image href="${INFO_ICON_PATHS.parkingYes}" x="0" y="0" width="96" height="96" preserveAspectRatio="xMidYMid meet"/>
      <rect x="14" y="12" width="24" height="18" rx="9" fill="#ffffff" stroke="#1d4ed8" stroke-width="2"/>
      <text x="26" y="25" text-anchor="middle" font-size="11" font-weight="900" font-family="Arial, sans-serif" fill="#1d4ed8">${badgeText}</text>
    </svg>
  `);
}

export function getAdditionalInfoIcon(projectData: HomeProjectData | null, label: string) {
  const info = projectData?.additionalInfo;

  switch (label) {
    case '주차 공간 수':
      return parkingIcon(info?.parkingSpaces ?? '');
    case '애견 동반 가능 여부':
      return info?.petFriendly ? INFO_ICON_PATHS.petFriendlyYes : INFO_ICON_PATHS.petFriendlyNo;
    case '노키즈존':
      return info?.noKidsZone ? INFO_ICON_PATHS.noKidsZoneYes : INFO_ICON_PATHS.noKidsZoneNo;
    case '흡연 구역 존재 여부':
      return info?.smokingArea ? INFO_ICON_PATHS.smokingAreaYes : INFO_ICON_PATHS.smokingAreaNo;
    case '엘리베이터 존재 여부':
      return info?.elevator ? INFO_ICON_PATHS.elevatorYes : INFO_ICON_PATHS.elevatorNo;
    case '전화번호':
      return circleBadge({
        ringColor: '#2563eb',
        content: `<text x="48" y="58" text-anchor="middle" font-size="24" font-weight="900" font-family="Arial, sans-serif" fill="#0f172a">CALL</text>`,
      });
    case '주소':
      return circleBadge({
        ringColor: '#f97316',
        content: `<text x="48" y="58" text-anchor="middle" font-size="24" font-weight="900" font-family="Arial, sans-serif" fill="#0f172a">MAP</text>`,
      });
    default:
      return circleBadge({
        ringColor: '#94a3b8',
        content: `<circle cx="48" cy="48" r="8" fill="#0f172a"/>`,
      });
  }
}

export function getAdditionalInfoDisplayText(projectData: HomeProjectData | null, label: string) {
  const info = projectData?.additionalInfo;
  if (!info) return '';

  switch (label) {
    case '주차 공간 수':
      return '';
    case '애견 동반 가능 여부':
      return '';
    case '노키즈존':
      return '';
    case '흡연 구역 존재 여부':
      return '';
    case '엘리베이터 존재 여부':
      return '';
    case '전화번호':
      return info.phoneNumber || '';
    case '주소':
      return info.address || '';
    default:
      return '';
  }
}
