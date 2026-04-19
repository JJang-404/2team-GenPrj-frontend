import { useEffect } from 'react';
import type { BackgroundCandidate } from '../types/api';
import type { EditorElement } from '../types/editor-core';
import { getAverageLuminance, getRecommendedTextColor } from '../utils/imageAnalysis';

/**
 * AI 디자인 통합을 위한 커스텀 훅
 * 배경 이미지의 밝기를 분석하여 텍스트의 가독성을 위한 최적의 색상을 자동으로 설정합니다.
 * 
 * @param selectedBackground 현재 선택된 배경 개체
 * @param setElements 에디터의 요소 상태를 업데이트하는 함수
 */
export function useAiDesignSystem(
  selectedBackground: BackgroundCandidate | null,
  setElements: React.Dispatch<React.SetStateAction<EditorElement[]>>
) {
  useEffect(() => {
    if (!selectedBackground) return;

    const updateTextContrast = async () => {
      let luminance = 255; // 기본값 (밝음)
      let shouldAnalyze = true;

      // 그라데이션 및 파스텔 모드는 분석 정확도가 낮으므로 기본 밝은 배경으로 간주
      if (selectedBackground.mode === 'gradient' || selectedBackground.mode === 'pastel') {
        shouldAnalyze = false;
        luminance = 255; 
      }

      if (shouldAnalyze) {
        if (selectedBackground.imageUrl) {
          // AI 이미지 모드: 실제 픽셀 데이터 분석
          luminance = await getAverageLuminance(selectedBackground.imageUrl);
        } else if (selectedBackground.cssBackground) {
          // 단색 모드: CSS 컬러 코드 분석
          const css = selectedBackground.cssBackground.toLowerCase();
          if (css.startsWith('#')) {
            const r = parseInt(css.slice(1, 3), 16) || 0;
            const g = parseInt(css.slice(3, 5), 16) || 0;
            const b = parseInt(css.slice(5, 7), 16) || 0;
            luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          }
        }
      }

      const recommendedColor = getRecommendedTextColor(luminance);
      
      console.log(`[AI-Design-System] 배경 모드: ${selectedBackground.mode}, 휘도: ${shouldAnalyze ? luminance.toFixed(2) : '분석 생략'}, 추천 색상: ${recommendedColor}`);

      // 모든 텍스트 요소의 색상을 배경 대비에 맞춰 업데이트
      setElements((prevElements) =>
        prevElements.map((el) => {
          if (el.kind === 'text') {
            return { ...el, color: recommendedColor };
          }
          return el;
        })
      );
    };

    void updateTextContrast();
  }, [selectedBackground?.id, selectedBackground?.imageUrl, selectedBackground?.cssBackground, setElements]);
}
