import axios from 'axios';
import { getBackendUrl } from '../common/functions';

class BaseApi {
  constructor(timeoutSec = 30) {
    this.timeoutMs = timeoutSec * 1000;
    this.backendUrl = getBackendUrl();
    this.apiClient = axios.create({
      baseURL: this.backendUrl,
      timeout: this.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  buildUrl(urlPath) {
    // dev 환경에서는 baseURL이 프록시 경로(/addhelper)라서 전체 URL이 필요 없음
    if (import.meta.env && import.meta.env.DEV) {
      return `${this.backendUrl}${urlPath}`;
    }
    // prod 환경에서는 실제 백엔드 전체 URL
    return `${this.backendUrl}${urlPath}`;
  }

  getResponseMessage(responseData, fallbackMessage) {
    return responseData?.statusMsg || responseData?.data || fallbackMessage;
  }

  getNetworkFailureMessage(urlPath) {
    const apiUrl = this.buildUrl(urlPath);
    const origin = typeof window !== 'undefined' ? window.location.origin : '알 수 없음';

    return `네트워크 연결 실패: ${apiUrl} 서버 미응답(현재 앱 출처: ${origin}, CORS/SSL/도메인 접근 여부를 확인해 주세요).`;
  }

  async get(urlPath) {
    try {
      const response = await this.apiClient.get(urlPath);

      return {
        ok: response.status >= 200 && response.status < 300,
        apiUrl: this.buildUrl(urlPath),
        statusCode: response.status,
        data: response.data,
        error: null,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            error: `요청 시간 초과 (${this.timeoutMs}ms)`,
          };
        }

        if (error.response) {
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            statusCode: error.response.status,
            error: this.getResponseMessage(error.response.data, `API 오류: ${error.response.statusText}`),
            data: error.response.data,
          };
        }
      }

      return {
        ok: false,
        apiUrl: this.buildUrl(urlPath),
        error: error.request ? this.getNetworkFailureMessage(urlPath) : `요청 실패: ${error.message}`,
      };
    }
  }

  async post(urlPath, body, fallbackMessage = '요청 처리 중 오류가 발생했습니다.') {
    try {
      const response = await this.apiClient.post(urlPath, body);
      const responseData = response.data;
      const statusStr = responseData?.statusCode ? String(responseData.statusCode) : '';
      const ok = response.status >= 200 && response.status < 300 && statusStr !== '100';

      return {
        ok,
        apiUrl: this.buildUrl(urlPath),
        statusCode: response.status,
        requestBody: body,
        responseJson: responseData,
        data: responseData?.datalist ?? null,
        message: this.getResponseMessage(responseData, ok ? null : fallbackMessage),
        error: ok ? null : this.getResponseMessage(responseData, fallbackMessage),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            error: `요청 시간 초과 (${this.timeoutMs}ms)`,
          };
        }

        if (error.response) {
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            statusCode: error.response.status,
            requestBody: body,
            responseJson: error.response.data,
            data: error.response.data?.datalist ?? null,
            error: this.getResponseMessage(error.response.data, `API 오류: ${error.response.statusText}`),
          };
        }
      }

      return {
        ok: false,
        apiUrl: this.buildUrl(urlPath),
        requestBody: body,
        error: error.request ? this.getNetworkFailureMessage(urlPath) : `요청 실패: ${error.message}`,
      };
    }
  }
}

export default BaseApi;