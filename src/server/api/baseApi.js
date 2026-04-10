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
    return `${this.backendUrl}${urlPath}`;
  }

  hasApiStatus(responseData) {
    return responseData && typeof responseData === 'object' && 'statusCode' in responseData;
  }

  getApiStatusCode(responseData, fallbackStatusCode = null) {
    if (this.hasApiStatus(responseData)) {
      return responseData.statusCode;
    }

    return fallbackStatusCode;
  }

  isApiSuccess(httpStatusCode, responseData) {
    const isHttpSuccess = httpStatusCode >= 200 && httpStatusCode < 300;
    if (!isHttpSuccess) {
      return false;
    }

    if (!this.hasApiStatus(responseData)) {
      return true;
    }

    return String(responseData.statusCode) === '200';
  }

  getResponseMessage(responseData, fallbackMessage) {
    return responseData?.statusMsg || responseData?.data || fallbackMessage;
  }

  async get(urlPath) {
    try {
      const response = await this.apiClient.get(urlPath);
      const responseData = response.data;
      const ok = this.isApiSuccess(response.status, responseData);

      return {
        ok,
        apiUrl: this.buildUrl(urlPath),
        httpStatusCode: response.status,
        statusCode: this.getApiStatusCode(responseData, response.status),
        data: responseData?.datalist ?? responseData,
        responseJson: responseData,
        message: this.getResponseMessage(responseData, ok ? null : null),
        error: ok ? null : this.getResponseMessage(responseData, '요청 처리 중 오류가 발생했습니다.'),
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
        error: `요청 실패: ${error.message}`,
      };
    }
  }

  async post(urlPath, body, fallbackMessage = '요청 처리 중 오류가 발생했습니다.') {
    try {
      const response = await this.apiClient.post(urlPath, body);
      const responseData = response.data;
      const ok = this.isApiSuccess(response.status, responseData);

      return {
        ok,
        apiUrl: this.buildUrl(urlPath),
        httpStatusCode: response.status,
        statusCode: this.getApiStatusCode(responseData, response.status),
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
        error: `요청 실패: ${error.message}`,
      };
    }
  }
}

export default BaseApi;