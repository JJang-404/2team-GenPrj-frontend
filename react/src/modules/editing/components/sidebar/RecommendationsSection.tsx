import type { SidebarRecommendation } from '../../types/editor';
import SidebarBlock from './SidebarBlock';

interface RecommendationsSectionProps {
  recommendations: SidebarRecommendation[];
}

export default function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
  return (
    <SidebarBlock title="추천 기능">
      <div className="recommendations">
        {recommendations.map((recommendation) => (
          <div key={recommendation.title} className="recommendation-card">
            <strong>{recommendation.title}</strong>
            {recommendation.items.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ))}
      </div>
    </SidebarBlock>
  );
}
