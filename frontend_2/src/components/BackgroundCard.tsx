import type { CSSProperties } from 'react';
import type { BackgroundCandidate, EditorElement } from '../types/editor';

interface BackgroundCardProps {
  background: BackgroundCandidate;
  elements: EditorElement[];
  selected: boolean;
  onSelect: () => void;
}

export default function BackgroundCard({ background, elements, selected, onSelect }: BackgroundCardProps) {
  return (
    <button className={`choice-card ${selected ? 'active' : ''}`} onClick={onSelect}>
      <div className="choice-card__canvas">
        <div className="background-swatch" style={{ background: background.cssBackground }}>
          {background.imageUrl && (
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
                top: `${element.y}%`,
                width: `${element.width}%`,
                height: `${element.height}%`,
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
                      fontSize: `${element.fontSize ?? 24}px`,
                      fontWeight: element.fontWeight,
                      fontFamily: element.fontFamily,
                      textAlign: element.align,
                      lineHeight: element.lineHeight,
                      letterSpacing: `${element.letterSpacing ?? 0}px`,
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
