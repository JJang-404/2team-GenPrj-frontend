import type { EditorElement, TemplateDefinition } from '../types/editor';

export function cloneTemplateElements(template: TemplateDefinition): EditorElement[] {
  return template.elements.map((element) => ({ ...element }));
}

export function updateElement(
  elements: EditorElement[],
  elementId: string,
  patch: Partial<EditorElement>
) {
  return elements.map((element) =>
    element.id === elementId ? { ...element, ...patch } : element
  );
}

export function updateElementsByIds(
  elements: EditorElement[],
  elementIds: string[],
  updater: (element: EditorElement) => EditorElement
) {
  const idSet = new Set(elementIds);
  return elements.map((element) => (idSet.has(element.id) ? updater(element) : element));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function toPercent(delta: number, total: number) {
  if (!total) return 0;
  return (delta / total) * 100;
}
