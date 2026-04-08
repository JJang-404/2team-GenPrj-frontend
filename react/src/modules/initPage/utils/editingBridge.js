const EDITING_BRIDGE_KEY = 'adgen-editing-bridge';
const WINDOW_NAME_PREFIX = 'adgen-editing-bridge:';

const BG_TYPE_TO_EDITING_MODE = {
  단색: 'solid',
  그라데이션: 'gradient',
  다중색: 'pastel',
  'AI 생성': 'ai-image',
};

function safeStringify(value) {
  return JSON.stringify(value);
}

function getBridgeApiBase() {
  return import.meta.env.VITE_API_BASE_URL ?? '/api';
}

async function blobUrlToDataUrl(blobUrl) {
  const response = await fetch(blobUrl);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('blob URL을 data URL로 변환하지 못했습니다.'));
    reader.readAsDataURL(blob);
  });
}

async function normalizeProductImage(image) {
  if (!image) return null;
  if (typeof image !== 'string') return null;
  if (!image.startsWith('blob:')) return image;
  return blobUrlToDataUrl(image);
}

export async function buildEditingPayload({ options, basicInfo, extraInfo, products, draftIndex }) {
  const normalizedProducts = await Promise.all(
    products.map(async (product) => ({
      ...product,
      image: await normalizeProductImage(product.image ?? null),
    }))
  );

  return {
    draftIndex,
    projectData: {
      options: {
        ratio: options.ratio,
        sampleCount: options.sampleCount,
        concept: BG_TYPE_TO_EDITING_MODE[options.bgType] ?? 'ai-image',
        brandColor: options.brandColor,
        bgType: options.bgType,
        startColor: options.startColor,
        endColor: options.endColor,
        gradientAngle: options.gradientAngle,
        splitPosition: options.splitPosition,
        splitDirection: options.splitDirection,
      },
      storeName: basicInfo.storeName?.trim() ?? '',
      mainSlogan: basicInfo.storeDesc?.trim() ?? '',
      details: basicInfo.industry?.trim() ? `업종: ${basicInfo.industry.trim()}` : '',
      products: normalizedProducts.map((product) => ({
        id: product.id,
        name: product.name ?? '',
        price: [product.currency ?? '', product.price ?? ''].join('').trim(),
        currency: product.currency ?? '원',
        description: product.description ?? '',
        image: product.image ?? null,
        isAiGen: Boolean(product.isAiGen),
        showName: Boolean(product.showName),
        showPrice: Boolean(product.showPrice),
        showDesc: Boolean(product.showDesc),
      })),
      additionalInfo: {
        parkingSpaces: String(extraInfo.seatCount ?? ''),
        petFriendly: false,
        noKidsZone: Boolean(extraInfo.isNoKids),
        smokingArea: Boolean(extraInfo.hasSmokingArea),
        elevator: Boolean(extraInfo.hasElevator),
        phoneNumber: extraInfo.phone ?? '',
        address: extraInfo.address ?? '',
      },
    },
  };
}

export function storeEditingPayload(payload) {
  const serialized = safeStringify(payload);
  sessionStorage.setItem(EDITING_BRIDGE_KEY, serialized);
  window.name = `${WINDOW_NAME_PREFIX}${encodeURIComponent(serialized)}`;
}

export async function createEditingBridge(payload) {
  const response = await fetch(`${getBridgeApiBase()}/bridge/editing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || 'editing 브리지 생성에 실패했습니다.');
  }

  return response.json();
}

export function getEditingAppUrl(token) {
  const baseUrl = import.meta.env.VITE_EDITING_URL ?? '/editing';
  if (!token) return baseUrl;

  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set('bridgeToken', token);
  return `${url.pathname}${url.search}`;
}
