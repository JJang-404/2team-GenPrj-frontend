import axios from 'axios';
import BaseApi from './baseApi';

class ImageApi extends BaseApi {
  async uploadImage(userId, imageFile, fileDesc = '') {
    const urlPath = '/image/upload';
    const formData = new FormData();
    formData.append('user_id', String(userId));
    formData.append('file_desc', fileDesc || '');
    formData.append('image', imageFile);

    try {
      // BaseApi 인스턴스의 기본 JSON 헤더 영향을 피하기 위해 업로드는 별도 axios 호출을 사용합니다.
      const response = await axios.post(this.buildUrl(urlPath), formData, {
        timeout: this.timeoutMs,
      });

      const responseData = response.data;
      const statusStr = responseData?.statusCode ? String(responseData.statusCode) : '';
      const ok = response.status >= 200 && response.status < 300 && statusStr !== '100';

      return {
        ok,
        apiUrl: this.buildUrl(urlPath),
        statusCode: response.status,
        requestBody: {
          user_id: userId,
          file_desc: fileDesc,
          image_name: imageFile?.name || null,
        },
        responseJson: responseData,
        data: responseData?.datalist ?? null,
        message: this.getResponseMessage(responseData, ok ? null : '이미지 업로드에 실패했습니다.'),
        error: ok ? null : this.getResponseMessage(responseData, '이미지 업로드에 실패했습니다.'),
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return {
          ok: false,
          apiUrl: this.buildUrl(urlPath),
          statusCode: error.response.status,
          error: this.getResponseMessage(error.response.data, `API 오류: ${error.response.statusText}`),
          data: error.response.data,
        };
      }

      return {
        ok: false,
        apiUrl: this.buildUrl(urlPath),
        error: `요청 실패: ${error.message}`,
      };
    }
  }

  async listImages({ userId = null, fileName = '', fileDesc = '' } = {}) {
    const urlPath = '/image/list';
    const body = {
      user_id: userId !== null && userId !== undefined && String(userId).trim() ? String(userId).trim() : null,
      file_name: fileName?.trim() || null,
      file_desc: fileDesc?.trim() || null,
    };

    try {
      const response = await axios.post(this.buildUrl(urlPath), body, {
        timeout: this.timeoutMs,
      });

      return {
        ok: response.status >= 200 && response.status < 300,
        apiUrl: this.buildUrl(urlPath),
        statusCode: response.status,
        requestBody: body,
        data: response.data,
        error: null,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const detail = error.response.data?.detail;
        const detailText = Array.isArray(detail)
          ? detail.map((item) => item?.msg || JSON.stringify(item)).join(', ')
          : typeof detail === 'string'
            ? detail
            : '';

        if (error.response.status === 422) {
          return {
            ok: false,
            apiUrl: this.buildUrl(urlPath),
            statusCode: 422,
            requestBody: body,
            error: detailText
              ? `목록 조회 검증 실패(422): ${detailText}`
              : '목록 조회 검증 실패(422): 요청 본문(user_id, file_name, file_desc)을 확인해 주세요.',
            data: error.response.data,
          };
        }

        return {
          ok: false,
          apiUrl: this.buildUrl(urlPath),
          statusCode: error.response.status,
          requestBody: body,
          error: this.getResponseMessage(error.response.data, `API 오류: ${error.response.statusText}`),
          data: error.response.data,
        };
      }

      return {
        ok: false,
        apiUrl: this.buildUrl(urlPath),
        requestBody: body,
        error: `요청 실패: ${error.message}`,
      };
    }
  }

  async getImageInfo(imageId) {
    return this.post(
      '/image/info',
      { image_id: Number(imageId) },
      '이미지 상세 조회에 실패했습니다.',
    );
  }

  async downloadImage(imageId) {
    const urlPath = '/image/download';
    const body = { image_id: Number(imageId) };

    try {
      const response = await axios.post(this.buildUrl(urlPath), body, {
        responseType: 'blob',
        timeout: this.timeoutMs,
      });
      const blobUrl = URL.createObjectURL(response.data);

      return {
        ok: true,
        apiUrl: this.buildUrl(urlPath),
        statusCode: response.status,
        requestBody: body,
        blobUrl,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return {
          ok: false,
          apiUrl: this.buildUrl(urlPath),
          statusCode: error.response.status,
          requestBody: body,
          error: `API 오류: ${error.response.statusText}`,
        };
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

export const imageApi = new ImageApi();
export default ImageApi;