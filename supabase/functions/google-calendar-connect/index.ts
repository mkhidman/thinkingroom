import { GOOGLE_CLIENT_ID, GOOGLE_OAUTH_REDIRECT_URI } from '../_shared/config.ts';
import { deleteRows, insertRows, requireUser } from '../_shared/db.ts';
import { randomState, sha256Hex } from '../_shared/crypto.ts';
import { corsHeaders, errorResponse, jsonResponse, validateReturnTo } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return errorResponse(request, new Error('Method not allowed.'), 405);

  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({})) as { returnTo?: string };
    const returnTo = validateReturnTo(body.returnTo);
    const state = randomState();
    const stateHash = await sha256Hex(state);

    await deleteRows('google_calendar_oauth_states', `expires_at=lt.${encodeURIComponent(new Date().toISOString())}`);
    await insertRows('google_calendar_oauth_states', {
      state_hash: stateHash,
      user_id: user.id,
      return_to: returnTo,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString()
    });

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events.readonly',
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state
    });

    return jsonResponse(request, {
      authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    });
  } catch (error) {
    return errorResponse(request, error, 400);
  }
});
