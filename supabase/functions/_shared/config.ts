// Shared environment configuration for Ruang Google Calendar Edge Functions.

const readJsonSecret = (name: string): string => {
  const raw = Deno.env.get(name);
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return Object.values(parsed).find(Boolean) ?? '';
  } catch {
    return '';
  }
};

export const requireEnv = (name: string): string => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing Edge Function secret: ${name}`);
  return value;
};

export const SUPABASE_URL = requireEnv('SUPABASE_URL').replace(/\/$/, '');
export const SUPABASE_SERVICE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
  || Deno.env.get('SUPABASE_SECRET_KEY')?.trim()
  || readJsonSecret('SUPABASE_SECRET_KEYS');

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY for Edge Functions.');
}

export const GOOGLE_CLIENT_ID = requireEnv('GOOGLE_CLIENT_ID');
export const GOOGLE_CLIENT_SECRET = requireEnv('GOOGLE_CLIENT_SECRET');
export const GOOGLE_OAUTH_REDIRECT_URI = requireEnv('GOOGLE_OAUTH_REDIRECT_URI');
export const GOOGLE_TOKEN_ENCRYPTION_KEY = requireEnv('GOOGLE_TOKEN_ENCRYPTION_KEY');

export const allowedOrigins = new Set(
  requireEnv('APP_ALLOWED_ORIGINS')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean)
);

export const DEFAULT_APP_URL = (Deno.env.get('APP_URL') ?? [...allowedOrigins][0] ?? '').replace(/\/$/, '');
