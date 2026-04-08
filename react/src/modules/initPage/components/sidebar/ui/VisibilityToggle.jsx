import React from 'react';

/**
 * 레이어 표시/숨김 토글 버튼.
 * visible=true  → visuable.png (귀 막은 원숭이: 들을 수 있음 → 표시 중)
 * visible=false → blindfold.png (눈 가린 원숭이: 안 보임 → 숨김)
 */
const VisibilityToggle = ({ visible, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 transition-colors shrink-0"
    title={visible ? '숨기기' : '표시하기'}
  >
    <img
      src={visible ? '/icons/visuable.png' : '/icons/blindfold.png'}
      alt={visible ? '표시' : '숨김'}
      className="w-6 h-6 object-contain"
    />
  </button>
);

export default VisibilityToggle;