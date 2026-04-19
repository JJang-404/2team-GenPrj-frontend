/**
 * 이미지의 평균 휘도(Luminance)를 분석하는 유틸리티
 */

/**
 * 이미지 URL을 받아 평균 밝기(휘도)를 계산하여 반환합니다.
 * @param imageUrl 분석할 이미지의 URL (Blob URL 또는 원격 URL)
 * @returns 0(완전 검정) ~ 255(완전 하양) 사이의 평균 휘도 값
 */
export async function getAverageLuminance(imageUrl: string): Promise<number> {
  if (!imageUrl) return 255; // 기본값은 밝은 배경으로 간주

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // CORS 이슈 방지
    
    img.onload = () => {
      // 1. 분석을 위한 소형 오프스크린 캔버스 생성 (성능을 위해 64x64 사용)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(255);
        return;
      }

      const size = 64;
      canvas.width = size;
      canvas.height = size;

      // 2. 이미지를 캔버스에 저해상도로 그림 (자동 평균화 효과)
      ctx.drawImage(img, 0, 0, size, size);

      // 3. 픽셀 데이터 추출
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      let totalLuminance = 0;

      // 4. 모든 픽셀의 휘도 계산 (W3C 표준 공식)
      // Luminance = 0.299*R + 0.587*G + 0.114*B
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += luminance;
      }

      // 5. 평균값 반환
      const avgLuminance = totalLuminance / (size * size);
      resolve(avgLuminance);
    };

    img.onerror = () => {
      console.warn('[imageAnalysis] 이미지 로드 실패:', imageUrl);
      resolve(255); // 실패 시 안전하게 밝은 배경 처리
    };

    img.src = imageUrl;
  });
}

/**
 * 휘도 값을 기준으로 텍스트 색상을 검정 또는 하양으로 추천합니다.
 * @param luminance 휘도 값
 * @returns '#FFFFFF' (어두운 배경일 때) 또는 '#000000' (밝은 배경일 때)
 */
export function getRecommendedTextColor(luminance: number): string {
  // 기준점은 128 (정중앙)
  return luminance < 128 ? '#FFFFFF' : '#000000';
}
