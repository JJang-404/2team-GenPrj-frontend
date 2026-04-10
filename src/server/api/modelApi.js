import axios from 'axios';
import BaseApi from './baseApi';
import { IMAGE_CHANGE_TIMEOUT_MS, IMAGE_GENERATE_TIMEOUT_MS } from '../common/defines';

class ModelApi extends BaseApi {
  async testConnection() {
    return this.get('/model/test');
  }

  async generateImage(prompt, positivePrompt = '', negativePrompt = '') {
    const queryParams = new URLSearchParams({ prompt });
    if (positivePrompt?.trim()) queryParams.set('positive_prompt', positivePrompt.trim());
    if (negativePrompt?.trim()) queryParams.set('negative_prompt', negativePrompt.trim());

    const urlPath = `/model/generate?${queryParams.toString()}`;

    try {
      const response = await this.apiClient.get(urlPath, {
        responseType: 'blob',
        timeout: IMAGE_GENERATE_TIMEOUT_MS,
      });

      // 방어 로직: Blob 타입인데 이미지가 아니라면 에러 메시지(JSON)가 담겨있을 수 있음
      if (response.data instanceof Blob && !response.data.type?.startsWith('image/')) {
        const text = await response.data.text();
        let errorMessage = '이미지 데이터를 수신하지 못했습니다.';
        try {
          const json = JSON.parse(text);
          errorMessage = json.message || json.error || json.detail || errorMessage;
        } catch (e) {
          errorMessage = text.slice(0, 100);
        }
        return { ok: false, apiUrl: this.buildUrl(urlPath), statusCode: response.status, error: errorMessage };
      }

      return {
        ok: true,
        apiUrl: this.buildUrl(urlPath),
        statusCode: response.status,
        blobUrl: URL.createObjectURL(response.data),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 시간 초과 (${IMAGE_GENERATE_TIMEOUT_MS / 1000}초)` };
        }
        if (error.response) {
          const statusCode = error.response.status;
          const friendlyError =
            statusCode === 504
              ? '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
              : `API 오류: ${error.response.statusText}`;
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            statusCode,
            error: friendlyError,
          };
        }
      }

      return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 실패: ${error.message}` };
    }
  }

  async changeImage(prompt, imageBase64, strength = 0.3, positivePrompt = '', negativePrompt = '', maskBase64 = '') {
    const urlPath = '/model/changeimage';
    const imagePromptTimeoutMs = IMAGE_CHANGE_TIMEOUT_MS;
    const body = {
      prompt,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined,
      image_base64: imageBase64,
      strength,
      ...(maskBase64 ? { mask_base64: maskBase64 } : {}),
    };

    try {
      const response = await this.apiClient.post(urlPath, body, {
        responseType: 'blob',
        timeout: imagePromptTimeoutMs,
      });

      // 방어 로직
      if (response.data instanceof Blob && !response.data.type?.startsWith('image/')) {
        const text = await response.data.text();
        let errorMessage = '이미지 변경에 실패했습니다.';
        try {
          const json = JSON.parse(text);
          errorMessage = json.message || json.error || json.detail || errorMessage;
        } catch (e) {
          errorMessage = text.slice(0, 100);
        }
        return { ok: false, apiUrl: this.buildUrl(urlPath), statusCode: response.status, error: errorMessage };
      }

      return {
        ok: true,
        apiUrl: this.buildUrl(urlPath),
        statusCode: response.status,
        blobUrl: URL.createObjectURL(response.data),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 시간 초과 (${imagePromptTimeoutMs}ms)` };
        }
        if (error.response) {
          const statusCode = error.response.status;
          const friendlyError =
            statusCode === 504
              ? '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
              : `API 오류: ${error.response.statusText}`;
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            statusCode,
            error: friendlyError,
          };
        }
      }

      return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 실패: ${error.message}` };
    }
  }
}

export const modelApi = new ModelApi();
export default ModelApi;