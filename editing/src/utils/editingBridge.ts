import type { HomeProjectData } from '../types/home';
import { API_BASE } from '../config/api';

const EDITING_BRIDGE_KEY = 'adgen-editing-bridge';
const WINDOW_NAME_PREFIX = 'adgen-editing-bridge:';

export interface EditingBridgePayload {
  draftIndex?: number;
  projectData: HomeProjectData;
}

function parsePayload(raw: string | null): EditingBridgePayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as EditingBridgePayload;
    if (!parsed?.projectData) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readEditingBridgePayload() {
  const fromSession = parsePayload(sessionStorage.getItem(EDITING_BRIDGE_KEY));
  if (fromSession) {
    sessionStorage.removeItem(EDITING_BRIDGE_KEY);
    return fromSession;
  }

  if (window.name.startsWith(WINDOW_NAME_PREFIX)) {
    const raw = window.name.slice(WINDOW_NAME_PREFIX.length);
    const decoded = parsePayload(decodeURIComponent(raw));
    window.name = '';
    return decoded;
  }

  return null;
}

export async function readEditingBridgePayloadByToken(token: string) {
  const response = await fetch(`${API_BASE}/bridge/editing/${encodeURIComponent(token)}`);
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || '브리지 payload를 불러오지 못했습니다.');
  }

  return response.json() as Promise<EditingBridgePayload>;
}
