import { useEffect, useRef } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import type { BackgroundCandidate, EditorElement } from '../types/editor';
import { clamp, toPercent } from '../utils/editor';

interface EditorCanvasProps {
  elements: EditorElement[];
  background: BackgroundCandidate | null;
  selectedElementId: string | null;
  onSelect: (id: string | null) => void;
  onChangeElement: (id: string, patch: Partial<EditorElement>) => void;
  captureMode?: boolean;
}

type DragState =
  | { type: 'move'; id: string; startX: number; startY: number; x: number; y: number }
  | { type: 'resize'; id: string; startX: number; startY: number; width: number; height: number }
  | { type: 'rotate'; id: string };

export default function EditorCanvas({
  elements,
  background,
  selectedElementId,
  onSelect,
  onChangeElement,
  captureMode = false,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);
  const showGeneratedImage = background?.mode === 'ai-image' && Boolean(background.imageUrl);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragState.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const current = dragState.current;

      if (current.type === 'move') {
        const x = clamp(current.x + toPercent(event.clientX - current.startX, rect.width), 0, 90);
        const y = clamp(current.y + toPercent(event.clientY - current.startY, rect.height), 0, 90);
        onChangeElement(current.id, { x, y });
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
    dragState.current = {
      type: 'move',
      id: element.id,
      startX: event.clientX,
      startY: event.clientY,
      x: element.x,
      y: element.y,
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
      <div className="editor-stage__canvas" ref={canvasRef} onClick={() => onSelect(null)}>
        {!captureMode && (
          <div
            className="editor-stage__background"
            style={{ background: background?.cssBackground ?? '#f3f4f6' }}
          />
        )}
        {!captureMode && showGeneratedImage && (
          <img
            src={background.imageUrl}
            alt={background.name}
            className="editor-stage__background-image"
          />
        )}
        {elements
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((element) => {
            if (element.hidden) {
              return null;
            }

            const selected = selectedElementId === element.id;
            const shadowStrength = element.shadowStrength ?? 0;
            const shadow = shadowStrength
              ? `drop-shadow(0 10px ${8 + shadowStrength * 1.8}px rgba(0,0,0,${0.12 + shadowStrength / 100}))`
              : 'none';
            const base: CSSProperties = {
              left: `${element.x}%`,
              top: `${element.y}%`,
              width: `${element.width}%`,
              height: `${element.height}%`,
              transform: `rotate(${element.rotation}deg)`,
              zIndex: element.zIndex,
              opacity: element.opacity ?? 1,
              cursor: element.locked ? 'not-allowed' : 'grab',
              filter: shadow,
            };

            return (
              <div
                key={element.id}
                className={`canvas-element ${selected ? 'selected' : ''}`}
                style={base}
                onMouseDown={(event) => startMove(event, element)}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(element.id);
                }}
              >
                {element.kind === 'text' && (
                  <div
                    className="canvas-element__text"
                    style={{
                      color: element.color,
                      fontSize: `${element.fontSize ?? 24}px`,
                      fontWeight: element.fontWeight,
                      fontFamily: element.fontFamily,
                      textAlign: element.align,
                      lineHeight: element.lineHeight,
                      letterSpacing: `${element.letterSpacing ?? 0}px`,
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
                    className="canvas-element__image"
                    draggable={false}
                    style={{ objectFit: element.imageFit ?? 'contain' }}
                  />
                )}
                {selected && !captureMode && (
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
