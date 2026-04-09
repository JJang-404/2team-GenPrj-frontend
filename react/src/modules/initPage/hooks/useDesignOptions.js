import { useState, useCallback } from 'react';
import {
  DEFAULT_OPTIONS,
  DEFAULT_BASIC_INFO,
  DEFAULT_EXTRA_INFO,
  BG_TYPE_TO_CONCEPT,
} from '../constants/design';
import { callApi } from '../../../server/api/callApi';

export const useDesignOptions = () => {
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [basicInfo, setBasicInfo] = useState(DEFAULT_BASIC_INFO);
  const [extraInfo, setExtraInfo] = useState(DEFAULT_EXTRA_INFO);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [aiImageUrl, setAiImageUrl] = useState(null);
  const [isGeneratingAiBg, setIsGeneratingAiBg] = useState(false);

  const generateAiBgImage = useCallback(async (currentBasicInfo) => {
    setIsGeneratingAiBg(true);
    setAiImageUrl(null);
    try {
      const result = await callApi.generateBackground({
        storeName: currentBasicInfo.storeName,
        industry: currentBasicInfo.industry,
        storeDesc: currentBasicInfo.storeDesc,
      });
      if (result.ok) {
        setAiImageUrl(result.blobUrl);
      }
    } catch (e) {
      console.error('[AI 배경 생성 실패]', e);
    } finally {
      setIsGeneratingAiBg(false);
    }
  }, []);

  const updateOption = (key, value) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: value };
      // bgType 변경 시 concept 동기화 (AI 생성 모드 전용 fallback)
      if (key === 'bgType') {
        next.concept = BG_TYPE_TO_CONCEPT[value] ?? prev.concept;
      }
      // brandColor 는 독립 관리 — startColor 변경 시 자동 동기화 안 함
      return next;
    });
    if (key === 'bgType' && value === 'AI 생성') {
      generateAiBgImage(basicInfo);
    }
  };

  const updateBasicInfo = (key, value) =>
    setBasicInfo((prev) => ({ ...prev, [key]: value }));

  const updateExtraInfo = (key, value) =>
    setExtraInfo((prev) => ({ ...prev, [key]: value }));

  const generateAiDesc = () => {
    setIsGeneratingDesc(true);
    setTimeout(() => {
      updateBasicInfo('storeDesc', '품격 있는 일상의 완성');
      setIsGeneratingDesc(false);
    }, 800);
  };

  /** DraftLayouts 하위 호환: storeName + mainSlogan(=storeDesc) */
  const inputData = {
    storeName: basicInfo.storeName,
    mainSlogan: basicInfo.storeDesc,
  };

  return {
    options: { ...options, aiImageUrl, isGeneratingAiBg },
    basicInfo,
    extraInfo,
    inputData,
    isGeneratingDesc,
    updateOption,
    updateBasicInfo,
    updateExtraInfo,
    generateAiDesc,
    generateAiBgImage: () => generateAiBgImage(basicInfo),
  };
};