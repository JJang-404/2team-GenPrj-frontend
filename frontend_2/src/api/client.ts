import { API_BASE } from '../config/api';
import type {
  BootstrapResponse,
  GenerateBackgroundRequest,
  GenerateBackgroundResponse,
  RemoveBackgroundResponse,
} from '../types/editor';

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || '요청 처리에 실패했습니다.');
  }
  return response.json() as Promise<T>;
}

export function fetchBootstrap() {
  return readJson<BootstrapResponse>(`${API_BASE}/editor/bootstrap`);
}

export function generateBackgrounds(payload: GenerateBackgroundRequest) {
  return readJson<GenerateBackgroundResponse>(`${API_BASE}/backgrounds/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function removeBackgroundImage(imageDataUrl: string) {
  return readJson<RemoveBackgroundResponse>(`${API_BASE}/images/remove-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl }),
  });
}
