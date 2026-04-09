import BaseApi from './baseApi';

class DesignApi extends BaseApi {
	resolveUserId(payload = {}) {
		return String(payload?.user_id ?? payload?.userId ?? '').trim() || 'admin';
	}

  async saveDesignProfile(payload) {
		const resolvedUserId = this.resolveUserId(payload);
    const requestPayload = {
      ...payload,
      user_id: resolvedUserId,
    };

		return this.post('/design/saveprofile', requestPayload, '디자인 프로파일 저장에 실패했습니다.');
  }

  async listDesignProfiles(payload = {}) {
		const resolvedUserId = this.resolveUserId(payload);
		const requestBody = { user_id: resolvedUserId };
		const candidates = ['/design/list', '/list'];

		let lastResult = null;

		for (const urlPath of candidates) {
			const result = await this.post(urlPath, requestBody, '디자인 프로파일 조회에 실패했습니다.');
			if (result.ok) {
				return result;
			}

			const httpStatus = Number(result.httpStatusCode ?? result.statusCode ?? 0);
			const isNotFound = httpStatus === 404 || /Not Found/i.test(String(result.error ?? ''));
			if (!isNotFound) {
				return result;
			}
			lastResult = result;
		}

		return {
			...lastResult,
			error: '디자인 프로파일 조회 API 경로를 찾지 못했습니다. 서버의 라우터 prefix와 경로(/design/list 또는 /list)를 확인해 주세요.',
		};
	}
}

export const designApi = new DesignApi();
export default DesignApi;
