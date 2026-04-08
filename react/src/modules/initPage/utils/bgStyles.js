/**
 * bgType에 따른 드래프트 카드 배경 인라인 스타일을 반환합니다.
 *
 * 단색       : startColor 단색 배경 — 오버레이/그라데이션 없음
 * 그라데이션 : startColor → endColor, gradientAngle(deg) 방향 선형 그라데이션
 * 다중색     : hard-stop 2색 분할 (splitDirection × splitPosition)
 * AI 생성    : null 반환 → 호출자가 CONCEPT_STYLES 클래스 사용
 *
 * @param {string} bgType
 * @param {string} startColor
 * @param {string} endColor
 * @param {object} opts - { gradientAngle, splitPosition, splitDirection }
 * @returns {React.CSSProperties|null}
 */
export const getBgStyle = (bgType, startColor, endColor, opts = {}) => {
  return getSharedBgStyle(bgType, startColor, endColor, opts);
};
import { getSharedBgStyle } from '../../../shared/backgroundStyle';
