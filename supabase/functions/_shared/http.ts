import { allowedOrigins, DEFAULT_APP_URL } from './config.ts';

export const corsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin')?.replace(/\/$/, '') ?? '';
  const permitted = allowedOrigins.has(origin) ? origin : [...allowedOrigins][0] ?? '';
  return {
    'Access-Control-Allow-Origin': permitted,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
};

export const jsonResponse = (request: Request, payload: unknown, status = 200) => new Response(
  JSON.stringify(payload),
  { status, headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' } }
);

export const errorResponse = (request: Request, error: unknown, status = 400) => {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return jsonResponse(request, { error: message }, status);
};

export const validateReturnTo = (value: unknown): string => {
  const fallback = DEFAULT_APP_URL || [...allowedOrigins][0];
  const raw = typeof value === 'string' && value.trim() ? value.trim() : fallback;
  if (!raw) throw new Error('APP_URL/APP_ALLOWED_ORIGINS belum dikonfigurasi.');
  const url = new URL(raw);
  if (!allowedOrigins.has(url.origin.replace(/\/$/, ''))) {
    throw new Error('Return URL tidak termasuk APP_ALLOWED_ORIGINS.');
  }
  return url.toString();
};

export const redirectWithResult = (returnTo: string | null, result: 'connected' | 'error', message?: string) => {
  const target = new URL(returnTo || DEFAULT_APP_URL || [...allowedOrigins][0]);
  target.searchParams.set('google_calendar', result);
  target.searchParams.set('open', 'calendar');
  if (message) target.searchParams.set('google_calendar_error', message.slice(0, 180));
  return Response.redirect(target.toString(), 302);
};
