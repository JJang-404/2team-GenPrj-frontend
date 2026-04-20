import type { HomeProjectData } from '../types/home';

const EDITING_BRIDGE_KEY = 'backlit-editing-bridge';
const WINDOW_NAME_PREFIX = 'backlit-editing-bridge:';

// ─── IndexedDB 헬퍼 (읽기 전용) ──────────────────────────────────────────────
const IDB_DB_NAME = 'backlit-bridge-db';
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
  projectData: HomeProjectData;
}

function parsePayload(raw: string | null): EditingBridgePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EditingBridgePayload;
    console.log(parsed);
    if (!parsed?.projectData) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ─── 페이로드 읽기 ───────────────────────────────────────────────────────────

/**
 * 우선순위:
 * 1. IndexedDB (5MB 제한 없음)
 * 2. sessionStorage (소용량 폴백)
 * 3. window.name 인코딩
 */
export async function readEditingBridgePayload(): Promise<EditingBridgePayload | null> {
  // 1. IndexedDB
  try {
    const fromIdb = await idbGet<EditingBridgePayload>(IDB_PAYLOAD_KEY);
    if (fromIdb?.projectData) {
      await idbDelete(IDB_PAYLOAD_KEY);
      return fromIdb;
    }
  } catch (idbError) {
    console.warn('IndexedDB 읽기 실패:', idbError);
  }

  // 2. sessionStorage 폴백
  const fromSession = parsePayload(sessionStorage.getItem(EDITING_BRIDGE_KEY));
  if (fromSession) {
    sessionStorage.removeItem(EDITING_BRIDGE_KEY);
    return fromSession;
  }

  // 3. window.name 폴백
  if (window.name.startsWith(WINDOW_NAME_PREFIX)) {
    const raw = window.name.slice(WINDOW_NAME_PREFIX.length);
    const decoded = parsePayload(decodeURIComponent(raw));
    window.name = '';
    return decoded;
  }

  return null;
}
