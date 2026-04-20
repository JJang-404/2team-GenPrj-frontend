import { getDraftProductSlots } from '../../../shared/draftLayout';

const EDITING_BRIDGE_KEY = 'backlit-editing-bridge';

// ─── IndexedDB 헬퍼 ──────────────────────────────────────────────────────────
const IDB_DB_NAME = 'backlit-bridge-db';
const IDB_STORE_NAME = 'editing-bridge';
export const IDB_PAYLOAD_KEY = 'latest';

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    tx.objectStore(IDB_STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDelete(key) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    tx.objectStore(IDB_STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── 이미지 유틸 ─────────────────────────────────────────────────────────────

function safeStringify(value) {
  return JSON.stringify(value);
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

/**
 * PNG 이미지의 투명 여백(Alpha=0)을 잘라내어 실제 콘텐츠 영역만 반환.
 * 배경 제거 후 불필요한 빈 공간을 최소화해 전송 크기를 줄입니다.
 */
function cropToBoundingBox(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (alpha > 0) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      // 완전 투명이거나 크롭 영역이 없으면 원본 반환
      if (minX > maxX || minY > maxY) {
        resolve(dataUrl);
        return;
      }

      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;
      const out = document.createElement('canvas');
      out.width = cropW;
      out.height = cropH;
      out.getContext('2d').drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(out.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * blob URL → data URL 변환 후, PNG(배경 제거 결과물)는 바운딩박스 크롭 적용.
 */
async function normalizeProductImage(image) {
  if (!image) return null;
  if (typeof image !== 'string') return null;

  let dataUrl = image;
  if (image.startsWith('blob:')) {
    dataUrl = await blobUrlToDataUrl(image);
  }

  // PNG 이미지에 대해 투명 영역 크롭 (배경 제거 결과물 경량화)
  if (dataUrl.startsWith('data:image/png')) {
    dataUrl = await cropToBoundingBox(dataUrl);
  }

  return dataUrl;
}

// ─── 배경 타입 매핑 ──────────────────────────────────────────────────────────
const BG_TYPE_TO_EDITING_MODE = {
  단색: 'solid',
  그라데이션: 'gradient',
  다중색: 'pastel',
  'AI 생성': 'ai-image',
};

// ─── 페이로드 빌더 ───────────────────────────────────────────────────────────

export async function buildEditingPayload({ options, basicInfo, extraInfo, products }) {
  const normalizedProducts = await Promise.all(
    products.map(async (product) => ({
      ...product,
      image: await normalizeProductImage(product.image ?? null),
    }))
  );

  // 이미지가 있는 제품만 드래프트 슬롯 좌표 계산 (현재 initPage는 Type 0 고정)
  const activeWithImage = normalizedProducts.filter((p) => p.image);
  const slots = getDraftProductSlots(0, activeWithImage.length);

  let slotCursor = 0;
  const productsWithTransform = normalizedProducts.map((product) => {
    if (!product.image) return { ...product, transform: null };
    const slot = slots[slotCursor] ?? slots[0] ?? null;
    slotCursor += 1;
    return { ...product, transform: slot };
  });

  return {
    projectData: {
      options: {
        ratio: options.ratio,
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
      industry: basicInfo.industry?.trim() ?? '',
      mainSlogan: basicInfo.storeDesc?.trim() ?? '',
      details: '',
      products: productsWithTransform.map((product) => ({
        id: product.id,
        name: product.name ?? '',
        price: `${product.price ?? ''}`.trim(),
        currency: product.currency ?? '원',
        description: product.description ?? '',
        image: product.image ?? null,
        isAiGen: Boolean(product.isAiGen),
        showName: Boolean(product.showName),
        showPrice: Boolean(product.showPrice),
        showDesc: Boolean(product.showDesc),
        transform: product.transform ?? null,
      })),
      additionalInfo: {
        parkingSpaces: Number(extraInfo.parkingCount) || 0,
        petFriendly: Boolean(extraInfo.petFriendly),
        noKidsZone: Boolean(extraInfo.isNoKids),
        smokingArea: Boolean(extraInfo.hasSmokingArea),
        elevator: Boolean(extraInfo.hasElevator),
        phoneNumber: extraInfo.phone ?? '',
        address: extraInfo.address ?? '',
        viewParking: Boolean(extraInfo.viewParking),
        viewPet: Boolean(extraInfo.viewPet),
        viewPhone: Boolean(extraInfo.viewPhone),
        viewAddress: Boolean(extraInfo.viewAddress),
        viewNoKids: Boolean(extraInfo.viewNoKids),
        viewSmoking: Boolean(extraInfo.viewSmoking),
        viewElevator: Boolean(extraInfo.viewElevator),
      },
    },
  };
}

// ─── 페이로드 저장 ───────────────────────────────────────────────────────────

/**
 * 페이로드를 IndexedDB에 저장합니다(5MB 제한 없음).
 * 실패 시 sessionStorage 폴백.
 */
export async function storeEditingPayload(payload) {
  try {
    await idbSet(IDB_PAYLOAD_KEY, payload);
    console.info('IndexedDB에 페이로드 저장 완료');
    return null;
  } catch (idbError) {
    console.warn('IndexedDB 저장 실패, sessionStorage 폴백 시도:', idbError);
    try {
      sessionStorage.setItem(EDITING_BRIDGE_KEY, safeStringify(payload));
    } catch (e) {
      console.warn('sessionStorage 용량 초과 — 데이터 전달 불가');
    }
    return null;
  }
}

export function getEditingAppUrl() {
  const baseUrl = import.meta.env.VITE_EDITING_URL ?? '/editing';
  return new URL(baseUrl, window.location.origin).pathname;
}
