import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import type { BackgroundCandidate, EditorElement } from '../types/editor';
import { clamp, toPercent } from '../utils/editor';
import { ratioToAspectValue } from '../utils/ratio';
import { isPrimaryImageElement } from '../utils/editorFlow';

// 모든 폰트 비율의 기준이 되는 캔버스 너비
const REFERENCE_WIDTH = 580;

interface EditorCanvasProps {
  elements: EditorElement[];
  background: BackgroundCandidate | null;
  ratio?: string;
  selectedElementIds: string[];
  onSelect: (id: string | null, options?: { append?: boolean }) => void;
  onChangeElement: (id: string, patch: Partial<EditorElement>) => void;
  captureMode?: boolean;
}

type DragState =
  | {
      type: 'move';
      ids: string[];
      startX: number;
      startY: number;
      origins: Array<{ id: string; x: number; y: number }>;
    }
  | { type: 'resize'; id: string; startX: number; startY: number; width: number; height: number }
  | { type: 'rotate'; id: string };

export default function EditorCanvas({
  elements,
  background,
  ratio = '4:5',
  selectedElementIds,
  onSelect,
  onChangeElement,
  captureMode = false,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const dragState = useRef<DragState | null>(null);
  const showGeneratedImage =
    Boolean(background?.imageUrl) && background?.mode === 'ai-image';

  // 캔버스 크기 변화를 감지하여 폰트 스케일링 비율 계산
  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const currentWidth = entry.contentRect.width;
      if (currentWidth > 0) {
        setScaleFactor(currentWidth / REFERENCE_WIDTH);
      }
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragState.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const current = dragState.current;

      if (current.type === 'move') {
        const dx = toPercent(event.clientX - current.startX, rect.width);
        const dy = toPercent(event.clientY - current.startY, rect.height);
        current.origins.forEach((origin) => {
          const x = clamp(origin.x + dx, 0, 90);
          const y = clamp(origin.y + dy, 0, 90);
          onChangeElement(origin.id, { x, y });
        });
        return;
      }

      if (current.type === 'resize') {
        const width = clamp(current.width + toPercent(event.clientX - current.startX, rect.width), 6, 95);
        const height = clamp(current.height + toPercent(event.clientY - current.startY, rect.height), 6, 95);
        onChangeElement(current.id, { width, height });
        return;
      }

      const element = elements.find((item) => item.id === current.id);
      if (!element) return;
      const centerX = rect.left + (element.x / 100) * rect.width + ((element.width / 100) * rect.width) / 2;
      const centerY = rect.top + (element.y / 100) * rect.height + ((element.height / 100) * rect.height) / 2;
      const radians = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      onChangeElement(current.id, { rotation: (radians * 180) / Math.PI + 90 });
    };

    const onUp = () => {
      dragState.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [elements, onChangeElement]);

  const startMove = (event: ReactMouseEvent, element: EditorElement) => {
    if (element.locked) return;
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
      onSelect(element.id, { append: true });
      return;
    }
    const selectedIds = selectedElementIds.includes(element.id) ? selectedElementIds : [element.id];
    dragState.current = {
      type: 'move',
      ids: selectedIds,
      startX: event.clientX,
      startY: event.clientY,
      origins: elements
        .filter((item) => selectedIds.includes(item.id))
        .map((item) => ({ id: item.id, x: item.x, y: item.y })),
    };
    onSelect(element.id);
  };

  const startResize = (event: ReactMouseEvent, element: EditorElement) => {
    if (element.locked) return;
    event.stopPropagation();
    dragState.current = {
      type: 'resize',
      id: element.id,
      startX: event.clientX,
      startY: event.clientY,
      width: element.width,
      height: element.height,
    };
    onSelect(element.id);
  };

  const startRotate = (event: ReactMouseEvent, element: EditorElement) => {
    if (element.locked) return;
    event.stopPropagation();
    dragState.current = { type: 'rotate', id: element.id };
    onSelect(element.id);
  };

  return (
    <div className={`editor-stage ${captureMode ? 'editor-stage--capture' : ''}`}>
      <div
        className="editor-stage__canvas"
        style={{ aspectRatio: ratioToAspectValue(ratio) }}
        ref={canvasRef}
        onClick={() => onSelect(null)}
      >
        {background?.mode === 'pastel' && background?.colors ? (
          <div
            className="editor-stage__background-part-container"
            data-html2canvas-ignore={captureMode ? 'true' : undefined}
          >
            <div
              className="editor-stage__background-part"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: background.id.includes('topBlock') ? '100%' : '50%',
                height: background.id.includes('topBlock') ? '52%' : '100%',
                backgroundColor: background.colors[0],
              }}
            />
            <div
              className="editor-stage__background-part"
              style={{
                position: 'absolute',
                left: background.id.includes('topBlock') ? 0 : '50%',
                top: background.id.includes('topBlock') ? '52%' : 0,
                width: background.id.includes('topBlock') ? '100%' : '50%',
                height: background.id.includes('topBlock') ? '48%' : '100%',
                backgroundColor: background.colors[1],
              }}
            />
          </div>
        ) : (
          <div
            className="editor-stage__background"
            style={{ background: captureMode ? 'transparent' : (background?.cssBackground ?? '#f3f4f6') }}
            data-html2canvas-ignore={captureMode ? 'true' : undefined}
          />
        )}
        {showGeneratedImage && (
          <img
            src={background.imageUrl}
            alt={background.name}
            className="editor-stage__background-image"
            data-html2canvas-ignore={captureMode ? 'true' : undefined}
          />
        )}
        {elements
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((element) => {
            if (element.hidden) {
              return null;
            }

            const selected = selectedElementIds.includes(element.id);
            const canTransform = selected && selectedElementIds.length === 1;
            const shadowStrength = element.shadowStrength ?? 0;
            const shadow = shadowStrength
              ? `drop-shadow(0 10px ${8 + shadowStrength * 1.8}px rgba(0,0,0,${0.12 + shadowStrength / 100}))`
              : 'none';
            const base: CSSProperties = {
              left: `${element.x}%`,
              top: `${element.y}%`,
              /* 기존 코드: 텍스트 너비를 fit-content로 하여 align:center가 무시되는 증상 발생
              width: element.kind === 'text' ? 'fit-content' : `${element.width}%`,
              maxWidth: element.kind === 'text' ? `${element.width}%` : undefined,
              */
              // 이러한 증상으로 변경: 텍스트 박스에 layout width를 강제하여 내부 textAlign center가 canvas 중앙에 오도록 함
              width: `${element.width}%`,
              maxWidth: undefined,
              height: element.kind === 'text' ? 'auto' : `${element.height}%`,
              transform: `rotate(${element.rotation}deg)`,
              zIndex: element.zIndex,
              opacity: element.opacity ?? 1,
              cursor: element.locked ? 'not-allowed' : 'grab',
              filter: shadow,
            };

            const ignoreInCapture =
              captureMode && (element.kind === 'text' || element.kind === 'shape' || !isPrimaryImageElement(element));

            return (
              <div
                key={element.id}
                className={`canvas-element canvas-element--${element.kind} ${selected ? 'selected' : ''}`}
                style={base}
                data-element-id={element.id}
                data-html2canvas-ignore={ignoreInCapture ? 'true' : undefined}
                onMouseDown={(event) => startMove(event, element)}
                onClick={(event) => {
                  event.stopPropagation();
                  if (event.ctrlKey || event.metaKey) {
                    return;
                  }
                  onSelect(element.id, { append: event.ctrlKey || event.metaKey });
                }}
              >
                {element.kind === 'text' && (
                  <div
                    className={`canvas-element__text ${selected ? 'canvas-element__text--selected' : ''}`}
                    style={{
                      color: element.color,
                      /* 기존 코드 백업 (절대 px):
                      fontSize: `${element.fontSize ?? 24}px`,
                      letterSpacing: `${element.letterSpacing ?? 0}px`,
                      */
                      fontSize: `${(element.fontSize ?? 24) * scaleFactor}px`,
                      fontWeight: element.fontWeight,
                      fontFamily: element.fontFamily,
                      textAlign: element.align,
                      lineHeight: element.lineHeight,
                      letterSpacing: `${(element.letterSpacing ?? 0) * scaleFactor}px`,
                      textShadow: shadowStrength
                        ? `0 8px ${8 + shadowStrength}px rgba(0,0,0,${0.1 + shadowStrength / 120})`
                        : 'none',
                    }}
                  >
                    {element.text}
                  </div>
                )}
                {element.kind === 'shape' && (
                  <div
                    className="canvas-element__shape"
                    style={{
                      background: element.shapeCss,
                      border: element.border,
                      borderRadius: `${element.borderRadius ?? 0}px`,
                      boxShadow: shadowStrength
                        ? `0 12px ${12 + shadowStrength}px rgba(0,0,0,${0.12 + shadowStrength / 110})`
                        : 'none',
                    }}
                  />
                )}
                {element.kind === 'image' && (
                  <img
                    src={element.imageUrl}
                    alt={element.label}
                    className={`canvas-element__image ${selected ? 'canvas-element__image--selected' : ''}`}
                    draggable={false}
                    style={{ objectFit: element.imageFit ?? 'contain' }}
                  />
                )}
                {canTransform && !captureMode && (
                  <>
                    <button
                      className="canvas-handle canvas-handle--rotate"
                      onMouseDown={(event) => startRotate(event, element)}
                      type="button"
                      aria-label="rotate"
                      data-html2canvas-ignore="true"
                    />
                    <button
                      className="canvas-handle canvas-handle--resize"
                      onMouseDown={(event) => startResize(event, element)}
                      type="button"
                      aria-label="resize"
                      data-html2canvas-ignore="true"
                    />
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
