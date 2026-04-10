import BaseApi from './baseApi';

class AdverApi extends BaseApi {
  async generateAdCopy(inputText, tone = '', targetAudience = '', count = 3) {
    return this.post(
      '/adver/generate',
      {
        input_text: inputText,
        tone: tone?.trim() || undefined,
        target_audience: targetAudience?.trim() || undefined,
        count,
      },
      '광고문구 생성에 실패했습니다.',
    );
  }
}

export const adverApi = new AdverApi();
export default AdverApi;