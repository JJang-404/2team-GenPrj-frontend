interface Props {
  visible: boolean;
  onToggle: () => void;
}

const VisibilityToggle = ({ visible, onToggle }: Props) => (
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
