import React from 'react';

// --- 인터페이스 정의 ---
interface ElementProps {
  id: string;
  x: number;          // 백엔드 픽셀 좌표 (기준 너비 대비)
  y: number;          // 백엔드 픽셀 좌표 (기준 높이 대비)
  width: number;      // 요소 너비 (px)
  height: number;     // 요소 높이 (px)
  baseWidth: number;  // 캔버스 전체 기준 너비 (예: 1200)
  baseHeight: number; // 캔버스 전체 기준 높이 (예: 1600)
  isSelected: boolean;
  onClick: (id: string) => void;
  children: React.ReactNode;
  zIndex?: number;
}

/**
 * Element: 캔버스 위의 모든 개별 요소(Text, Image 등)를 감싸는 고수준 컨테이너
 */
const Element: React.FC<ElementProps> = ({
  id,
  x,
  y,
  width,
  height,
  baseWidth,
  baseHeight,
  isSelected,
  onClick,
  children,
  zIndex = 1
}) => {
  
  // 픽셀 좌표를 퍼센트로 변환하는 내부 유틸리티
  const toPct = (val: number, total: number) => `${(val / total) * 100}%`;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation(); // 부모(Canvas)의 클릭 이벤트 전파 방지
        onClick(id);
      }}
      style={{
        position: 'absolute',
        left: toPct(x, baseWidth),
        top: toPct(y, baseHeight),
        width: toPct(width, baseWidth),
        height: toPct(height, baseHeight),
        zIndex: isSelected ? 100 : zIndex, // 선택된 요소가 가장 위로 오도록
        cursor: 'pointer',
        transition: 'outline 0.15s ease-in-out',
        // 선택되었을 때만 강조하는 테두리 (에디터 전용 시각 효과)
        outline: isSelected ? '2px dashed #e94560' : 'none',
        outlineOffset: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 드래그 가능함을 알려주는 팁 (선택 시에만 노출) */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '0',
          backgroundColor: '#e94560',
          color: 'white',
          fontSize: '9px',
          padding: '2px 6px',
          borderRadius: '3px',
          whiteSpace: 'nowrap'
        }}>
          EDITING: {id.toUpperCase()}
        </div>
      )}

      {/* 실제 내용물 (Text 또는 Image) */}
      <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
        {children}
      </div>
    </div>
  );
};

export default Element;