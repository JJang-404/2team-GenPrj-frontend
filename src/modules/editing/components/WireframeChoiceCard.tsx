import type { CSSProperties } from 'react';
import type { BackgroundCandidate, EditorElement } from '../types/editor';
import { applyDraftLayoutVariant } from '../utils/editorFlow';
import { ratioToAspectValue } from '../utils/ratio';

interface WireframeChoiceCardProps {
  typeIndex: 0 | 1 | 2 | 3;
  elements: EditorElement[];
  background: BackgroundCandidate | null;
  ratio?: string;
  selected: boolean;
  onSelect: () => void;
}

const LAYOUT_LABELS = ['레이아웃 1', '레이아웃 2', '레이아웃 3', '레이아웃 4'];

export default function WireframeChoiceCard({
  typeIndex,
  elements,
  background,
  ratio = '4:5',
  selected,
  onSelect,
}: WireframeChoiceCardProps) {
  const variantElements = applyDraftLayoutVariant(elements, typeIndex);
  const showBg =
    (background?.mode === 'ai-image' || background?.mode === 'pastel') &&
    Boolean(background?.imageUrl);

  return (
    <button className={`choice-card ${selected ? 'active' : ''}`} onClick={onSelect}>
      <div className="choice-card__canvas" style={{ aspectRatio: ratioToAspectValue(ratio) }}>
        <div
          className="background-swatch"
          style={{ background: background?.cssBackground ?? 'transparent' }}
        >
          {showBg && (
            <img
              src={background!.imageUrl}
              alt={LAYOUT_LABELS[typeIndex]}
              className="background-swatch__image"
            />
          )}
          {variantElements
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
        <strong>{LAYOUT_LABELS[typeIndex]}</strong>
      </div>
    </button>
  );
}
