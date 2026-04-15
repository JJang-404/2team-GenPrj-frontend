/**
 * 가게 정보를 시스템 전반에서 유연하게 공유하기 위한 유틸리티 클래스입니다.
 * 브라우저의 localStorage를 사용하여 페이지 이동 시에도 데이터를 유지합니다.
 */
class StoreInfo {
  constructor() {
    this.STORAGE_KEY = 'genprj_store_info';
  }

  /**
   * 디자인 선택 시 현재 입력된 모든 가게 정보를 저장합니다.
   * @param {Object} data - { basicInfo, extraInfo, products }
   */
  saveStoreInfo(data) {
    try {
      // description 만 보관 — id, name, price, currency, isAiGen,
      // showDesc, showName, showPrice, image 등은 모두 제외합니다.
      const sanitizedProducts = Array.isArray(data.products)
        ? data.products
            .filter((p) => p.description?.trim())
            .map(({ description }) => ({ description }))
        : [];

      const payload = {
        basicInfo: data.basicInfo || {},
        products: sanitizedProducts,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
      console.log('[StoreInfo] 가게 정보 저장 완료:', payload);
    } catch (e) {
      console.error('[StoreInfo] 정보 저장 실패:', e);
      alert('가게 정보를 저장하는 중 오류가 발생했습니다: ' + e.message);
    }
  }

  /**
   * 저장된 가게 정보를 가져옵니다.
   * @returns {Object|null}
   */
  getStoreInfo() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[StoreInfo] 정보 로드 실패:', e);
      alert('가게 정보를 불러오는 중 오류가 발생했습니다: ' + e.message);
      return null;
    }
  }

  /**
   * editing 화면 '처음으로' 클릭 시 storeDesc(최종 광고 문구)를 초기화합니다.
   */
  clearStoreDesc() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const info = JSON.parse(raw);
      const payload = {
        ...info,
        basicInfo: { ...info.basicInfo, storeDesc: '' },
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
      console.log('[StoreInfo] 광고 문구 필드 초기화 완료');
    } catch (e) {
      console.error('[StoreInfo] storeDesc 초기화 실패:', e);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * editing 화면 '처음으로' 클릭 시 storeIntro(가게 소개 문구)를 초기화합니다.
   */
  clearStoreIntro() {
    try {
      const data = this.getStoreInfo();
      if (data?.basicInfo) {
        data.basicInfo.storeIntro = '';
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.error('[StoreInfo] storeIntro 초기화 실패:', e);
    }
  }

  /**
   * AdCopy 생성을 위한 정제된 텍스트 프롬프트를 빌드합니다.
   * 선택된 정보만 기입되도록 필터링합니다.
   */
  buildAdPrompt() {
    const info = this.getStoreInfo();
    if (!info) return '';

    const { basicInfo, products } = info;
    const lines = [];

    if (basicInfo?.storeName) lines.push(`가게이름: ${basicInfo.storeName}`);
    if (basicInfo?.industry) lines.push(`업종: ${basicInfo.industry}`);
    if (basicInfo?.storeIntro) lines.push(`가게 소개: ${basicInfo.storeIntro}`);

    // 저장된 상품 소개문구 리스트 추가
    if (Array.isArray(products) && products.length > 0) {
      const activeDescs = products
        .filter((p) => p.description?.trim())
        .map((p) => p.description.trim());

      if (activeDescs.length > 0) {
        lines.push(''); // 가독성을 위한 구분
        lines.push('[활성화된 상품 소개문구]');
        activeDescs.forEach((desc, idx) => {
          lines.push(`${idx + 1}. ${desc}`);
        });
      }
    }

    return lines.join('\n');
  }
}

export const storeInfo = new StoreInfo();
export default storeInfo;
