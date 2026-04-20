import BaseApi from './baseApi';
import { modelApi } from './modelApi';
import { designApi } from './designApi';
import { imageApi } from './imageApi';
import { storeInfo } from './storeInfo';
import { adverApi } from './adverApi';
import {
  EMPTY_INPUT_FALLBACK,
} from '../common/defines';
import { 
  SCENE_PROMPTS, 
  COFFEE_RELATED_KEYWORDS,
  createUniversalPositivePrompt,
  getUniversalNegativePrompt
} from '../../modules/editing/constants/prompts';

const normalizeValue = (value) => {
  const text = String(value ?? '').trim();
  return text || EMPTY_INPUT_FALLBACK;
};

class CallApi extends BaseApi {
  async buildUploadImageFile(imageBlob) {
    const targetMaxBytes = 900 * 1024;
    if (!(imageBlob instanceof Blob)) {
      throw new Error('업로드할 이미지 데이터가 올바르지 않습니다.');
    }

    if (imageBlob.size <= targetMaxBytes) {
      const mimeType = imageBlob.type || 'image/png';
      const extension = mimeType.includes('/') ? mimeType.split('/')[1] : 'png';
      return new File([imageBlob], `ai-background-${Date.now()}.${extension}`, { type: mimeType });
    }

    const bitmap = await createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    let quality = 0.88;
    let maxWidth = Math.min(bitmap.width, 1280);
    let maxHeight = Math.min(bitmap.height, 1280);

    if (bitmap.width > bitmap.height) {
      maxHeight = Math.max(1, Math.round((bitmap.height / bitmap.width) * maxWidth));
    } else {
      maxWidth = Math.max(1, Math.round((bitmap.width / bitmap.height) * maxHeight));
    }

    canvas.width = maxWidth;
    canvas.height = maxHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('이미지 압축을 위한 캔버스 컨텍스트를 가져오지 못했습니다.');
    }

    ctx.drawImage(bitmap, 0, 0, maxWidth, maxHeight);

    let compressedBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    while (compressedBlob && compressedBlob.size > targetMaxBytes && quality > 0.5) {
      quality -= 0.08;
      compressedBlob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });
    }

    const finalBlob = compressedBlob || imageBlob;
    return new File([finalBlob], `ai-background-${Date.now()}.jpg`, { type: finalBlob.type || 'image/jpeg' });
  }

  resolveUserId(userId) {
    return String(userId ?? '').trim() || 'admin';
  }

  resolveAiImageId(uploadResult) {
    const dataSources = [
      uploadResult?.data,
      uploadResult?.responseJson?.datalist,
      uploadResult?.responseJson?.data,
      uploadResult?.responseJson,
    ];

    for (const source of dataSources) {
      if (!source) continue;

      if (Array.isArray(source)) {
        for (const row of source) {
          const num = Number(row?.image_id ?? row?.id ?? row?.imageId);
          if (Number.isFinite(num) && num > 0) return num;
        }
        continue;
      }

      if (typeof source === 'object') {
        const num = Number(source.image_id ?? source.id ?? source.imageId);
        if (Number.isFinite(num) && num > 0) return num;
      }
    }

    return 0;
  }

  sanitizeOptionsForStorage(options = {}) {
    // blob URL은 브라우저 세션 한정이므로 저장 시 제거하고 ai_image_id로만 복원합니다.
    return {
      ...options,
      aiBackgroundImage: '',
    };
  }

  async resolveAiImageUpload({ userId, options, basicInfo, existingAiImageId = 0 }) {
    let aiBackgroundImage = String(options?.aiBackgroundImage ?? '').trim();

    // 배경 타입이 AI 생성인데 이미지가 없는 경우, generateBackground를 호출하여 확보합니다.
    if (!aiBackgroundImage && options?.bgType === 'AI 생성' && !existingAiImageId) {
      console.log('[CallApi] AI 배경이 비어있어 생성을 시도합니다...', basicInfo);
      const genResult = await this.generateBackground(basicInfo || {});
      if (genResult.ok && genResult.blobUrl) {
        aiBackgroundImage = genResult.blobUrl;
        console.log('[CallApi] AI 배경 생성 완료:', aiBackgroundImage);
      } else {
        console.warn('[CallApi] AI 배경 자동 생성 실패:', genResult.error);
      }
    }

    if (!aiBackgroundImage) {
      return { ok: true, aiImageId: 0, uploadResult: null };
    }

    const normalizedExistingAiImageId = Number(existingAiImageId);
    if (Number.isFinite(normalizedExistingAiImageId) && normalizedExistingAiImageId > 0) {
      // 기존 이미지가 이미 서버에 저장된 상태면 재업로드하지 않고 ID를 재사용합니다.
      return { ok: true, aiImageId: normalizedExistingAiImageId, uploadResult: null, reused: true };
    }

    try {
      const imageResponse = await fetch(aiBackgroundImage);
      if (!imageResponse.ok) {
        return {
          ok: false,
          aiImageId: 0,
          error: `AI 이미지 로딩 실패: HTTP ${imageResponse.status}`,
        };
      }

      const imageBlob = await imageResponse.blob();
      const imageFile = await this.buildUploadImageFile(imageBlob);

      const uploadResult = await imageApi.uploadImage(this.resolveUserId(userId), imageFile, 'ai-background');
      if (!uploadResult.ok) {
        return {
          ok: false,
          aiImageId: 0,
          uploadResult,
          error: uploadResult.error || 'AI 이미지 업로드에 실패했습니다.',
        };
      }

      const aiImageId = this.resolveAiImageId(uploadResult);
      if (aiImageId <= 0) {
        return {
          ok: false,
          aiImageId: 0,
          uploadResult,
          error: 'AI 이미지 업로드 응답에서 image_id를 찾지 못했습니다.',
        };
      }

      return {
        ok: true,
        aiImageId,
        uploadResult,
      };
    } catch (error) {
      return {
        ok: false,
        aiImageId: 0,
        error: `AI 이미지 업로드 준비 실패: ${error.message}`,
      };
    }
  }

  normalizeProfileId(profileId) {
    const num = Number(profileId);
    return Number.isFinite(num) && num > 0 ? num : 0;
  }

  buildDesignMetaPayload({ profileId = 0, aiImageId = 0, options, basicInfo, extraInfo, products, trigger = 'manual' }) {
    return {
      profile_id: this.normalizeProfileId(profileId),
      ai_image_id: Number(aiImageId) > 0 ? Number(aiImageId) : 0,
      trigger,
      requestedAt: new Date().toISOString(),
      // FastAPI 저장 시 바로 사용할 수 있도록 핵심 필드를 평탄화합니다.
      bgType: options?.bgType ?? '',
      colorSelection: {
        startColor: options?.startColor ?? '',
        endColor: options?.endColor ?? '',
        brandColor: options?.brandColor ?? '',
        gradientAngle: options?.gradientAngle ?? null,
        splitPosition: options?.splitPosition ?? null,
        splitDirection: options?.splitDirection ?? '',
      },
      storeName: basicInfo?.storeName ?? '',
      industry: basicInfo?.industry ?? '',
      storeDesc: basicInfo?.storeDesc ?? '',
      designMeta: {
        options,
        basicInfo,
        extraInfo,
        products,
      },
    };
  }

  async saveDesignProfile({
    userId,
    profileId = 0,
    existingAiImageId = 0,
    options,
    basicInfo,
    extraInfo,
    products,
    trigger = 'manual',
  }) {
    const resolvedUserId = this.resolveUserId(userId);
    const aiUploadResult = await this.resolveAiImageUpload({
      userId: resolvedUserId,
      options,
      basicInfo,
      existingAiImageId,
    });
    if (!aiUploadResult.ok) {
      return {
        ok: false,
        error: aiUploadResult.error,
        aiImageId: 0,
        payload: null,
      };
    }

    const payload = this.buildDesignMetaPayload({
      profileId,
      aiImageId: aiUploadResult.aiImageId,
      options: this.sanitizeOptionsForStorage(options),
      basicInfo,
      extraInfo,
      products,
      trigger,
    });

    const result = await designApi.saveDesignProfile({
      ...payload,
      user_id: resolvedUserId,
    });

    return {
      ...result,
      aiImageId: aiUploadResult.aiImageId,
      imageUpload: aiUploadResult.uploadResult,
      payload,
    };
  }

  async listDesignProfiles({ userId } = {}) {
    const result = await designApi.listDesignProfiles({ user_id: userId });

    return {
      ...result,
      user_id: String(userId ?? '').trim() || 'admin',
    };
  }

  /**
   * AI 배경 생성용 포지티브 프롬프트를 조립합니다.
   * - 업종 구분 없이 범용 고출력 템플릿에 키워드를 직접 치환하여 생성합니다. [REFACTORED]
   */
  _buildBackgroundPrompt(customPrompt = '', industry = '') {
    // 프론트엔드 단독으로 템플릿 내 플레이스홀더를 치환하여 완성된 프롬프트를 만듭니다.
    const finalPrompt = createUniversalPositivePrompt(customPrompt);
    
    console.log('[CallApi] 범용 고출력 프롬프트 조립 완료 (Industry agnostic)');
    
    return finalPrompt;
  }

  /**
   * AI 배경 생성용 네거티브 프롬프트를 반환합니다. [REFACTORED]
   */
  _buildBackgroundNegativePrompt() {
    return getUniversalNegativePrompt();
  }

  /**
   * AI 배경 이미지를 생성합니다.
   * - industry가 제공되면 업종별 최적화된 베이스 프롬프트를 적용합니다. [NEW]
   *
   * @param {{ customPrompt?: string, imageBase64?: string, industry?: string }} [options]
   */
  async generateBackground(options = {}) {
    const { customPrompt = '', imageBase64 = '', industry = '' } = options;
    const prompt = this._buildBackgroundPrompt(customPrompt, industry);
    const negativePrompt = this._buildBackgroundNegativePrompt();

    console.log('[CallApi] generateBackground 시작', imageBase64 ? '(제품 가이드 모드)' : '(텍스트 전용 모드)');
    console.log('[CallApi] 타겟 업종:', industry || '미지정');

    // 노이즈 제거(Denoising) 강도를 1.0으로 설정하여 제품 이미지를 가이드로 쓰되 배경은 100% 새로 생성 [MODIFIED]
    const result = imageBase64
      ? await modelApi.changeImage(prompt, imageBase64, 1.0, '', negativePrompt)
      : await modelApi.generateImage(prompt, '', negativePrompt);

    if (result.ok) {
      console.log('[CallApi] AI 배경 생성 성공:', result.blobUrl);
    } else {
      console.error('[CallApi] AI 배경 생성 실패:', result.error || result.statusCode);
    }

    return { ...result, prompt, negativePrompt };
  }

  /**
   * 상품 이미지를 AI모델을 사용하여 정면 뷰(Frontal View)로 변환합니다.
   * @param {string} imageUrl - 변환할 이미지의 Blob URL 또는 경로
   * @returns {Promise<Object>} 변환 결과 { ok, blobUrl, error }
   */
  async transformImageToFrontal(imageUrl) {
    console.log('[CallApi] transformImageToFrontal 시작:', imageUrl);

    try {
      // 1. 이미지 데이터를 가져와 Base64로 인코딩
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`이미지를 불러오지 못했습니다: ${response.statusText}`);
      const blob = await response.blob();

      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // 2. 요청받은 전용 프롬프트 구성
      const negativePrompt = `deformed object, warped geometry, broken handle, missing parts,
      top-down view, extreme overhead angle, distorted perspective,
      melted shape, unrealistic structure, ugly, creepy, asymmetrical,
      low quality, blurry`;


      const prompt = `A professional studio product photo of a ceramic coffee cup and saucer.
      The cup is shown from a natural front-facing product angle, slightly above eye level.
      The handle is positioned to the right side.
      Preserve the original cup design, ceramic texture, color, and proportions.
      The coffee surface is visible with natural perspective, not top-down.
      Clean composition, centered, soft lighting, plain background, high detail, photorealistic.
      This should look like a clean commercial product photo of the same object.`;


      // 3. AI 모델 서버 호출 (strength 0.3 적용하여 제품 디자인 보존) [UPDATED]
      console.log('[CallApi] AI 정면 변환 요청 중...');
      const result = await modelApi.changeImage(prompt, base64, 0.3, '', negativePrompt);

      if (result.ok) {
        console.log('[CallApi] AI 정면 변환 성공:', result.blobUrl);
      } else {
        console.error('[CallApi] AI 정면 변환 실패:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[CallApi] 정면 변환 로직 중 에러 발생:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * 저장된 가게 정보와 상품 소개문구를 기반으로 AI 광고 문구를 생성합니다.
   * @returns {Promise<Object>} 생성 결과 { ok, data, error }
   */
  async generateAdCopy() {
    const prompt = storeInfo.buildAdPrompt();
    if (!prompt) {
      return { ok: false, error: '저장된 가게 정보가 없어 프롬프트를 생성할 수 없습니다.' };
    }

    console.log('[CallApi] AI 광고 문구 생성 요청 프롬프트:\n', prompt);
    const result = await adverApi.generateAdCopy(prompt);

    return result;
  }
}

export const callApi = new CallApi();
export default CallApi;
