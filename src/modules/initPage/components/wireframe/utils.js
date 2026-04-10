/** 현재 bgType에서 장식 오버레이를 표시할지 여부 */
export const useDecorOverlays = (bgType) => bgType === 'AI 생성';

/** 제품을 2개씩 그룹으로 묶기 (최대 maxGroups 그룹) */
export const pairProducts = (products, maxGroups = 3) => {
  const groups = [];
  for (let i = 0; i < products.length && groups.length < maxGroups; i += 2) {
    groups.push(products.slice(i, Math.min(i + 2, products.length)));
  }
  return groups;
};
