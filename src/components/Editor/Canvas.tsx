import React, { useRef, useEffect, useCallback } from 'react';
import type { MenuSection, ImageSlotState, BorderLine, CheckWave } from '../../App';

interface CanvasProps {
  bgTopColor: string;
  bgBottomColor: string;
  checkWave: CheckWave;
  cafeName: string;
  cafeNamePos: { x: number; y: number };
  sections: MenuSection[];
  imageSlots: Record<string, ImageSlotState>;
  borders: BorderLine[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdatePos: (type: string, id: string, x: number, y: number) => void;
  onUpdateSize: (slotId: string, width: number, height: number) => void;
}

// SVG viewBox 기준 캔버스 크기 (비율 4:5)
const CW = 400;
const RATIO_W = 4;
const RATIO_H = 5;
const CH = Math.round(CW * RATIO_H / RATIO_W); // 500 (4:5)

function buildWavePath(amplitude: number, offsetY: number): string {
  const startY = (offsetY / 100) * CH;
  if (amplitude === 0) {
    return `M0,${startY} L${CW},${startY} L${CW},${CH} L0,${CH} Z`;
  }
  let d = `M0,${CH} L0,${startY + amplitude} `;
  for (let i = 0; i <= 60; i++) {
    const x = (i / 60) * CW;
    const y = startY + amplitude * Math.sin((i / 60) * Math.PI * 2.5);
    d += `L${x},${y} `;
  }
  d += `L${CW},${CH} Z`;
  return d;
}

const Canvas: React.FC<CanvasProps> = ({
  bgTopColor, bgBottomColor, checkWave, cafeName, cafeNamePos,
  sections, imageSlots, borders,
  selectedId, onSelect, onUpdatePos, onUpdateSize,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const dragging = useRef<{
    type: string; id: string;
    startX: number; startY: number;
    origX: number; origY: number;
  } | null>(null);

  // 리사이즈 상태 (이미지 슬롯 우하단 핸들)
  const resizing = useRef<{
    slotId: string;
    startX: number; startY: number;
    origW: number; origH: number;
  } | null>(null);

  // 드래그 시작
  const startDrag = useCallback((
    e: React.MouseEvent,
    type: string, id: string,
    origX: number, origY: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(id);
    dragging.current = { type, id, startX: e.clientX, startY: e.clientY, origX, origY };
  }, [onSelect]);

  // 리사이즈 시작
  const startResize = useCallback((
    e: React.MouseEvent,
    slotId: string, origW: number, origH: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { slotId, startX: e.clientX, startY: e.clientY, origW, origH };
  }, []);

  // 전역 mousemove/mouseup
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();

      // 리사이즈 처리
      if (resizing.current) {
        const dw = ((e.clientX - resizing.current.startX) / rect.width) * 100;
        const dh = ((e.clientY - resizing.current.startY) / rect.height) * 100;
        const newW = Math.max(5, Math.min(90, resizing.current.origW + dw));
        const newH = Math.max(5, Math.min(90, resizing.current.origH + dh));
        onUpdateSize(resizing.current.slotId, newW, newH);
        return;
      }

      // 드래그 처리
      if (dragging.current) {
        const dx = ((e.clientX - dragging.current.startX) / rect.width) * 100;
        const dy = ((e.clientY - dragging.current.startY) / rect.height) * 100;
        const newX = Math.max(0, Math.min(95, dragging.current.origX + dx));
        const newY = Math.max(0, Math.min(95, dragging.current.origY + dy));
        onUpdatePos(dragging.current.type, dragging.current.id, newX, newY);
      }
    };
    const onUp = () => { dragging.current = null; resizing.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onUpdatePos, onUpdateSize]);

  const wavePath = checkWave.enabled
    ? buildWavePath(checkWave.amplitude, checkWave.offsetY)
    : '';

  // 선택 강조 스타일
  const sel = (id: string): React.CSSProperties =>
    selectedId === id
      ? { outline: '2px dashed #e94560', outlineOffset: '3px' }
      : {};

  return (
    <div
      ref={canvasRef}
      onClick={() => onSelect(null)}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${CW} / ${CH}`,
        backgroundColor: bgTopColor,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        borderRadius: '12px',
        containerType: 'size',
        cursor: 'default',
      } as React.CSSProperties}
    >
      {/* 레이어 0 — 아래 배경색 (항상 렌더링, 물결 경계 적용) */}
      <svg
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
        width="100%" height="100%"
        viewBox={`0 0 ${CW} ${CH}`}
        preserveAspectRatio="none"
      >
        <path
          d={buildWavePath(checkWave.amplitude, checkWave.offsetY)}
          fill={bgBottomColor}
        />
      </svg>

      {/* 레이어 1 — 체커보드 물결 (SVG, 선택 시만) */}
      {checkWave.enabled && (
        <svg
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
          width="100%" height="100%"
          viewBox={`0 0 ${CW} ${CH}`}
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id="checker-pat"
              x="0" y="0"
              width={checkWave.cellSize * 2}
              height={checkWave.cellSize * 2}
              patternUnits="userSpaceOnUse"
            >
              <rect width={checkWave.cellSize} height={checkWave.cellSize} fill={checkWave.color1} />
              <rect x={checkWave.cellSize} width={checkWave.cellSize} height={checkWave.cellSize} fill={checkWave.color2} />
              <rect y={checkWave.cellSize} width={checkWave.cellSize} height={checkWave.cellSize} fill={checkWave.color2} />
              <rect x={checkWave.cellSize} y={checkWave.cellSize} width={checkWave.cellSize} height={checkWave.cellSize} fill={checkWave.color1} />
            </pattern>
            <clipPath id="wave-clip">
              <path d={wavePath} />
            </clipPath>
          </defs>
          <rect width={CW} height={CH} fill="url(#checker-pat)" clipPath="url(#wave-clip)" />
        </svg>
      )}

      {/* 레이어 2 — 굵은 선 (드래그로 Y 이동) */}
      {borders.map(border => (
        <div
          key={border.id}
          onMouseDown={e => startDrag(e, 'border', border.id, 50, border.y)}
          onClick={e => { e.stopPropagation(); onSelect(border.id); }}
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            top: `${border.y}%`,
            height: `${border.thickness}px`,
            backgroundColor: border.color,
            cursor: 'ns-resize',
            zIndex: 2,
            ...sel(border.id),
          }}
        />
      ))}

      {/* 레이어 3 — 이미지 슬롯 (드래그로 이동, 핸들로 리사이즈) */}
      {Object.entries(imageSlots).map(([slotId, slot]) => (
        <div
          key={slotId}
          onMouseDown={e => startDrag(e, 'image', slotId, slot.x, slot.y)}
          onClick={e => { e.stopPropagation(); onSelect(slotId); }}
          style={{
            position: 'absolute',
            left: `${slot.x}%`,
            top: `${slot.y}%`,
            width: `${slot.width}%`,
            height: `${slot.height}%`,
            border: selectedId === slotId
              ? '2px dashed #e94560'
              : '2px dashed rgba(224,96,96,0.45)',
            borderRadius: '8px',
            overflow: 'visible',   // 리사이즈 핸들이 바깥으로 나오도록
            cursor: 'grab',
            zIndex: 3,
            backgroundColor: 'rgba(255,245,245,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 이미지 (overflow hidden 을 별도 div 로 분리) */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '6px', overflow: 'hidden' }}>
            {slot.url
              ? <img
                  src={slot.url}
                  alt={slotId}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', opacity: (slot.opacity ?? 100) / 100 }}
                />
              : <span style={{ fontSize: '10px', color: '#e06060', textAlign: 'center', pointerEvents: 'none', lineHeight: 1.4 }}>
                  {slotId.replace('_img', '')}<br />이미지
                </span>
            }
          </div>

          {/* 리사이즈 핸들 — 선택됐을 때만 표시 */}
          {selectedId === slotId && (
            <div
              onMouseDown={e => startResize(e, slotId, slot.width, slot.height)}
              title="드래그로 크기 조정"
              style={{
                position: 'absolute',
                right: -7, bottom: -7,
                width: 14, height: 14,
                backgroundColor: '#e94560',
                border: '2px solid #fff',
                borderRadius: '3px',
                cursor: 'nwse-resize',
                zIndex: 10,
              }}
            />
          )}
        </div>
      ))}

      {/* 레이어 4 — 카페 이름 (드래그로 이동) */}
      <div
        onMouseDown={e => startDrag(e, 'cafeName', 'cafeName', cafeNamePos.x, cafeNamePos.y)}
        onClick={e => { e.stopPropagation(); onSelect('cafeName'); }}
        style={{
          position: 'absolute',
          left: `${cafeNamePos.x}%`,
          top: `${cafeNamePos.y}%`,
          transform: 'translateX(-50%)',
          cursor: 'grab',
          zIndex: 4,
          padding: '2px 8px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          ...sel('cafeName'),
        }}
      >
        <span style={{ fontSize: '6cqw', fontWeight: 'bold', color: '#e06060', display: 'block' }}>
          {cafeName}
        </span>
      </div>

      {/* 레이어 5 — 메뉴 섹션 블록 (드래그로 이동) */}
      {sections.map(section => (
        <div
          key={section.id}
          onMouseDown={e => startDrag(e, 'section', section.id, section.x, section.y)}
          onClick={e => { e.stopPropagation(); onSelect(section.id); }}
          style={{
            position: 'absolute',
            left: `${section.x}%`,
            top: `${section.y}%`,
            width: '55%',
            cursor: 'grab',
            zIndex: 4,
            padding: '6px 8px',
            borderRadius: '6px',
            ...sel(section.id),
          }}
        >
          <div style={{
            fontSize: '3.4cqw',
            fontWeight: 'bold',
            color: '#e06060',
            borderBottom: '1px solid rgba(224,96,96,0.35)',
            paddingBottom: '3px',
            marginBottom: '4px',
          }}>
            {section.title}
          </div>
          {section.items.map(item => (
            <div key={item.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '2.9cqw',
              color: '#222',
              padding: '1.5px 0',
              gap: '6px',
            }}>
              <span style={{ pointerEvents: 'none' }}>{item.name}</span>
              <span style={{ fontWeight: 'bold', color: '#e06060', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                {item.price}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Canvas;
