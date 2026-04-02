import type { MenuSection, ImageSlotState, CheckWave } from '../App';

export interface GenerateRequest {
  theme: '고급화' | '빈티지' | '일반';
  productInfo: string;
  storeInfo: string;
  otherInfo: string;
}

export interface GeneratedTemplate {
  cafeName: string;
  bgTopColor: string;
  bgBottomColor: string;
  checkWave?: CheckWave;
  sections: MenuSection[];
  imageSlots: Record<string, ImageSlotState>;
}

export async function generateTemplate(req: GenerateRequest): Promise<GeneratedTemplate> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    const msg = await response.text().catch(() => '');
    throw new Error(msg || '템플릿 생성에 실패했습니다.');
  }
  return response.json();
}
