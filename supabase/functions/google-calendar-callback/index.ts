import { encryptSecret, sha256Hex } from '../_shared/crypto.ts';
import { deleteRows, insertRows, selectRows } from '../_shared/db.ts';
import { DEFAULT_APP_URL } from '../_shared/config.ts';
import { exchangeAuthorizationCode, googleGet } from '../_shared/google.ts';
import { redirectWithResult } from '../_shared/http.ts';

interface OAuthStateRow {
  state_hash: string;
  user_id: string;
  return_to: string;
  expires_at: string;
}

interface ConnectionRow {
  refresh_token_ciphertext: string;
  google_account_email?: string;
}

interface CalendarListResponse {
  items?: Array<{ id?: string; summary?: string; primary?: boolean }>;
}

Deno.serve(async (request) => {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error');
  let returnTo: string | null = DEFAULT_APP_URL || null;

  try {
    if (!state) throw new Error('OAuth state tidak ditemukan.');
    const stateHash = await sha256Hex(state);
    const states = await selectRows<OAuthStateRow>(
      'google_calendar_oauth_states',
      `state_hash=eq.${encodeURIComponent(stateHash)}&select=state_hash,user_id,return_to,expires_at&limit=1`
    );
    const oauthState = states[0];
    if (!oauthState) throw new Error('OAuth state tidak valid atau sudah digunakan.');
    returnTo = oauthState.return_to;
    await deleteRows('google_calendar_oauth_states', `state_hash=eq.${encodeURIComponent(stateHash)}`);

    if (new Date(oauthState.expires_at).getTime() < Date.now()) throw new Error('Sesi koneksi Google sudah kedaluwarsa.');
    if (oauthError) throw new Error(oauthError === 'access_denied' ? 'Izin Google Calendar dibatalkan.' : `Google OAuth: ${oauthError}`);
    if (!code) throw new Error('Authorization code Google tidak ditemukan.');

    const token = await exchangeAuthorizationCode(code);
    const existing = await selectRows<ConnectionRow>(
      'google_calendar_connections',
      `user_id=eq.${encodeURIComponent(oauthState.user_id)}&select=refresh_token_ciphertext,google_account_email&limit=1`
    );

    const calendarList = await googleGet<CalendarListResponse>(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250&showHidden=true',
      token.access_token
    );
    const primary = calendarList.items?.find((calendar) => calendar.primary) ?? calendarList.items?.[0];
    const accountEmail = primary?.id?.includes('@') ? primary.id : primary?.summary;
    const sameGoogleAccount = Boolean(
      existing[0]
      && existing[0].google_account_email
      && accountEmail
      && existing[0].google_account_email === accountEmail
    );
    const refreshCiphertext = token.refresh_token
      ? await encryptSecret(token.refresh_token)
      : sameGoogleAccount
        ? existing[0]?.refresh_token_ciphertext
        : undefined;
    if (!refreshCiphertext) {
      throw new Error('Google tidak mengirim refresh token untuk akun ini. Cabut akses aplikasi di akun Google lalu hubungkan kembali.');
    }

    // Upsert koneksi baru lebih dulu agar kegagalan request tidak merusak
    // koneksi yang masih valid.
    await insertRows('google_calendar_connections', {
      user_id: oauthState.user_id,
      google_account_email: accountEmail ?? null,
      refresh_token_ciphertext: refreshCiphertext,
      granted_scopes: token.scope?.split(' ').filter(Boolean) ?? ['https://www.googleapis.com/auth/calendar.calendarlist.readonly', 'https://www.googleapis.com/auth/calendar.events.readonly'],
      calendar_list_sync_token: null,
      connection_status: 'connected',
      sync_error: null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (existing[0]?.google_account_email && !sameGoogleAccount) {
      // Setelah koneksi pengganti tersimpan aman, bersihkan cache akun lama.
      // Event ikut terhapus melalui ON DELETE CASCADE calendar.
      await deleteRows('google_calendars', `user_id=eq.${encodeURIComponent(oauthState.user_id)}`);
    }

    return redirectWithResult(returnTo, 'connected');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Koneksi Google Calendar gagal.';
    return redirectWithResult(returnTo, 'error', message);
  }
});
