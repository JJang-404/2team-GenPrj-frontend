import axios from 'axios';
import BaseApi from './baseApi';

// Data URI에서 프리픽스를 제거하는 내부 헬퍼 (좀 더 견고한 정규식 사용)
const stripBase64Prefix = (base64Str) => {
  if (!base64Str) return '';
  // data:image/png;base64,... 형식을 찾아서 순수 base64만 추출
  const regex = /^data:image\/[a-z]+;base64,/;
  return base64Str.replace(regex, '');
};

class ModelApi extends BaseApi {
    async generateVlmGptImage(imageBase64, prompt = '', positivePrompt = '', negativePrompt = '') {
      const urlPath = '/model/generate_vlm_gpt_image';
      const body = {
        image_base64: stripBase64Prefix(imageBase64),
        prompt: prompt?.trim() || '',
        positive_prompt: positivePrompt?.trim() || '',
        negative_prompt: negativePrompt?.trim() || '',
      };
      try {
        const response = await this.apiClient.post(urlPath, body, {
          responseType: 'blob',
          timeout: 10 * 60 * 1000,
        });
        // blob을 json으로 변환
        const text = await response.data.text();
        const data = JSON.parse(text);
        if (data.result !== 'ok') {
          return { ok: false, error: data.error || '이미지 생성 실패', data };
        }
        return {
          ok: true,
          vlmText: data.vlm_text,
          positivePrompt: data.positive_prompt,
          negativePrompt: data.negative_prompt,
          imageBase64: data.image_base64,
          contentType: data.content_type,
          data,
        };
      } catch (error) {
        return { ok: false, error: error.message || '요청 실패' };
      }
    }
  // 폴링 인터벌 (밀리초)
  pollIntervalMs = 1000;

  getGatewayErrorMessage(statusCode, urlPath = '', timeoutMs = null) {
    if (statusCode === 504) {
      if (urlPath === '/model/makebgimageollama') {
        const waitMinutes = timeoutMs ? Math.floor(timeoutMs / 60000) : null;
        return waitMinutes
          ? `백그라운드생성(ollama) 요청은 프론트에서 최대 ${waitMinutes}분까지 기다리도록 설정되어 있지만, 서버 또는 게이트웨이가 그 전에 요청을 종료했습니다(504 Gateway Time-out). 서버 측 타임아웃 설정을 확인해 주세요.`
          : '백그라운드생성(ollama) 요청이 서버 또는 게이트웨이에서 시간 초과로 종료되었습니다(504 Gateway Time-out). 서버 측 타임아웃 설정을 확인해 주세요.';
      }

      return '서버 또는 게이트웨이에서 요청 처리 시간이 초과되었습니다(504 Gateway Time-out). 프론트 타임아웃이 아니라 서버 측 제한일 가능성이 큽니다.';
    }
    if (statusCode === 502) {
      return '게이트웨이 연결 오류가 발생했습니다(502 Bad Gateway). 백엔드 서버 상태 또는 프록시 연결을 확인해 주세요.';
    }

    return null;
  }

  // jobs 상태 폴링 함수
  async pollJobStatus(jobStatusPath, maxWaitMs = 30 * 60 * 1000) {
    const startTime = Date.now();

    const poll = async () => {
      try {
        const response = await this.apiClient.get(jobStatusPath, { timeout: 30000 });
        const data = response.data;
        const status = data?.status;

        if (status === 'done') {
          return { ok: true, jobId: data.job_id };
        }
        if (status === 'failed') {
          return { ok: false, error: data?.error || '작업 실패' };
        }
        if (status === 'queued' || status === 'running') {
          if (Date.now() - startTime > maxWaitMs) {
            return { ok: false, error: `최대 대기 시간 초과 (${Math.floor(maxWaitMs / 60000)}분)` };
          }
          // 대기 후 재시도
          await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
          return poll();
        }

        return { ok: false, error: `알 수 없는 상태: ${status}` };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            return { ok: false, error: '작업을 찾을 수 없습니다.' };
          }
        }
        return { ok: false, error: `폴링 오류: ${error.message}` };
      }
    };

    return poll();
  }

  // jobs 결과 조회 함수
  async fetchJobResult(resultPath) {
    try {
      const response = await this.apiClient.get(resultPath, {
        responseType: 'blob',
        timeout: 60000,
      });
      return {
        ok: true,
        blobUrl: URL.createObjectURL(response.data),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          return { ok: false, error: '작업이 아직 완료되지 않았습니다.' };
        }
        if (error.response?.status === 500) {
          const contentType = error.response.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            return { ok: false, error: error.response.data?.statusMsg || '작업 결과 오류' };
          }
          return { ok: false, error: '작업 결과 오류' };
        }
      }
      return { ok: false, error: `결과 조회 실패: ${error.message}` };
    }
  }

  async testConnection() {
    return this.get('/model/test');
  }

  // sync=true이면 _sync 엔드포인트 사용, false(기본)이면 /jobs 엔드포인트 사용
  async generateImage(prompt, positivePrompt = '', negativePrompt = '', sync = false) {
    if (sync) {
      return this._generateImageSync(prompt, positivePrompt, negativePrompt);
    }
    return this._generateImageAsync(prompt, positivePrompt, negativePrompt);
  }

  async _generateImageSync(prompt, positivePrompt = '', negativePrompt = '') {
    const queryParams = new URLSearchParams({ prompt });
    if (positivePrompt?.trim()) queryParams.set('positive_prompt', positivePrompt.trim());
    if (negativePrompt?.trim()) queryParams.set('negative_prompt', negativePrompt.trim());

    const urlPath = `/model/generate_sync?${queryParams.toString()}`;
    const imageGenerateTimeoutMs = 10 * 60 * 1000;

    try {
      const response = await this.apiClient.get(urlPath, {
        responseType: 'blob',
        timeout: imageGenerateTimeoutMs,
      });

      return {
        ok: true,
        apiUrl: this.buildUrl(urlPath),
        statusCode: response.status,
        blobUrl: URL.createObjectURL(response.data),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 시간 초과 (${imageGenerateTimeoutMs / 1000}초)` };
        }
        if (error.response) {
          const gatewayMessage = this.getGatewayErrorMessage(error.response.status, urlPath, imageGenerateTimeoutMs);
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            statusCode: error.response.status,
            error: gatewayMessage || `API 오류: ${error.response.statusText}`,
          };
        }

        if (error.request) {
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            error: this.getNetworkFailureMessage(urlPath),
          };
        }
      }

      return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 실패: ${error.message}` };
    }
  }

  async _generateImageAsync(prompt, positivePrompt = '', negativePrompt = '') {
    const createJobPath = '/model/generate/jobs';
    const imageGenerateTimeoutMs = 10 * 60 * 1000;
    const body = {
      prompt: prompt?.trim() || '',
      positive_prompt: positivePrompt?.trim() || '',
      negative_prompt: negativePrompt?.trim() || '',
    };

    try {
      // 1. Job 생성
      const createResponse = await this.apiClient.post(createJobPath, body, {
        timeout: 30000,
      });
      const jobId = createResponse.data?.job_id;

      if (!jobId) {
        return {
          ok: false,
          apiUrl: this.buildUrl(createJobPath),
          error: 'Job ID를 받지 못했습니다.',
        };
      }

      // 2. Job 상태 폴링
      const jobStatusPath = `/model/generate/jobs/${jobId}`;
      const pollResult = await this.pollJobStatus(jobStatusPath, imageGenerateTimeoutMs);

      if (!pollResult.ok) {
        return {
          ok: false,
          apiUrl: this.buildUrl(jobStatusPath),
          error: pollResult.error,
        };
      }

      // 3. 결과 조회
      const resultPath = `/model/generate/jobs/${jobId}/result`;
      const fetchResult = await this.fetchJobResult(resultPath);

      return {
        ...fetchResult,
        apiUrl: this.buildUrl(resultPath),
      };
    } catch (error) {
      return {
        ok: false,
        apiUrl: this.buildUrl(createJobPath),
        error: `비동기 요청 실패: ${error.message}`,
      };
    }
  }

  async changeImage(prompt, imageBase64, strength = 0.75, positivePrompt = '', negativePrompt = '', sync = false) {
    if (sync) {
      return this._changeImageSync(prompt, imageBase64, strength, positivePrompt, negativePrompt);
    }
    return this._changeImageAsync(prompt, imageBase64, strength, positivePrompt, negativePrompt);
  }

  async _changeImageSync(prompt, imageBase64, strength = 0.75, positivePrompt = '', negativePrompt = '') {
    const urlPath = '/model/changeimage_sync';
    const imagePromptTimeoutMs = 20 * 60 * 1000;
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
        timeout: imagePromptTimeoutMs,
      });

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
          const gatewayMessage = this.getGatewayErrorMessage(error.response.status, urlPath, imagePromptTimeoutMs);
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            statusCode: error.response.status,
            error: gatewayMessage || `API 오류: ${error.response.statusText}`,
          };
        }

        if (error.request) {
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            error: this.getNetworkFailureMessage(urlPath),
          };
        }
      }

      return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 실패: ${error.message}` };
    }
  }

  async _changeImageAsync(prompt, imageBase64, strength = 0.75, positivePrompt = '', negativePrompt = '') {
    const createJobPath = '/model/changeimage/jobs';
    const imagePromptTimeoutMs = 20 * 60 * 1000;
    const body = {
      prompt: prompt?.trim() || '',
      positive_prompt: positivePrompt?.trim() || '',
      negative_prompt: negativePrompt?.trim() || '',
      image_base64: imageBase64,
      strength,
    };

    try {
      // 1. Job 생성
      const createResponse = await this.apiClient.post(createJobPath, body, {
        timeout: 30000,
      });
      const jobId = createResponse.data?.job_id;

      if (!jobId) {
        return {
          ok: false,
          apiUrl: this.buildUrl(createJobPath),
          error: 'Job ID를 받지 못했습니다.',
        };
      }

      // 2. Job 상태 폴링
      const jobStatusPath = `/model/changeimage/jobs/${jobId}`;
      const pollResult = await this.pollJobStatus(jobStatusPath, imagePromptTimeoutMs);

      if (!pollResult.ok) {
        return {
          ok: false,
          apiUrl: this.buildUrl(jobStatusPath),
          error: pollResult.error,
        };
      }

      // 3. 결과 조회
      const resultPath = `/model/changeimage/jobs/${jobId}/result`;
      const fetchResult = await this.fetchJobResult(resultPath);

      return {
        ...fetchResult,
        apiUrl: this.buildUrl(resultPath),
      };
    } catch (error) {
      return {
        ok: false,
        apiUrl: this.buildUrl(createJobPath),
        error: `비동기 요청 실패: ${error.message}`,
      };
    }
  }

  async makeBackgroundImage(imageBase64, prompt = '', positivePrompt = '', negativePrompt = '', taskPrompt = '', sync = false) {
    if (sync) {
      return this._makeBackgroundImageSync(imageBase64, prompt, positivePrompt, negativePrompt, taskPrompt);
    }
    return this._makeBackgroundImageAsync(imageBase64, prompt, positivePrompt, negativePrompt, taskPrompt);
  }

  async _makeBackgroundImageSync(imageBase64, prompt = '', positivePrompt = '', negativePrompt = '', taskPrompt = '') {
    const urlPath = '/model/makebgimage_sync';
    const backgroundImageTimeoutMs = 20 * 60 * 1000;
    const body = {
      prompt: prompt?.trim() || undefined,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined,
      task_prompt: taskPrompt?.trim() || undefined,
      image_base64: imageBase64,
    };

    try {
      const response = await this.apiClient.post(urlPath, body, {
        responseType: 'blob',
        timeout: backgroundImageTimeoutMs,
      });

      return {
        ok: true,
        apiUrl: this.buildUrl(urlPath),
        statusCode: response.status,
        blobUrl: URL.createObjectURL(response.data),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 시간 초과 (${backgroundImageTimeoutMs}ms)` };
        }
        if (error.response) {
          const gatewayMessage = this.getGatewayErrorMessage(error.response.status, urlPath, backgroundImageTimeoutMs);
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            statusCode: error.response.status,
            error: gatewayMessage || `API 오류: ${error.response.statusText}`,
          };
        }

        if (error.request) {
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            error: this.getNetworkFailureMessage(urlPath),
          };
        }
      }

      return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 실패: ${error.message}` };
    }
  }

  async _makeBackgroundImageAsync(imageBase64, prompt = '', positivePrompt = '', negativePrompt = '', taskPrompt = '') {
    const createJobPath = '/model/makebgimage/jobs';
    const backgroundImageTimeoutMs = 20 * 60 * 1000;
    const body = {
      prompt: prompt?.trim() || '',
      positive_prompt: positivePrompt?.trim() || '',
      negative_prompt: negativePrompt?.trim() || '',
      task_prompt: taskPrompt?.trim() || '<DETAILED_CAPTION>',
      image_base64: stripBase64Prefix(imageBase64),
    };

    try {
      // 1. Job 생성
      const createResponse = await this.apiClient.post(createJobPath, body, {
        timeout: 30000,
      });
      const jobId = createResponse.data?.job_id;

      if (!jobId) {
        return {
          ok: false,
          apiUrl: this.buildUrl(createJobPath),
          error: 'Job ID를 받지 못했습니다.',
        };
      }

      // 2. Job 상태 폴링
      const jobStatusPath = `/model/makebgimage/jobs/${jobId}`;
      const pollResult = await this.pollJobStatus(jobStatusPath, backgroundImageTimeoutMs);

      if (!pollResult.ok) {
        return {
          ok: false,
          apiUrl: this.buildUrl(jobStatusPath),
          error: pollResult.error,
        };
      }

      // 3. 결과 조회
      const resultPath = `/model/makebgimage/jobs/${jobId}/result`;
      const fetchResult = await this.fetchJobResult(resultPath);

      return {
        ...fetchResult,
        apiUrl: this.buildUrl(resultPath),
      };
    } catch (error) {
      return {
        ok: false,
        apiUrl: this.buildUrl(createJobPath),
        error: `비동기 요청 실패: ${error.message}`,
      };
    }
  }

  async makeBackgroundImageOllama(imageBase64, prompt = '', positivePrompt = '', negativePrompt = '', sync = false) {
    if (sync) {
      return this._makeBackgroundImageOllamaSync(imageBase64, prompt, positivePrompt, negativePrompt);
    }
    return this._makeBackgroundImageOllamaAsync(imageBase64, prompt, positivePrompt, negativePrompt);
  }

  async generateImageComfyui(prompt = '', positivePrompt = '', negativePrompt = '', sync = false) {
    if (sync) {
      return this._generateImageComfyuiSync(prompt, positivePrompt, negativePrompt);
    }
    return this._generateImageComfyuiAsync(prompt, positivePrompt, negativePrompt);
  }

  async _generateImageComfyuiSync(prompt = '', positivePrompt = '', negativePrompt = '') {
    const queryParams = new URLSearchParams();
    if (prompt?.trim()) queryParams.set('prompt', prompt.trim());
    if (positivePrompt?.trim()) queryParams.set('positive_prompt', positivePrompt.trim());
    if (negativePrompt?.trim()) queryParams.set('negative_prompt', negativePrompt.trim());

    const queryString = queryParams.toString();
    const urlPath = queryString ? `/model/generatecomfyui_sync?${queryString}` : '/model/generatecomfyui_sync';
    const imageGenerateTimeoutMs = 10 * 60 * 1000;

    try {
      const response = await this.apiClient.get(urlPath, {
        responseType: 'blob',
        timeout: imageGenerateTimeoutMs,
      });

      return {
        ok: true,
        apiUrl: this.buildUrl(urlPath),
        statusCode: response.status,
        blobUrl: URL.createObjectURL(response.data),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 시간 초과 (${imageGenerateTimeoutMs / 1000}초)` };
        }
        if (error.response) {
          const gatewayMessage = this.getGatewayErrorMessage(error.response.status, urlPath, imageGenerateTimeoutMs);
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            statusCode: error.response.status,
            error: gatewayMessage || `API 오류: ${error.response.statusText}`,
          };
        }

        if (error.request) {
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            error: this.getNetworkFailureMessage(urlPath),
          };
        }
      }

      return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 실패: ${error.message}` };
    }
  }

  async _generateImageComfyuiAsync(prompt = '', positivePrompt = '', negativePrompt = '') {
    const createJobPath = '/model/generatecomfyui/jobs';
    const imageGenerateTimeoutMs = 10 * 60 * 1000;
    const body = {
      prompt: prompt?.trim() || '',
      positive_prompt: positivePrompt?.trim() || '',
      negative_prompt: negativePrompt?.trim() || '',
    };

    try {
      const createResponse = await this.apiClient.post(createJobPath, body, {
        timeout: 30000,
      });
      const jobId = createResponse.data?.job_id;

      if (!jobId) {
        return {
          ok: false,
          apiUrl: this.buildUrl(createJobPath),
          error: 'Job ID를 받지 못했습니다.',
        };
      }

      const jobStatusPath = `/model/generatecomfyui/jobs/${jobId}`;
      const pollResult = await this.pollJobStatus(jobStatusPath, imageGenerateTimeoutMs);

      if (!pollResult.ok) {
        return {
          ok: false,
          apiUrl: this.buildUrl(jobStatusPath),
          error: pollResult.error,
        };
      }

      const resultPath = `/model/generatecomfyui/jobs/${jobId}/result`;
      const fetchResult = await this.fetchJobResult(resultPath);

      return {
        ...fetchResult,
        apiUrl: this.buildUrl(resultPath),
      };
    } catch (error) {
      return {
        ok: false,
        apiUrl: this.buildUrl(createJobPath),
        error: `비동기 요청 실패: ${error.message}`,
      };
    }
  }

  async changeImageComfyui(prompt = '', imageBase64, strength = 0.75, positivePrompt = '', negativePrompt = '', sync = false) {
    if (sync) {
      return this._changeImageComfyuiSync(prompt, imageBase64, strength, positivePrompt, negativePrompt);
    }
    return this._changeImageComfyuiAsync(prompt, imageBase64, strength, positivePrompt, negativePrompt);
  }

  async _changeImageComfyuiSync(prompt = '', imageBase64, strength = 0.75, positivePrompt = '', negativePrompt = '') {
    const urlPath = '/model/changeimagecomfyui_sync';
    const imagePromptTimeoutMs = 20 * 60 * 1000;
    const body = {
      prompt: prompt?.trim() || undefined,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined,
      image_base64: imageBase64,
      strength,
    };

    try {
      const response = await this.apiClient.post(urlPath, body, {
        responseType: 'blob',
        timeout: imagePromptTimeoutMs,
      });

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
          const gatewayMessage = this.getGatewayErrorMessage(error.response.status, urlPath, imagePromptTimeoutMs);
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            statusCode: error.response.status,
            error: gatewayMessage || `API 오류: ${error.response.statusText}`,
          };
        }

        if (error.request) {
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            error: this.getNetworkFailureMessage(urlPath),
          };
        }
      }

      return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 실패: ${error.message}` };
    }
  }

  async _changeImageComfyuiAsync(prompt = '', imageBase64, strength = 0.75, positivePrompt = '', negativePrompt = '') {
    const createJobPath = '/model/changeimagecomfyui/jobs';
    const imagePromptTimeoutMs = 20 * 60 * 1000;
    const body = {
      prompt: prompt?.trim() || '',
      positive_prompt: positivePrompt?.trim() || '',
      negative_prompt: negativePrompt?.trim() || '',
      image_base64: imageBase64,
      strength,
    };

    try {
      const createResponse = await this.apiClient.post(createJobPath, body, {
        timeout: 30000,
      });
      const jobId = createResponse.data?.job_id;

      if (!jobId) {
        return {
          ok: false,
          apiUrl: this.buildUrl(createJobPath),
          error: 'Job ID를 받지 못했습니다.',
        };
      }

      const jobStatusPath = `/model/changeimagecomfyui/jobs/${jobId}`;
      const pollResult = await this.pollJobStatus(jobStatusPath, imagePromptTimeoutMs);

      if (!pollResult.ok) {
        return {
          ok: false,
          apiUrl: this.buildUrl(jobStatusPath),
          error: pollResult.error,
        };
      }

      const resultPath = `/model/changeimagecomfyui/jobs/${jobId}/result`;
      const fetchResult = await this.fetchJobResult(resultPath);

      return {
        ...fetchResult,
        apiUrl: this.buildUrl(resultPath),
      };
    } catch (error) {
      return {
        ok: false,
        apiUrl: this.buildUrl(createJobPath),
        error: `비동기 요청 실패: ${error.message}`,
      };
    }
  }

  async makeBackgroundImageComfyui(imageBase64, prompt = '', positivePrompt = '', negativePrompt = '', taskPrompt = '', sync = false) {
    if (sync) {
      return this._makeBackgroundImageComfyuiSync(imageBase64, prompt, positivePrompt, negativePrompt, taskPrompt);
    }
    return this._makeBackgroundImageComfyuiAsync(imageBase64, prompt, positivePrompt, negativePrompt, taskPrompt);
  }

  async _makeBackgroundImageComfyuiSync(imageBase64, prompt = '', positivePrompt = '', negativePrompt = '', taskPrompt = '') {
    const urlPath = '/model/makebgimagecomfyui_sync';
    const backgroundImageTimeoutMs = 20 * 60 * 1000;
    const body = {
      prompt: prompt?.trim() || undefined,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined,
      task_prompt: taskPrompt?.trim() || undefined,
      image_base64: imageBase64,
    };

    try {
      const response = await this.apiClient.post(urlPath, body, {
        responseType: 'blob',
        timeout: backgroundImageTimeoutMs,
      });

      return {
        ok: true,
        apiUrl: this.buildUrl(urlPath),
        statusCode: response.status,
        blobUrl: URL.createObjectURL(response.data),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 시간 초과 (${backgroundImageTimeoutMs}ms)` };
        }
        if (error.response) {
          const gatewayMessage = this.getGatewayErrorMessage(error.response.status, urlPath, backgroundImageTimeoutMs);
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            statusCode: error.response.status,
            error: gatewayMessage || `API 오류: ${error.response.statusText}`,
          };
        }

        if (error.request) {
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            error: this.getNetworkFailureMessage(urlPath),
          };
        }
      }

      return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 실패: ${error.message}` };
    }
  }

  async _makeBackgroundImageComfyuiAsync(imageBase64, prompt = '', positivePrompt = '', negativePrompt = '', taskPrompt = '') {
    const createJobPath = '/model/makebgimagecomfyui/jobs';
    const backgroundImageTimeoutMs = 20 * 60 * 1000;
    const body = {
      prompt: prompt?.trim() || '',
      positive_prompt: positivePrompt?.trim() || '',
      negative_prompt: negativePrompt?.trim() || '',
      task_prompt: taskPrompt?.trim() || '<DETAILED_CAPTION>',
      image_base64: stripBase64Prefix(imageBase64),
    };

    try {
      const createResponse = await this.apiClient.post(createJobPath, body, {
        timeout: 30000,
      });
      const jobId = createResponse.data?.job_id;

      if (!jobId) {
        return {
          ok: false,
          apiUrl: this.buildUrl(createJobPath),
          error: 'Job ID를 받지 못했습니다.',
        };
      }

      const jobStatusPath = `/model/makebgimagecomfyui/jobs/${jobId}`;
      const pollResult = await this.pollJobStatus(jobStatusPath, backgroundImageTimeoutMs);

      if (!pollResult.ok) {
        return {
          ok: false,
          apiUrl: this.buildUrl(jobStatusPath),
          error: pollResult.error,
        };
      }

      const resultPath = `/model/makebgimagecomfyui/jobs/${jobId}/result`;
      const fetchResult = await this.fetchJobResult(resultPath);

      return {
        ...fetchResult,
        apiUrl: this.buildUrl(resultPath),
      };
    } catch (error) {
      return {
        ok: false,
        apiUrl: this.buildUrl(createJobPath),
        error: `비동기 요청 실패: ${error.message}`,
      };
    }
  }

  async _makeBackgroundImageOllamaSync(imageBase64, prompt = '', positivePrompt = '', negativePrompt = '') {
    const urlPath = '/model/makebgimageollama_sync';
    const backgroundImageTimeoutMs = 10 * 60 * 1000;
    const body = {
      prompt: prompt?.trim() || undefined,
      positive_prompt: positivePrompt?.trim() || undefined,
      negative_prompt: negativePrompt?.trim() || undefined,
      image_base64: imageBase64,
    };

    try {
      const response = await this.apiClient.post(urlPath, body, {
        responseType: 'blob',
        timeout: backgroundImageTimeoutMs,
      });

      return {
        ok: true,
        apiUrl: this.buildUrl(urlPath),
        statusCode: response.status,
        blobUrl: URL.createObjectURL(response.data),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 시간 초과 (${backgroundImageTimeoutMs}ms)` };
        }
        if (error.response) {
          const gatewayMessage = this.getGatewayErrorMessage(error.response.status, urlPath, backgroundImageTimeoutMs);
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            statusCode: error.response.status,
            error: gatewayMessage || `API 오류: ${error.response.statusText}`,
          };
        }

        if (error.request) {
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            error: this.getNetworkFailureMessage(urlPath),
          };
        }
      }

      return { ok: false, apiUrl: this.buildUrl(urlPath), error: `요청 실패: ${error.message}` };
    }
  }

  async _makeBackgroundImageOllamaAsync(imageBase64, prompt = '', positivePrompt = '', negativePrompt = '') {
    const createJobPath = '/model/makebgimageollama/jobs';
    const backgroundImageTimeoutMs = 10 * 60 * 1000;
    const body = {
      prompt: prompt?.trim() || '',
      positive_prompt: positivePrompt?.trim() || '',
      negative_prompt: negativePrompt?.trim() || '',
      image_base64: stripBase64Prefix(imageBase64),
    };

    try {
      // 1. Job 생성
      const createResponse = await this.apiClient.post(createJobPath, body, {
        timeout: 30000,
      });
      const jobId = createResponse.data?.job_id;

      if (!jobId) {
        return {
          ok: false,
          apiUrl: this.buildUrl(createJobPath),
          error: 'Job ID를 받지 못했습니다.',
        };
      }

      // 2. Job 상태 폴링
      const jobStatusPath = `/model/makebgimageollama/jobs/${jobId}`;
      const pollResult = await this.pollJobStatus(jobStatusPath, backgroundImageTimeoutMs);

      if (!pollResult.ok) {
        return {
          ok: false,
          apiUrl: this.buildUrl(jobStatusPath),
          error: pollResult.error,
        };
      }

      // 3. 결과 조회
      const resultPath = `/model/makebgimageollama/jobs/${jobId}/result`;
      const fetchResult = await this.fetchJobResult(resultPath);

      return {
        ...fetchResult,
        apiUrl: this.buildUrl(resultPath),
      };
    } catch (error) {
      return {
        ok: false,
        apiUrl: this.buildUrl(createJobPath),
        error: `비동기 요청 실패: ${error.message}`,
      };
    }
  }

  async changeImageComfyUIOptAsync({
    opt,
    prompt = '',
    positive_prompt = '',
    negative_prompt = '',
    image_base64,
    strength = 0.9,
  } = {}) {
    const createJobPath = '/model/changeimagecomfyui_opt/jobs';
    const imagePromptTimeoutMs = 10 * 60 * 1000;
    const body = {
      opt,
      prompt: prompt?.trim() || '',
      positive_prompt: positive_prompt?.trim() || '',
      negative_prompt: negative_prompt?.trim() || '',
      image_base64: stripBase64Prefix(image_base64),
      strength,
    };

    try {
      const createResponse = await this.apiClient.post(createJobPath, body, {
        timeout: 2 * 60 * 1000,
      });
      const jobId = createResponse.data?.job_id;

      if (!jobId) {
        return {
          ok: false,
          apiUrl: this.buildUrl(createJobPath),
          error: 'Job ID를 받지 못했습니다.',
        };
      }

      const jobStatusPath = `/model/changeimagecomfyui_opt/jobs/${jobId}`;
      const pollResult = await this.pollJobStatus(jobStatusPath, imagePromptTimeoutMs);

      if (!pollResult.ok) {
        return {
          ok: false,
          apiUrl: this.buildUrl(jobStatusPath),
          error: pollResult.error,
        };
      }

      const resultPath = `/model/changeimagecomfyui_opt/jobs/${jobId}/result`;
      const fetchResult = await this.fetchJobResult(resultPath);
      return {
        ...fetchResult,
        apiUrl: this.buildUrl(resultPath),
      };
    } catch (error) {
      return {
        ok: false,
        apiUrl: this.buildUrl(createJobPath),
        error: `비동기 요청 실패: ${error.message}`,
      };
    }
  }
}

export const modelApi = new ModelApi();
export default ModelApi;