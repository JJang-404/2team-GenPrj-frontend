import type { BackgroundMode, EditorElement } from '../types/editor-core';

export const FONT_OPTIONS = [
  { label: 'Zen Serif', value: '"ZenSerif", serif' },
  { label: 'Pretendard', value: '"Pretendard Variable", "Noto Sans KR", sans-serif' },
  { label: 'Noto Sans KR', value: '"Noto Sans KR", sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Arial Black', value: '"Arial Black", "Noto Sans KR", sans-serif' },
] as const;

export function getRecommendedFontFamily(
  element: EditorElement,
  backgroundMode: BackgroundMode,
  templateId?: string | null
) {
  const normalized = `${element.id} ${element.label}`.toLowerCase();
  const isPrice = /(price|가격|summary|cta)/.test(normalized);
  const isStore = /(store|brand|가게명|브랜드명)/.test(normalized);
  const isHeadline = /(headline|title|타이틀|광고 문구|slogan|copy|subcopy)/.test(normalized);

  if (templateId === 'template-arch-premium') {
    return '"ZenSerif", serif';
  }

  if (backgroundMode === 'ai-image') {
    if (isPrice) return '"Arial Black", "Noto Sans KR", sans-serif';
    if (isStore || isHeadline) return '"ZenSerif", serif';
    return '"Noto Sans KR", sans-serif';
  }

  if (backgroundMode === 'gradient') {
    if (isStore || isHeadline) return '"ZenSerif", serif';
    return '"Pretendard Variable", "Noto Sans KR", sans-serif';
  }

  if (backgroundMode === 'pastel') {
    if (isPrice) return '"Arial Black", "Noto Sans KR", sans-serif';
    return '"Pretendard Variable", "Noto Sans KR", sans-serif';
  }

  if (isStore || isHeadline) {
    return '"ZenSerif", serif';
  }

  return '"Pretendard Variable", "Noto Sans KR", sans-serif';
}
