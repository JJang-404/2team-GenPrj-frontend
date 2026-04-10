import { useState, useEffect } from 'react';

/**
 * useImageAR — 이미지 로드 후 naturalWidth/naturalHeight 반환
 * 이미지가 없거나 로드 실패 시 null 반환
 */
export const useImageAR = (src) => {
  const [dims, setDims] = useState(null);
  useEffect(() => {
    if (!src) { setDims(null); return; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setDims({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight }); };
    img.onerror = () => { if (!cancelled) setDims(null); };
    img.src = src;
    return () => { cancelled = true; img.onload = null; img.onerror = null; };
  }, [src]);
  return dims;
};
