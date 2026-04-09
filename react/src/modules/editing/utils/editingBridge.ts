import type { HomeProjectData } from '../types/home';

const EDITING_BRIDGE_KEY = 'adgen-editing-bridge';
const WINDOW_NAME_PREFIX = 'adgen-editing-bridge:';

// ─── IndexedDB 헬퍼 (읽기 전용) ──────────────────────────────────────────────
const IDB_DB_NAME = 'adgen-bridge-db';
const IDB_STORE_NAME = 'editing-bridge';
const IDB_PAYLOAD_KEY = 'latest';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: IDBValidKey): Promise<T | null> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readonly');
    const req = tx.objectStore(IDB_STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: IDBValidKey): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    tx.objectStore(IDB_STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── 페이로드 파싱 ───────────────────────────────────────────────────────────

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

// ─── 페이로드 읽기 ───────────────────────────────────────────────────────────

/**
 * 우선순위:
 * 1. URL ?token= → 백엔드 API
 * 2. IndexedDB (백엔드 장애 시 폴백 — 5MB 제한 없음)
 * 3. sessionStorage (소용량 마지막 수단)
 * 4. window.name 인코딩
 */
export async function readEditingBridgePayload(): Promise<EditingBridgePayload | null> {
  // 1. 백엔드 토큰
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (token) {
    try {
      const response = await fetch(`/api/bridge/editing/${token}`);
      if (response.ok) {
        const payload = await response.json();
        window.history.replaceState({}, '', window.location.pathname);
        return payload as EditingBridgePayload;
      }
    } catch (error) {
      console.error('브리지 토큰 데이터 가져오기 실패:', error);
    }
  }

  // 2. IndexedDB 폴백
  try {
    const fromIdb = await idbGet<EditingBridgePayload>(IDB_PAYLOAD_KEY);
    if (fromIdb?.projectData) {
      await idbDelete(IDB_PAYLOAD_KEY);
      return fromIdb;
    }
  } catch (idbError) {
    console.warn('IndexedDB 읽기 실패:', idbError);
  }

  // 3. sessionStorage 폴백
  const fromSession = parsePayload(sessionStorage.getItem(EDITING_BRIDGE_KEY));
  if (fromSession) {
    sessionStorage.removeItem(EDITING_BRIDGE_KEY);
    return fromSession;
  }

  // 4. window.name 폴백
  if (window.name.startsWith(WINDOW_NAME_PREFIX)) {
    const raw = window.name.slice(WINDOW_NAME_PREFIX.length);
    const decoded = parsePayload(decodeURIComponent(raw));
    window.name = '';
    return decoded;
  }

  return null;
}
