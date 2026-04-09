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
      const payload = {
        ...data,
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

    const { basicInfo, extraInfo } = info;
    const lines = [];

    if (basicInfo?.storeName) lines.push(`가게이름: ${basicInfo.storeName}`);
    if (basicInfo?.industry) lines.push(`업종: ${basicInfo.industry}`);
    if (basicInfo?.storeDesc) lines.push(`가게소개: ${basicInfo.storeDesc}`);
    if (extraInfo?.address) lines.push(`주소: ${extraInfo.address}`);

    // 추가 정보 중 '노출(show...)'이 true이거나 '보유(has.../is...)'가 true인 것만 포함
    const extras = [];
    if (extraInfo?.parkingCount > 0 && extraInfo?.showParkingCount) extras.push(`주차공간 ${extraInfo.parkingCount}대`);
    if (extraInfo?.isNoKids) extras.push('노키즈존');
    if (extraInfo?.hasSmokingArea) extras.push('흡연공간 보유');
    if (extraInfo?.hasElevator) extras.push('엘리베이터 보유');
    if (extraInfo?.hasDelivery) extras.push('배달 가능');

    if (extras.length > 0) {
      lines.push(`편의시설/특이사항: ${extras.join(', ')}`);
    }

    return lines.join('\n');
  }
}

export const storeInfo = new StoreInfo();
export default storeInfo;
