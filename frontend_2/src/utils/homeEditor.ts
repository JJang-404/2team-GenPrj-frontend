import type { CSSProperties } from 'react';
import type { HomeAdditionalInfo, HomeProductInput } from '../types/home';

export interface HomeEditorOptions {
  ratio: string;
  sampleCount: number;
  concept: string;
  brandColor: string;
}

export const initialHomeOptions: HomeEditorOptions = {
  ratio: '4:5',
  sampleCount: 4,
  concept: 'ai-image',
  brandColor: '#FF4757',
};

export const initialAdditionalInfo: HomeAdditionalInfo = {
  parkingSpaces: '',
  petFriendly: false,
  noKidsZone: false,
  smokingArea: false,
  elevator: false,
  phoneNumber: '',
  address: '',
};

export function createEmptyProduct(id = Date.now()): HomeProductInput {
  return {
    id,
    name: '',
    price: '',
    description: '',
    image: null,
    isAiGen: true,
    showName: true,
    showPrice: true,
    showDesc: true,
  };
}

export function createSloganCandidates(storeName: string, productName: string, concept: string) {
  const store = storeName || '우리 가게';
  const product = productName || '시그니처 메뉴';

  return [
    `${store}의 ${product}, 지금 가장 선명한 한 잔`,
    `${product}의 매력을 ${store} 감성으로 완성하다`,
    `${store}에서 만나는 오늘의 ${product}`,
    `${concept.toUpperCase()} 무드로 풀어낸 ${product}`,
  ];
}

const draftLayouts = [
  [
    { top: '14%', left: '34%', width: '52%', rotate: '0deg' },
    { top: '50%', left: '8%', width: '22%', rotate: '-12deg' },
    { top: '12%', left: '10%', width: '20%', rotate: '10deg' },
  ],
  [
    { top: '26%', left: '6%', width: '38%', rotate: '-4deg' },
    { top: '22%', left: '53%', width: '38%', rotate: '5deg' },
    { top: '62%', left: '36%', width: '22%', rotate: '0deg' },
  ],
  [
    { top: '43%', left: '7%', width: '34%', rotate: '-9deg' },
    { top: '18%', left: '58%', width: '34%', rotate: '7deg' },
    { top: '12%', left: '40%', width: '16%', rotate: '-4deg' },
  ],
  [
    { top: '28%', left: '27%', width: '45%', rotate: '0deg' },
    { top: '55%', left: '8%', width: '24%', rotate: '-8deg' },
    { top: '55%', left: '68%', width: '24%', rotate: '8deg' },
  ],
] as const;

export function getDraftLayoutStyle(sampleIndex: number, productIndex: number): CSSProperties {
  const layout = draftLayouts[sampleIndex % draftLayouts.length];
  const position = layout[productIndex] ?? layout[0];

  return {
    top: position.top,
    left: position.left,
    width: position.width,
    height: '42%',
    transform: `rotate(${position.rotate})`,
  };
}
