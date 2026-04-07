import type { InitOptions, InitBasicInfo, InitExtraInfo, InitProduct } from '../types';
import type { HomeProjectData } from '../../../types/home';

/** bgType → 2_editingPage BackgroundMode 매핑 */
const BG_TYPE_TO_MODE: Record<string, string> = {
  '단색': 'solid',
  '그라데이션': 'gradient',
  '다중색': 'pastel',
  'AI 생성': 'ai-image',
};

/**
 * 1_initPage의 상태를 2_editingPage가 소비하는 HomeProjectData로 변환합니다.
 * InitPage → EditorPage 전환 시 호출됩니다.
 */
export function buildProjectData(
  options: InitOptions,
  basicInfo: InitBasicInfo,
  extraInfo: InitExtraInfo,
  products: InitProduct[],
): HomeProjectData {
  return {
    storeName: basicInfo.storeName,
    mainSlogan: basicInfo.storeDesc,
    details: basicInfo.industry,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      description: p.description,
      image: p.image,
      isAiGen: p.isAiGen,
      showName: p.showName,
      showPrice: p.showPrice,
      showDesc: p.showDesc,
    })),
    options: {
      ratio: options.ratio,
      sampleCount: options.sampleCount,
      concept: BG_TYPE_TO_MODE[options.bgType] ?? 'ai-image',
      brandColor: options.brandColor,
      bgType: options.bgType,
      colors: options.colors,
      gradientAngle: options.gradientAngle,
      splitPosition: options.splitPosition,
      splitDirection: options.splitDirection,
    },
    additionalInfo: {
      parkingSpaces: extraInfo.parkingSpaces,
      petFriendly: extraInfo.petFriendly,
      deliveryPlatform: false,
      noKidsZone: extraInfo.isNoKids,
      smokingArea: extraInfo.hasSmokingArea,
      elevator: extraInfo.hasElevator,
      phoneNumber: extraInfo.phone,
      address: extraInfo.address,
    },
  };
}
