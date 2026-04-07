import { useState } from 'react';
import {
  DEFAULT_OPTIONS,
  DEFAULT_BASIC_INFO,
  DEFAULT_EXTRA_INFO,
  BG_TYPE_TO_CONCEPT,
} from '../constants/design';
import type { InitOptions, InitBasicInfo, InitExtraInfo } from '../types';

export function useDesignOptions() {
  const [options, setOptions] = useState<InitOptions>(DEFAULT_OPTIONS);
  const [basicInfo, setBasicInfo] = useState<InitBasicInfo>(DEFAULT_BASIC_INFO);
  const [extraInfo, setExtraInfo] = useState<InitExtraInfo>(DEFAULT_EXTRA_INFO);

  const updateOption = <K extends keyof InitOptions>(key: K, value: InitOptions[K]) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'bgType' && typeof value === 'string') {
        next.concept = BG_TYPE_TO_CONCEPT[value] ?? prev.concept;
      }
      return next;
    });
  };

  const updateBasicInfo = <K extends keyof InitBasicInfo>(key: K, value: InitBasicInfo[K]) =>
    setBasicInfo((prev) => ({ ...prev, [key]: value }));

  const updateExtraInfo = <K extends keyof InitExtraInfo>(key: K, value: InitExtraInfo[K]) =>
    setExtraInfo((prev) => ({ ...prev, [key]: value }));

  const inputData = {
    storeName: basicInfo.storeName,
    mainSlogan: basicInfo.storeDesc,
  };

  return { options, basicInfo, extraInfo, inputData, updateOption, updateBasicInfo, updateExtraInfo };
}
