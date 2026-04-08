import type { CSSProperties } from 'react';
import type { EditorElement, TemplateDefinition } from '../types/editor';
import { ratioToAspectValue } from '../utils/ratio';

interface TemplateCardProps {
  template: TemplateDefinition;
  elements?: EditorElement[];
  ratio?: string;
  selected: boolean;
  onSelect: () => void;
}

export default function TemplateCard({ template, elements, ratio = '4:5', selected, onSelect }: TemplateCardProps) {
  const previewElements = elements ?? template.elements;

  return (
    <button className={`choice-card ${selected ? 'active' : ''}`} onClick={onSelect}>
      <div className="choice-card__canvas" style={{ aspectRatio: ratioToAspectValue(ratio) }}>
        <div className="poster-preview poster-preview--neutral">
          {previewElements
            .slice()
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((element) => {
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
        <strong>{template.name}</strong>
        <span>{template.previewNote}</span>
      </div>
    </button>
  );
}
