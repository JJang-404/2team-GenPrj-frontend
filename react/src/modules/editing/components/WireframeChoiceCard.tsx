import type { BackgroundCandidate } from '../types/api';
import type { HomeProjectData } from '../types/home';
import { ratioToAspectValue } from '../utils/ratio';
import {
  SingleLargeLayout,
  SingleCompactLayout,
  OverlapGroupLayout,
  HalfCropGroupLayout,
} from '../utils/wireframeBridge';

type LayoutComponent = (props: {
  products: unknown[];
  options: Record<string, unknown>;
  inputData: Record<string, unknown>;
  ratioStyles: Record<string, unknown>;
}) => JSX.Element;

const LAYOUTS: Record<0 | 1 | 2 | 3, LayoutComponent> = {
  0: SingleLargeLayout as unknown as LayoutComponent,
  1: SingleCompactLayout as unknown as LayoutComponent,
  2: OverlapGroupLayout as unknown as LayoutComponent,
  3: HalfCropGroupLayout as unknown as LayoutComponent,
};

const LABELS: Record<0 | 1 | 2 | 3, { title: string; note: string }> = {
  0: { title: 'Type 1 · 클래식 대형', note: '상단 로고 + 대형 단일/소수 제품' },
  1: { title: 'Type 2 · 컴팩트 헤더', note: '상단 헤더 블록 + 컴팩트 제품 배치' },
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
  const Layout = LAYOUTS[typeIndex];
  const label = LABELS[typeIndex];

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

  return (
    <button
      type="button"
      className={`choice-card ${selected ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div
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
          <div style={{ position: 'absolute', inset: 0 }}>
            <Layout
              products={products}
              options={options}
              inputData={inputData}
              ratioStyles={ratioStyles}
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
