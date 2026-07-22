import { SUPABASE_SERVICE_KEY, SUPABASE_URL } from './config.ts';

const serviceHeaders = (extra?: Record<string, string>) => ({
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
  ...extra
});

const errorMessage = async (response: Response) => {
  try {
    const payload = await response.json() as Record<string, unknown>;
    return String(payload.message ?? payload.error_description ?? payload.error ?? `HTTP ${response.status}`);
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const requireUser = async (request: Request): Promise<{ id: string; email?: string }> => {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Authentication required.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: authorization }
  });
  if (!response.ok) throw new Error('Session Supabase tidak valid.');
  const user = await response.json() as { id?: string; email?: string };
  if (!user.id) throw new Error('User Supabase tidak ditemukan.');
  return { id: user.id, email: user.email };
};

export const selectRows = async <T>(table: string, query: string): Promise<T[]> => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: serviceHeaders() });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<T[]>;
};

export const insertRows = async <T>(
  table: string,
  rows: unknown,
  options?: { onConflict?: string; returnRows?: boolean }
): Promise<T[]> => {
  const params = options?.onConflict ? `?on_conflict=${encodeURIComponent(options.onConflict)}` : '';
  const prefer = [options?.onConflict ? 'resolution=merge-duplicates' : '', options?.returnRows ? 'return=representation' : 'return=minimal']
    .filter(Boolean).join(',');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    method: 'POST',
    headers: serviceHeaders({ Prefer: prefer }),
    body: JSON.stringify(rows)
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  if (!options?.returnRows) return [];
  return response.json() as Promise<T[]>;
};

export const updateRows = async <T>(table: string, query: string, patch: unknown, returnRows = false): Promise<T[]> => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: serviceHeaders({ Prefer: returnRows ? 'return=representation' : 'return=minimal' }),
    body: JSON.stringify(patch)
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return returnRows ? response.json() as Promise<T[]> : [];
};

export const deleteRows = async (table: string, query: string) => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'DELETE', headers: serviceHeaders({ Prefer: 'return=minimal' })
  });
  if (!response.ok) throw new Error(await errorMessage(response));
};
