import axios from 'axios';
import BaseApi from './baseApi';
import { IMAGE_CHANGE_TIMEOUT_MS, IMAGE_GENERATE_TIMEOUT_MS } from '../common/defines';

class ModelApi extends BaseApi {
  async testConnection() {
    return this.get('/model/test');
  }

  /**
   * [동기] 이미지 생성 (단일 요청)
   * 백엔드의 /model/generate_sync 엔드포인트를 호출합니다.
   */
  async generateImageSync(prompt, positivePrompt = '', negativePrompt = '') {
    const queryParams = new URLSearchParams({ prompt });
    if (positivePrompt?.trim()) queryParams.set('positive_prompt', positivePrompt.trim());
    if (negativePrompt?.trim()) queryParams.set('negative_prompt', negativePrompt.trim());

    const urlPath = `/model/generate_sync?${queryParams.toString()}`;

    try {
      const response = await this.apiClient.get(urlPath, {
        responseType: 'blob',
        timeout: IMAGE_GENERATE_TIMEOUT_MS,
      });

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
          return { ok: false, apiUrl: this.buildUrl(urlPath), statusCode, error: friendlyError };
        }
      }
      return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 실패: ${error.message}` };
    }
  }

  /**
   * [비동기] 폴링 공통 로직
   */
<<<<<<< Updated upstream
  async generateImageAsync(prompt, positivePrompt = '', negativePrompt = '') {
    return this._pollJobAsync('/model/generate/jobs', {
      prompt,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined
    }, '[Generate]');
  }

  /**
   * [비동기] ComfyUI 기반 이미지 생성 폴링
   */
  async generateImageComfyUIAsync(prompt, positivePrompt = '', negativePrompt = '') {
    return this._pollJobAsync('/model/generatecomfyui/jobs', {
      prompt,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined
    }, '[ComfyUI-Generate]');
  }

  /**
   * [비동기] 폴링 공통 로직
   */
=======
>>>>>>> Stashed changes
  async _pollJobAsync(jobPath, payload, logTag = '[Job]') {
    try {
      // 1. 작업 등록 (POST)
      const createRes = await this.apiClient.post(jobPath, payload);
      if (createRes.status !== 200 || !createRes.data.job_id) {
        throw new Error('작업 등록에 실패했습니다.');
      }

      const { job_id } = createRes.data;
      console.log(`${logTag} 비동기 작업 등록 완료: ${job_id}`);

      // 2. 폴링 시작
      const startedAt = Date.now();
      const timeoutMs = 5 * 60 * 1000; // 최대 5분 대기

      while (true) {
        if (Date.now() - startedAt > timeoutMs) {
          throw new Error('작업 시간이 초과되었습니다. (Timeout)');
        }

        const statusRes = await this.apiClient.get(`${jobPath}/${job_id}`);
        const statusJson = statusRes.data;

        if (statusJson.status === 'done' || statusJson.status === 'completed') {
          // 3. 결과 수신 (GET)
          const resultRes = await this.apiClient.get(`${jobPath}/${job_id}/result`, {
            responseType: 'blob'
          });
          
          if (resultRes.data.type === 'application/json') {
             const text = await resultRes.data.text();
             const json = JSON.parse(text);
             return { ok: true, jobId: job_id, data: json };
          }

          return {
            ok: true,
            jobId: job_id,
            blobUrl: URL.createObjectURL(resultRes.data)
          };
        }

        if (statusJson.status === 'failed') {
          throw new Error(statusJson.error || '작업 수행 중 오류가 발생했습니다.');
        }

        console.log(`${logTag} 작업 진행 중... (Status: ${statusJson.status})`);
<<<<<<< Updated upstream
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 간격 폴링
=======
        await new Promise(resolve => setTimeout(resolve, 2000));
>>>>>>> Stashed changes
      }
    } catch (error) {
      console.error(`${logTag} 비동기 작업 실패:`, error);
      return { ok: false, error: error.message };
    }
  }

  /**
<<<<<<< Updated upstream
   * [비동기] ComfyUI 배경 생성 최적화 폴링
   */
  async makeBackgroundComfyUIAsync(prompt, imageBase64, positivePrompt = '', negativePrompt = '') {
    return this._pollJobAsync('/model/makebgimagecomfyui/jobs', {
      prompt,
      image_base64: imageBase64,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined,
    }, '[ComfyUI-MakeBg]');
  }

  /**
   * 하위 호환을 위해 기존 메서드명을 유지하되 내부적으로 ComfyUI 비동기 방식을 사용하도록 합니다.
   */
  async generateImage(prompt, positivePrompt = '', negativePrompt = '') {
    return this.generateImageComfyUIAsync(prompt, positivePrompt, negativePrompt);
=======
   * [비동기] 이미지 생성 폴링 (표준)
   */
  async generateImageAsync(prompt, positivePrompt = '', negativePrompt = '') {
    return this._pollJobAsync('/model/generate/jobs', {
      prompt,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined
    }, '[Generate]');
>>>>>>> Stashed changes
  }

  /**
   * [비동기] ComfyUI 기반 이미지 생성 폴링
   */
  async generateImageComfyUIAsync(prompt, positivePrompt = '', negativePrompt = '') {
    return this._pollJobAsync('/model/generatecomfyui/jobs', {
      prompt,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined
    }, '[ComfyUI-Gen]');
  }

  /**
   * [비동기] ComfyUI 기반 이미지 변형(img2img) 폴링
   */
  async changeImageComfyUIAsync(prompt, imageBase64, strength = 0.45, positivePrompt = '', negativePrompt = '') {
    return this._pollJobAsync('/model/changeimagecomfyui/jobs', {
      prompt,
      image_base64: imageBase64,
      strength,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined,
    }, '[ComfyUI-Change]');
  }

  /**
   * [비동기] ComfyUI 기반 배경 생성 최적화 폴링
   */
  async makeBackgroundComfyUIAsync(prompt, imageBase64, positivePrompt = '', negativePrompt = '') {
    return this._pollJobAsync('/model/makebgimagecomfyui/jobs', {
      prompt,
      image_base64: imageBase64,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined,
    }, '[ComfyUI-MakeBg]');
  }

  /**
   * [비동기] VLM + GPT + ComfyUI 통합 생성 폴링
   */
  async generateVlmGptImageAsync(prompt, imageBase64, positivePrompt = '', negativePrompt = '') {
    return this._pollJobAsync('/model/generate_vlm_gpt_image/jobs', {
      prompt,
      image_base64: imageBase64,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined,
    }, '[VLM-GPT-Gen]');
  }

  /**
   * 하위 호환을 위해 기존 메서드명을 유지하되 내부적으로 ComfyUI 비동기 방식을 사용하도록 합니다.
   */
  async generateImage(prompt, positivePrompt = '', negativePrompt = '') {
    return this.generateImageComfyUIAsync(prompt, positivePrompt, negativePrompt);
  }

  /**
   * 하위 호환을 위해 기존 메서드명을 유지하되 내부적으로 ComfyUI 비동기 방식을 사용하도록 합니다.
   */
  async changeImage(prompt, imageBase64, strength = 0.45, positivePrompt = '', negativePrompt = '') {
    return this.changeImageComfyUIAsync(prompt, imageBase64, strength, positivePrompt, negativePrompt);
  }

  /**
   * [동기] 이미지 변환 (레거시)
   */
  async changeImageSync(prompt, imageBase64, strength = 0.75, positivePrompt = '', negativePrompt = '') {
    const urlPath = '/model/changeimage_sync';
    const body = {
      prompt,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined,
      image_base64: imageBase64,
      strength,
    }; 

    try {
      const response = await this.apiClient.post(urlPath, body, {
        responseType: 'blob',
        timeout: IMAGE_CHANGE_TIMEOUT_MS,
      });

      if (response.data instanceof Blob && !response.data.type?.startsWith('image/')) {
        const text = await response.data.text();
        return { ok: false, error: text.slice(0, 100) };
      }

      return {
        ok: true,
        blobUrl: URL.createObjectURL(response.data),
      };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
<<<<<<< Updated upstream

  // 기본적으로 하위 호환을 위해 기존 메서드 유지
  async changeImage(prompt, imageBase64, strength = 0.75, positivePrompt = '', negativePrompt = '') {
    return this.changeImageComfyUIAsync(prompt, imageBase64, strength, positivePrompt, negativePrompt);
  }

  /**
   * [비동기] ComfyUI 기반 이미지 변형 폴링
   */
  async changeImageComfyUIAsync(prompt, imageBase64, strength = 0.45, positivePrompt = '', negativePrompt = '') {
    return this._pollJobAsync('/model/changeimagecomfyui/jobs', {
      prompt,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined,
      image_base64: imageBase64,
      strength,
    }, '[ComfyUI-Change]');
  }
=======
>>>>>>> Stashed changes
}

export const modelApi = new ModelApi();
export default ModelApi;