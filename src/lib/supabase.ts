import { isAppData } from './appData';
import type { AppData } from '../types';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in?: number;
  token_type?: string;
  user: AuthUser;
}

interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: AuthUser;
}

export interface AppStateRow {
  data: AppData;
  revision: number;
  updated_at: string;
}

export interface CloudBackupSummary {
  id: string;
  revision: number;
  reason: string;
  created_at: string;
}

export type SaveCloudResult =
  | { status: 'saved'; revision: number; updated_at: string }
  | { status: 'conflict'; revision: number; updated_at: string; data: AppData };

const SESSION_KEY = 'ruang-supabase-session-v1';

const baseHeaders = () => ({
  apikey: publishableKey,
  'Content-Type': 'application/json'
});

const getErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string; error_description?: string; msg?: string; error?: string };
    return payload.message ?? payload.error_description ?? payload.msg ?? payload.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

const normalizeSession = (payload: AuthResponse): AuthSession | null => {
  if (!payload.access_token || !payload.refresh_token || !payload.user) return null;
  const expiresAt = payload.expires_at ?? Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600);
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: expiresAt,
    expires_in: payload.expires_in,
    token_type: payload.token_type,
    user: payload.user
  };
};

export const loadStoredSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
};

export const storeSession = (session: AuthSession | null) => {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const signInWithPassword = async (email: string, password: string) => {
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi.');
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: baseHeaders(), body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const session = normalizeSession((await response.json()) as AuthResponse);
  if (!session) throw new Error('Sesi login tidak diterima dari Supabase.');
  return session;
};

export const signUpWithPassword = async (email: string, password: string, displayName: string) => {
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi.');
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ email, password, data: { display_name: displayName.trim() || email.split('@')[0] } })
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const payload = (await response.json()) as AuthResponse;
  return { session: normalizeSession(payload), user: payload.user ?? null };
};

export const refreshAuthSession = async (refreshToken: string) => {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: baseHeaders(), body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const session = normalizeSession((await response.json()) as AuthResponse);
  if (!session) throw new Error('Sesi tidak dapat diperbarui.');
  return session;
};

export const getValidSession = async (stored: AuthSession | null) => {
  if (!stored) return null;
  const now = Math.floor(Date.now() / 1000);
  if (stored.expires_at > now + 90) return stored;
  return refreshAuthSession(stored.refresh_token);
};

export const signOutRemote = async (session: AuthSession) => {
  try {
    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: 'POST', headers: { ...baseHeaders(), Authorization: `Bearer ${session.access_token}` }
    });
  } finally {
    storeSession(null);
  }
};

const authorizedHeaders = (session: AuthSession, extra?: Record<string, string>) => ({
  ...baseHeaders(), Authorization: `Bearer ${session.access_token}`, ...extra
});

export const fetchCloudState = async (session: AuthSession): Promise<AppStateRow | null> => {
  const response = await fetch(`${supabaseUrl}/rest/v1/app_state?select=data,revision,updated_at&limit=1`, {
    headers: authorizedHeaders(session)
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const rows = (await response.json()) as Array<{ data: unknown; revision?: number; updated_at: string }>;
  const row = rows[0];
  if (!row) return null;
  if (!isAppData(row.data)) throw new Error('Format data cloud tidak valid atau berasal dari versi yang tidak didukung.');
  return { data: row.data, revision: Number(row.revision ?? 0), updated_at: row.updated_at };
};

export const saveCloudState = async (
  session: AuthSession,
  data: AppData,
  expectedRevision: number,
  backupReason?: string
): Promise<SaveCloudResult> => {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/save_app_state_v2`, {
    method: 'POST',
    headers: authorizedHeaders(session),
    body: JSON.stringify({
      p_data: data,
      p_expected_revision: expectedRevision,
      p_backup_reason: backupReason ?? null
    })
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const payload = (await response.json()) as Record<string, unknown>;
  const status = payload.status;
  const revision = Number(payload.revision ?? 0);
  const updatedAt = typeof payload.updated_at === 'string' ? payload.updated_at : new Date().toISOString();

  if (status === 'conflict') {
    if (!isAppData(payload.data)) throw new Error('Versi konflik dari cloud tidak valid.');
    return { status: 'conflict', revision, updated_at: updatedAt, data: payload.data };
  }
  if (status !== 'saved') throw new Error('Respons sinkronisasi cloud tidak dikenali.');
  return { status: 'saved', revision, updated_at: updatedAt };
};

export const fetchCloudBackups = async (session: AuthSession): Promise<CloudBackupSummary[]> => {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/app_state_backups?select=id,revision,reason,created_at&order=created_at.desc&limit=10`,
    { headers: authorizedHeaders(session) }
  );
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const rows = (await response.json()) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    revision: Number(row.revision ?? 0),
    reason: typeof row.reason === 'string' ? row.reason : 'Backup cloud',
    created_at: String(row.created_at)
  }));
};

export const fetchCloudBackupData = async (session: AuthSession, backupId: string): Promise<AppData> => {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/app_state_backups?id=eq.${encodeURIComponent(backupId)}&select=data&limit=1`,
    { headers: authorizedHeaders(session) }
  );
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const rows = (await response.json()) as Array<{ data: unknown }>;
  if (!rows[0] || !isAppData(rows[0].data)) throw new Error('Backup cloud tidak ditemukan atau rusak.');
  return rows[0].data;
};
