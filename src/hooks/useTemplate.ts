import { useState, useCallback } from 'react';

// --- 인터페이스 정의 (Backend Schema 기반) ---
export interface TemplateArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextBlock {
  content_key: string;
  font_role: string;
  font_size: number;
  color: string;
  area: TemplateArea;
  align?: 'left' | 'center' | 'right';
}

export interface Template {
  canvas: { width: number; height: number };
  background: { type: string; color?: string; gradient_top?: string; gradient_bottom?: string };
  image_slots: Array<{ id: string; x: number; y: number; width: number; height: number; fit: string }>;
  text_blocks: Record<string, TextBlock>;
}

/**
 * useTemplate: 템플릿 레이아웃과 텍스트 데이터를 관리하는 커스텀 훅
 * @param initialTemplate 백엔드에서 가져온 초기 JSON 데이터
 * @param initialCopy 초기 텍스트 데이터 (headline, body 등)
 */
export const useTemplate = (initialTemplate: Template, initialCopy: Record<string, string>) => {
  const [template, setTemplate] = useState<Template>(initialTemplate);
  const [copyData, setCopyData] = useState<Record<string, string>>(initialCopy);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 1. 텍스트 내용 업데이트 (headline, body 등)
  const updateCopy = useCallback((key: string, value: string) => {
    setCopyData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 2. 템플릿 속성 업데이트 (위치, 크기, 색상 등)
  const updateTemplate = useCallback((id: string, field: string, value: any) => {
    setTemplate((prev) => {
      const newBlocks = { ...prev.text_blocks };
      const targetBlock = { ...newBlocks[id] };

      if (field === 'x' || field === 'y' || field === 'width' || field === 'height') {
        targetBlock.area = { ...targetBlock.area, [field]: value };
      } else {
        (targetBlock as any)[field] = value;
      }

      newBlocks[id] = targetBlock;
      return { ...prev, text_blocks: newBlocks };
    });
  }, []);

  // 3. 요소 선택
  const selectElement = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  // 4. 전체 데이터 추출 (API 전송용)
  const getPayload = () => ({
    template,
    copyData,
  });

  return {
    template,
    copyData,
    selectedId,
    updateCopy,
    updateTemplate,
    selectElement,
    getPayload,
  };
};