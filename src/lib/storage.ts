import { isAppData } from './appData';
import type { AppData } from '../types';

const STORAGE_KEY = 'ruang-life-os-v1';
const SYNC_META_KEY = 'ruang-sync-meta-v1';
const storageKeyFor = (userId?: string) => userId ? `${STORAGE_KEY}:user:${userId}` : STORAGE_KEY;
const syncKeyFor = (userId: string) => `${SYNC_META_KEY}:user:${userId}`;

export interface CloudSyncMeta {
  revision: number;
  dirty: boolean;
  lastSyncedAt: string | null;
}

export const loadAppData = (userId?: string): AppData | null => {
  try {
    const raw = localStorage.getItem(storageKeyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isAppData(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveAppData = (data: AppData, userId?: string): boolean => {
  try {
    localStorage.setItem(storageKeyFor(userId), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};

export const loadSyncMeta = (userId: string): CloudSyncMeta => {
  try {
    const raw = localStorage.getItem(syncKeyFor(userId));
    if (!raw) return { revision: 0, dirty: false, lastSyncedAt: null };
    const parsed = JSON.parse(raw) as Partial<CloudSyncMeta>;
    return {
      revision: Number.isFinite(parsed.revision) ? Number(parsed.revision) : 0,
      dirty: Boolean(parsed.dirty),
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null
    };
  } catch {
    return { revision: 0, dirty: false, lastSyncedAt: null };
  }
};

export const saveSyncMeta = (userId: string, meta: CloudSyncMeta): boolean => {
  try {
    localStorage.setItem(syncKeyFor(userId), JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
};

export const clearSyncMeta = (userId: string) => {
  try { localStorage.removeItem(syncKeyFor(userId)); } catch { /* Storage dapat diblokir browser. */ }
};
export const clearAppData = (userId?: string) => {
  try { localStorage.removeItem(storageKeyFor(userId)); } catch { /* Storage dapat diblokir browser. */ }
};
export const clearLegacyAppData = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage dapat diblokir browser. */ }
};
