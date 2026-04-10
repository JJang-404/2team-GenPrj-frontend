const getStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
};

export const STORAGE_KEYS = {
  lastLoginUserId: 'auth.lastLoginUserId',
  adCopyGenerationState: 'page.adCopyGeneration',
  imageGenerationState: 'page.imageGeneration',
  imagePromptState: 'page.imagePrompt',
  imageAttachmentState: 'page.imageAttachment',
  testState: 'page.test',
  loginState: 'page.login',
  signupState: 'page.signup',
};

export const getStorageValue = (key, fallbackValue = null) => {
  try {
    const storage = getStorage();
    if (!storage) return fallbackValue;

    const value = storage.getItem(key);
    return value === null ? fallbackValue : value;
  } catch {
    return fallbackValue;
  }
};

export const setStorageValue = (key, value) => {
  try {
    const storage = getStorage();
    if (!storage) return false;

    storage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
};

export const removeStorageValue = (key) => {
  try {
    const storage = getStorage();
    if (!storage) return false;

    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const getStorageNumber = (key, fallbackValue = 0) => {
  const raw = getStorageValue(key, null);
  if (raw === null) return fallbackValue;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
};

// JSON 저장/로드 헬퍼
export const getStorageJSON = (key, fallbackValue = null) => {
  try {
    const raw = getStorageValue(key, null);
    if (raw === null) return fallbackValue;
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
};

export const setStorageJSON = (key, value) => {
  try {
    return setStorageValue(key, JSON.stringify(value));
  } catch {
    return false;
  }
};

// 로그인 사용자 ID
export const setLastLoginUserId = (userId) => setStorageValue(STORAGE_KEYS.lastLoginUserId, userId);

export const getLastLoginUserId = () => getStorageValue(STORAGE_KEYS.lastLoginUserId, '');

export const clearLastLoginUserId = () => removeStorageValue(STORAGE_KEYS.lastLoginUserId);

// 광고문구 생성 페이지 상태
export const getAdCopyGenerationState = () => {
  const defaultState = {
    inputText: '',
    tone: '',
    targetAudience: '',
    count: 3,
    mainCopy: '',
    variants: [],
  };
  return getStorageJSON(STORAGE_KEYS.adCopyGenerationState, defaultState);
};

export const setAdCopyGenerationState = (state) => {
  return setStorageJSON(STORAGE_KEYS.adCopyGenerationState, state);
};

// 이미지 생성 페이지 상태
export const getImageGenerationState = () => {
  const defaultState = {
    promptText: '',
    positivePromptText: '',
    negativePromptText: '',
    imageDataUri: '', // Base64 Data URI
  };
  return getStorageJSON(STORAGE_KEYS.imageGenerationState, defaultState);
};

export const setImageGenerationState = (state) => {
  return setStorageJSON(STORAGE_KEYS.imageGenerationState, state);
};

// Blob을 Data URI로 변환하는 헬퍼
export const blobToDataUri = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// 이미지/프롬프트 페이지 상태
export const getImagePromptState = () => {
  const defaultState = {
    promptText: '',
    positivePromptText: '',
    negativePromptText: '',
    strength: 0.75,
    uploadedImageDataUri: '', // 업로드된 원본 이미지 Data URI
    resultImageDataUri: '',   // 변환 결과 이미지 Data URI
  };
  return getStorageJSON(STORAGE_KEYS.imagePromptState, defaultState);
};

export const setImagePromptState = (state) => {
  return setStorageJSON(STORAGE_KEYS.imagePromptState, state);
};

// 이미지 첨부 페이지 상태
export const getImageAttachmentState = () => {
  const defaultState = {
    userId: getLastLoginUserId(),
    fileDesc: '',
    fileNameFilter: '',
    fileDescFilter: '',
    selectedImageId: null,
    selectedInfo: null,
    selectedImageUrl: '',
    imageList: [],
  };
  return getStorageJSON(STORAGE_KEYS.imageAttachmentState, defaultState);
};

export const setImageAttachmentState = (state) => {
  return setStorageJSON(STORAGE_KEYS.imageAttachmentState, state);
};

// 테스트 페이지 상태
export const getTestState = () => {
  const defaultState = {
    result: null,
  };
  return getStorageJSON(STORAGE_KEYS.testState, defaultState);
};

export const setTestState = (state) => {
  return setStorageJSON(STORAGE_KEYS.testState, state);
};

// 로그인 페이지 상태 (password는 절대 저장 안 함)
export const getLoginState = () => {
  const defaultState = {
    loginId: '',
  };
  return getStorageJSON(STORAGE_KEYS.loginState, defaultState);
};

export const setLoginState = (state) => {
  // password는 저장하지 않음
  const safeState = {
    loginId: state.loginId || '',
  };
  return setStorageJSON(STORAGE_KEYS.loginState, safeState);
};

// 회원가입 페이지 상태 (password는 절대 저장 안 함)
export const getSignupState = () => {
  const defaultState = {
    loginId: '',
    nickname: '',
  };
  return getStorageJSON(STORAGE_KEYS.signupState, defaultState);
};

export const setSignupState = (state) => {
  // password와 passwordConfirm은 저장하지 않음
  const safeState = {
    loginId: state.loginId || '',
    nickname: state.nickname || '',
  };
  return setStorageJSON(STORAGE_KEYS.signupState, safeState);
};