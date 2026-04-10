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
      // 1. 이미지 데이터(Base64)는 용량 초과(QuotaExceededError)의 원인이므로 제외하고 텍스트 정보만 추출합니다.
      const sanitizedProducts = Array.isArray(data.products)
        ? data.products.map(({ image, ...rest }) => rest)
        : [];

      // 2. 저장할 최종 페이로드 구성 (기존 extraInfo가 있다면 제외하고 최신 정보를 덮어씁니다.)
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
    if (basicInfo?.storeDesc) lines.push(`가게소개: ${basicInfo.storeDesc}`);

    // 활성화된(showDesc: true) 상품 소개문구 리스트 추가
    if (Array.isArray(products) && products.length > 0) {
      const activeDescs = products
        .filter((p) => p.showDesc && p.description?.trim())
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
