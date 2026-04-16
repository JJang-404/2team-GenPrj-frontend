import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BackgroundCandidate, EditorElement } from '../types/editor';
import { ratioToAspectValue } from '../utils/ratio';

// 모든 폰트 비율의 기준이 되는 캔버스 너비
const REFERENCE_WIDTH = 580;

interface BackgroundCardProps {
  background: BackgroundCandidate;
  elements: EditorElement[];
  ratio?: string;
  selected: boolean;
  onSelect: () => void;
}

export default function BackgroundCard({
  background,
  elements,
  ratio = '4:5',
  selected,
  onSelect,
}: BackgroundCardProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const showGeneratedImage =
    (background.mode === 'ai-image' || background.mode === 'pastel') && Boolean(background.imageUrl);

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

  return (
    <button className={`choice-card ${selected ? 'active' : ''}`} onClick={onSelect}>
      <div
        ref={canvasRef}
        className="choice-card__canvas"
        style={{ aspectRatio: ratioToAspectValue(ratio) }}
      >
        <div className="background-swatch" style={{ background: background.cssBackground }}>
          {showGeneratedImage && (
            <img
              src={background.imageUrl}
              alt={background.name}
              className="background-swatch__image"
            />
          )}
          {elements
            .slice()
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((element) => {
              if (element.hidden) return null;

              const base: CSSProperties = {
                left: `${element.x}%`,
                top: element.yOffsetPx
                  ? `calc(${element.y}% + ${element.yOffsetPx * scaleFactor}px)`
                  : `${element.y}%`,
                /* 기존 코드 백업 (고객 요청 대응 전):
                width: `${element.width}%`,
                height: `${element.height}%`,
                */
                width: element.kind === 'text' ? 'fit-content' : `${element.width}%`,
                maxWidth: element.kind === 'text' ? `${element.width}%` : undefined,
                height: element.kind === 'text' ? 'auto' : `${element.height}%`,
                transform: `rotate(${element.rotation}deg)`,
                zIndex: element.zIndex,
                opacity: element.opacity ?? 1,
              };

              if (element.kind === 'text') {
                return (
                  <div
                    key={element.id}
                    className="poster-preview__text"
                    style={{
                      ...base,
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
                    }}
                  >
                    {element.text}
                  </div>
                );
              }

              if (element.kind === 'shape') {
                return (
                  <div
                    key={element.id}
                    className="poster-preview__shape"
                    style={{
                      ...base,
                      background: element.shapeCss,
                      border: element.border,
                      borderRadius: `${element.borderRadius ?? 0}px`,
                    }}
                  />
                );
              }

              return (
                <img
                  key={element.id}
                  src={element.imageUrl}
                  alt={element.label}
                  className="poster-preview__image"
                  style={{
                    ...base,
                    objectFit: element.imageFit ?? 'contain',
                  }}
                />
              );
            })}
        </div>
      </div>
      <div className="choice-card__meta">
        <strong>{background.name}</strong>
        <span>{background.note}</span>
      </div>
    </button>
  );
}
