const VisibilityToggle = ({ visible, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 transition-colors shrink-0 text-base"
    title={visible ? '숨기기' : '표시하기'}
  >
    <span aria-hidden="true">{visible ? '🙉' : '🙈'}</span>
  </button>
);

export default VisibilityToggle;
