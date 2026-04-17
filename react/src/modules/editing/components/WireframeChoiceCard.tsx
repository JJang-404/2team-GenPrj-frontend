import { useEffect, useRef, useState } from 'react';
import type { BackgroundCandidate } from '../types/api';
import type { HomeProjectData } from '../types/home';
import { ratioToAspectValue } from '../utils/ratio';
import { getDefaultZonePositions } from '../utils/editorFlow';
import { getDraftTypography } from '../../../shared/draftTypography';
import {
  SingleLargeLayout,
  SingleCompactLayout,
  OverlapGroupLayout,
  HalfCropGroupLayout,
} from '../utils/wireframeBridge';

interface TextStyleSet {
  store: { fontSize: number; fontWeight: number; fontFamily: string; lineHeight: number; color: string };
  slogan: { fontSize: number; fontWeight: number; fontFamily: string; lineHeight: number; color: string };
}

type LayoutComponent = (props: {
  products: unknown[];
  options: Record<string, unknown>;
  inputData: Record<string, unknown>;
  ratioStyles: Record<string, unknown>;
  zonePositions?: import('../types/home').ZonePositions;
  textStyles?: TextStyleSet;
}) => JSX.Element;

const MIN_ZONE_GAP = 7;

/** store가 항상 slogan 위에 오도록 보장 (겹침 방지) */
function ensureStoreAboveSlogan(
  zones: import('../types/home').ZonePositions,
): import('../types/home').ZonePositions {
  if (zones.slogan.y >= zones.store.y + MIN_ZONE_GAP) return zones;
  return {
    ...zones,
    slogan: { ...zones.slogan, y: zones.store.y + MIN_ZONE_GAP },
  };
}

const LAYOUTS: Record<0 | 1 | 2 | 3, LayoutComponent> = {
  0: SingleLargeLayout as unknown as LayoutComponent,
  1: SingleCompactLayout as unknown as LayoutComponent,
  2: OverlapGroupLayout as unknown as LayoutComponent,
  3: HalfCropGroupLayout as unknown as LayoutComponent,
};

// Main Preview 기준 캔버스 너비 (editor-stage__canvas: min(100%, 580px))
const REFERENCE_CANVAS_WIDTH = 580;

const LABELS: Record<0 | 1 | 2 | 3, { title: string; note: string }> = {
  0: { title: 'Type 1 · 클래식 대형', note: '상단 로고 + 대형 단일/소수 제품' },
  1: { title: 'Type 2 · 하단 헤더', note: '하단 헤더 블록 + 컴팩트 제품 배치' },
  2: { title: 'Type 3 · 오버랩 그룹', note: '겹치는 제품 그룹 + 상/하 텍스트' },
  3: { title: 'Type 4 · 하프크롭 그룹', note: '반쪽 크롭 제품 전폭 구도' },
};

interface WireframeChoiceCardProps {
  typeIndex: 0 | 1 | 2 | 3;
  projectData: HomeProjectData | null;
  /**
   * 선택된 배경 — WireframeChoiceCard가 main-preview / BackgroundCard와
   * 동일한 배경 위에서 wireframe 구도를 보여주도록 한다. null이면 투명.
   */
  background?: BackgroundCandidate | null;
  ratio?: string;
  selected: boolean;
  onSelect: () => void;
}

function getEditingRatioStyles(ratio: string) {
  const isTall = ratio === '9:16';
  const isSquare = ratio === '1:1';
  const isFiveFour = ratio === '4:5';
  return {
    isTall,
    isSquare,
    isFiveFour,
    containerPadding: isTall ? 'p-10' : isSquare ? 'p-4' : 'p-6',
    titleSize: isTall ? 'text-5xl' : isSquare ? 'text-3xl' : 'text-4xl',
  };
}

export default function WireframeChoiceCard({
  typeIndex,
  projectData,
  background = null,
  ratio = '4:5',
  selected,
  onSelect,
}: WireframeChoiceCardProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(1);

  const Layout = LAYOUTS[typeIndex];
  const label = LABELS[typeIndex];

  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const cardWidth = entry.contentRect.width;
      // Main Preview(580px) 대비 현재 카드의 너비 비율 계산
      setScaleFactor(cardWidth / REFERENCE_CANVAS_WIDTH);
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  const products = (projectData?.products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    currency: p.currency ?? '원',
    description: p.description,
    image: p.image,
    isAiGen: p.isAiGen,
    showName: p.showName,
    showPrice: p.showPrice,
    showDesc: p.showDesc,
  }));

  const options = {
    bgType: projectData?.options.bgType ?? 'AI 생성',
    brandColor: projectData?.options.brandColor ?? '#FFFFFF',
    ratio: projectData?.options.ratio ?? ratio,
  };

  const inputData = {
    storeName: projectData?.storeName ?? '',
    mainSlogan: projectData?.mainSlogan ?? '',
  };

  const ratioStyles = getEditingRatioStyles(projectData?.options.ratio ?? ratio);

  const typo = getDraftTypography(typeIndex, projectData?.options.ratio ?? ratio);
  const textStyles: TextStyleSet = {
    store: {
      fontSize: typo.storeSize,
      fontWeight: 900,
      fontFamily: '"ZenSerif", serif',
      lineHeight: typo.storeLineHeight,
      color: projectData?.options.brandColor || '#000000',
    },
    slogan: {
      fontSize: typo.sloganSize,
      fontWeight: 900,
      fontFamily: '"ZenSerif", serif',
      lineHeight: typo.sloganLineHeight,
      color: '#000000',
    },
  };

  return (
    <button
      type="button"
      className={`choice-card ${selected ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div
        ref={canvasRef}
        className="choice-card__canvas"
        style={{ aspectRatio: ratioToAspectValue(projectData?.options.ratio ?? ratio) }}
      >
        <div
          className="background-swatch"
          style={{ background: background?.cssBackground ?? 'transparent' }}
        >
          {background &&
            (background.mode === 'ai-image' || background.mode === 'pastel') &&
            background.imageUrl && (
              <img
                src={background.imageUrl}
                alt={background.name}
                className="background-swatch__image"
              />
            )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              // scaleFactor를 이용해 내부 Tailwind 레이아웃(텍스트 크기 등)을 메인 프리뷰와 동일 비율로 축소
              transform: `scale(${scaleFactor})`,
              transformOrigin: 'top left',
              width: `${100 / scaleFactor}%`,
              height: `${100 / scaleFactor}%`,
            }}
          >
            <Layout
              products={products}
              options={options}
              inputData={inputData}
              ratioStyles={ratioStyles}
              zonePositions={ensureStoreAboveSlogan(getDefaultZonePositions(typeIndex))}
              textStyles={textStyles}
            />
          </div>
        </div>
      </div>
      <div className="choice-card__meta">
        <strong>{label.title}</strong>
        <span>{label.note}</span>
      </div>
    </button>
  );
}
