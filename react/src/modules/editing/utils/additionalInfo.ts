import type { HomeProjectData } from '../types/editor';

/**
 * "표시 의도" 통일 key 체계.
 *
 * 3축(InitPage show*, bridge/editing view*, editing runtime state key)이 과거에는
 * 서로 다른 네이밍 규약을 가졌으나, 현재는 모두 `view*` 접두어로 통일되었다.
 * `label`은 UI 표시(사이드바 / 디스플레이 텍스트) 용도로만 사용하며 state key로는 쓰지 않는다.
 * `dataField`는 3축 전부가 공통 참조하는 `HomeAdditionalInfo` 내부의 실제 값 필드 이름.
 */
export const ADDITIONAL_INFO_ITEMS = [
  { viewKey: 'viewParking',  label: '주차 공간 수',        dataField: 'parkingSpaces' },
  { viewKey: 'viewPet',      label: '애견 동반 가능 여부', dataField: 'petFriendly'   },
  { viewKey: 'viewNoKids',   label: '노키즈존',            dataField: 'noKidsZone'    },
  { viewKey: 'viewSmoking',  label: '흡연 구역 존재 여부', dataField: 'smokingArea'   },
  { viewKey: 'viewElevator', label: '엘리베이터 존재 여부', dataField: 'elevator'     },
  { viewKey: 'viewPhone',    label: '전화번호',            dataField: 'phoneNumber'   },
  { viewKey: 'viewAddress',  label: '주소',                dataField: 'address'       },
] as const;

export type AdditionalInfoKey = typeof ADDITIONAL_INFO_ITEMS[number]['viewKey'];

export const ADDITIONAL_INFO_KEYS: readonly AdditionalInfoKey[] =
  ADDITIONAL_INFO_ITEMS.map((item) => item.viewKey);

export function getAdditionalInfoLabel(key: AdditionalInfoKey): string {
  return ADDITIONAL_INFO_ITEMS.find((item) => item.viewKey === key)?.label ?? key;
}

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

function parkingIcon(count: number) {
  if (!(count > 0)) {
    return INFO_ICON_PATHS.parkingNo;
  }

  const badgeText = String(count).slice(0, 2);
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <image href="${INFO_ICON_PATHS.parkingYes}" x="0" y="0" width="96" height="96" preserveAspectRatio="xMidYMid meet"/>
      <rect x="14" y="12" width="24" height="18" rx="9" fill="#ffffff" stroke="#1d4ed8" stroke-width="2"/>
      <text x="26" y="25" text-anchor="middle" font-size="11" font-weight="900" font-family="Arial, sans-serif" fill="#1d4ed8">${badgeText}</text>
    </svg>
  `);
}

export function getAdditionalInfoIcon(projectData: HomeProjectData | null, key: AdditionalInfoKey) {
  const info = projectData?.additionalInfo;

  switch (key) {
    case 'viewParking':
      return parkingIcon(info?.parkingSpaces ?? 0);
    case 'viewPet':
      return info?.petFriendly ? INFO_ICON_PATHS.petFriendlyYes : INFO_ICON_PATHS.petFriendlyNo;
    case 'viewNoKids':
      return info?.noKidsZone ? INFO_ICON_PATHS.noKidsZoneYes : INFO_ICON_PATHS.noKidsZoneNo;
    case 'viewSmoking':
      return info?.smokingArea ? INFO_ICON_PATHS.smokingAreaYes : INFO_ICON_PATHS.smokingAreaNo;
    case 'viewElevator':
      return info?.elevator ? INFO_ICON_PATHS.elevatorYes : INFO_ICON_PATHS.elevatorNo;
    case 'viewPhone':
      return circleBadge({
        ringColor: '#2563eb',
        content: `<text x="48" y="58" text-anchor="middle" font-size="24" font-weight="900" font-family="Arial, sans-serif" fill="#0f172a">CALL</text>`,
      });
    case 'viewAddress':
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

export function getAdditionalInfoDisplayText(projectData: HomeProjectData | null, key: AdditionalInfoKey) {
  const info = projectData?.additionalInfo;
  if (!info) return '';

  switch (key) {
    case 'viewParking':
      return info.parkingSpaces > 0 ? `주차장 ${info.parkingSpaces} 대까지 수용 가능` : '';
    case 'viewPet':
      return '';
    case 'viewNoKids':
      return '';
    case 'viewSmoking':
      return '';
    case 'viewElevator':
      return '';
    case 'viewPhone':
      return info.phoneNumber || '';
    case 'viewAddress':
      return info.address || '';
    default:
      return '';
  }
}
