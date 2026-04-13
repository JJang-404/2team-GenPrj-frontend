// [폰트 비율 동기화 패치 - 2026-04-13]
// WireframeChoiceCard의 텍스트 fontSize/letterSpacing은 절대 px값이라,
// Main Preview(~580px) 대비 카드 캔버스(~310px)에서 약 1.87배 크게 보이는 문제가 있었습니다.
// 이미지·배경은 % 기반이라 자동 비례하지만, 텍스트만 고정 px이었기 때문입니다.
// ResizeObserver로 카드 캔버스의 실제 너비를 측정하고, REFERENCE_CANVAS_WIDTH(580px)와의
// 비율(scaleFactor)을 구해 fontSize / letterSpacing에 곱하는 방식으로 동기화합니다.
// 자세한 분석은 doc/0413/font-scale-sync.md 참고.

import { useEffect, useRef, useState } from 'react';
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

// Main Preview 기준 캔버스 너비 (editor-stage__canvas: min(100%, 580px))
const REFERENCE_CANVAS_WIDTH = 580;

export default function WireframeChoiceCard({
  typeIndex,
  elements,
  background,
  ratio = '4:5',
  selected,
  onSelect,
}: WireframeChoiceCardProps) {
  // [추가] 카드 캔버스 DOM 참조 및 scaleFactor 상태
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(1);

  // [추가] ResizeObserver로 카드 캔버스 너비를 감지해 scaleFactor를 계산
  // 뷰포트 변화나 사이드바 토글 등으로 카드 크기가 바뀌어도 자동 재계산됩니다.
  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const cardWidth = entry.contentRect.width;
      setScaleFactor(cardWidth / REFERENCE_CANVAS_WIDTH);
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  const variantElements = applyDraftLayoutVariant(elements, typeIndex);
  const showBg =
    (background?.mode === 'ai-image' || background?.mode === 'pastel') &&
    Boolean(background?.imageUrl);

  return (
    <button className={`choice-card ${selected ? 'active' : ''}`} onClick={onSelect}>
      {/* [수정] canvasRef 연결 - scaleFactor 계산을 위한 실제 너비 측정 대상 */}
      <div
        ref={canvasRef}
        className="choice-card__canvas"
        style={{ aspectRatio: ratioToAspectValue(ratio) }}
      >
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
                      // [수정] 절대 px → scaleFactor 비례 적용
                      // Main Preview 기준 폰트 크기에 카드 캔버스 비율을 곱해 동기화합니다.
                      fontSize: `${(element.fontSize ?? 24) * scaleFactor}px`,
                      // [기존 코드 - 절대 px 고정으로 카드에서 비율이 깨지던 코드]
                      // fontSize: `${element.fontSize ?? 24}px`,
                      fontWeight: element.fontWeight,
                      fontFamily: element.fontFamily,
                      textAlign: element.align,
                      lineHeight: element.lineHeight,
                      // [수정] letterSpacing도 동일하게 scaleFactor 비례 적용
                      letterSpacing: `${(element.letterSpacing ?? 0) * scaleFactor}px`,
                      // [기존 코드 - 절대 px 고정으로 카드에서 비율이 깨지던 코드]
                      // letterSpacing: `${element.letterSpacing ?? 0}px`,
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
