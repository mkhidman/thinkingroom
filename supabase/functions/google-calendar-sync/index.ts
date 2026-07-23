import { decryptSecret } from '../_shared/crypto.ts';
import { deleteRows, insertRows, requireUser, selectRows, updateRows } from '../_shared/db.ts';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/http.ts';
import {
  getConferenceLink,
  GoogleApiError,
  googleGet,
  refreshGoogleAccessToken,
  revokeGoogleToken
} from '../_shared/google.ts';

interface ConnectionRow {
  user_id: string;
  google_account_email?: string;
  refresh_token_ciphertext: string;
  calendar_list_sync_token?: string;
  connection_status: 'connected' | 'reauthorization_required' | 'error';
  sync_error?: string;
  connected_at: string;
  last_synced_at?: string;
}

interface CalendarRow {
  id: string;
  user_id: string;
  google_calendar_id: string;
  summary: string;
  is_visible: boolean;
  is_primary: boolean;
  sync_token?: string;
}

interface GoogleCalendarItem {
  id: string;
  summary?: string;
  description?: string;
  timeZone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
  primary?: boolean;
  hidden?: boolean;
  deleted?: boolean;
}

interface CalendarListResponse {
  items?: GoogleCalendarItem[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

interface GoogleEventTime {
  dateTime?: string;
  date?: string;
}

interface GoogleEventItem extends Record<string, unknown> {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
  organizer?: { email?: string };
  attendees?: unknown[];
  recurringEventId?: string;
  originalStartTime?: GoogleEventTime;
  updated?: string;
  etag?: string;
}

interface EventsResponse {
  items?: GoogleEventItem[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

const calendarListUrl = (syncToken?: string, pageToken?: string) => {
  const params = new URLSearchParams({
    maxResults: '250',
    showDeleted: 'true',
    showHidden: 'true'
  });
  if (syncToken) {
    params.set('syncToken', syncToken);
  }
  if (pageToken) params.set('pageToken', pageToken);
  return `https://www.googleapis.com/calendar/v3/users/me/calendarList?${params.toString()}`;
};

const eventListUrl = (calendarId: string, syncToken?: string, pageToken?: string) => {
  const params = new URLSearchParams({
    maxResults: '2500',
    singleEvents: 'true',
    showDeleted: 'true'
  });
  if (syncToken) {
    params.set('syncToken', syncToken);
  } else {
    params.set('timeMin', new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString());
    params.set('timeMax', new Date(Date.now() + 365 * 24 * 60 * 60_000).toISOString());
  }
  if (pageToken) params.set('pageToken', pageToken);
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;
};

const collectCalendarChanges = async (accessToken: string, syncToken?: string) => {
  const items: GoogleCalendarItem[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const page = await googleGet<CalendarListResponse>(calendarListUrl(syncToken, pageToken), accessToken);
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
    nextSyncToken = page.nextSyncToken ?? nextSyncToken;
  } while (pageToken);
  return { items, nextSyncToken };
};

const collectEventChanges = async (accessToken: string, calendarId: string, syncToken?: string) => {
  const items: GoogleEventItem[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const page = await googleGet<EventsResponse>(eventListUrl(calendarId, syncToken, pageToken), accessToken);
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
    nextSyncToken = page.nextSyncToken ?? nextSyncToken;
  } while (pageToken);
  return { items, nextSyncToken };
};

const normalizeEventTime = (value: GoogleEventTime | undefined, fallback: Date) => {
  if (value?.dateTime) return new Date(value.dateTime).toISOString();
  if (value?.date) return new Date(`${value.date}T00:00:00.000Z`).toISOString();
  return fallback.toISOString();
};

const syncCalendarList = async (userId: string, accessToken: string, connection: ConnectionRow) => {
  let result;
  try {
    result = await collectCalendarChanges(accessToken, connection.calendar_list_sync_token);
  } catch (error) {
    if (!(error instanceof GoogleApiError) || error.status !== 410) throw error;
    result = await collectCalendarChanges(accessToken);
    await updateRows('google_calendar_connections', `user_id=eq.${encodeURIComponent(userId)}`, { calendar_list_sync_token: null });
  }

  const existingRows = await selectRows<CalendarRow>(
    'google_calendars',
    `user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,google_calendar_id,summary,is_visible,is_primary,sync_token`
  );
  const existing = new Map(existingRows.map((row) => [row.google_calendar_id, row]));

  for (const calendar of result.items) {
    if (!calendar.id) continue;
    const previous = existing.get(calendar.id);
    if (calendar.deleted) {
      await updateRows(
        'google_calendars',
        `user_id=eq.${encodeURIComponent(userId)}&google_calendar_id=eq.${encodeURIComponent(calendar.id)}`,
        { deleted_at: new Date().toISOString(), is_visible: false, updated_at: new Date().toISOString() }
      );
      continue;
    }

    await insertRows<CalendarRow>('google_calendars', {
      user_id: userId,
      google_calendar_id: calendar.id,
      summary: calendar.summary ?? calendar.id,
      description: calendar.description ?? null,
      time_zone: calendar.timeZone ?? null,
      background_color: calendar.backgroundColor ?? '#005BAC',
      foreground_color: calendar.foregroundColor ?? '#FFFFFF',
      access_role: calendar.accessRole ?? null,
      is_primary: Boolean(calendar.primary),
      is_visible: previous?.is_visible ?? Boolean(calendar.primary),
      deleted_at: null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,google_calendar_id' });
  }

  await updateRows('google_calendar_connections', `user_id=eq.${encodeURIComponent(userId)}`, {
    calendar_list_sync_token: result.nextSyncToken ?? connection.calendar_list_sync_token ?? null,
    updated_at: new Date().toISOString()
  });
};

const syncOneCalendar = async (userId: string, accessToken: string, calendar: CalendarRow) => {
  let result;
  let fullSync = !calendar.sync_token;
  try {
    result = await collectEventChanges(accessToken, calendar.google_calendar_id, calendar.sync_token);
  } catch (error) {
    if (!(error instanceof GoogleApiError) || error.status !== 410) throw error;
    await deleteRows('google_calendar_events', `user_id=eq.${encodeURIComponent(userId)}&calendar_id=eq.${encodeURIComponent(calendar.id)}`);
    await updateRows('google_calendars', `id=eq.${encodeURIComponent(calendar.id)}`, { sync_token: null });
    result = await collectEventChanges(accessToken, calendar.google_calendar_id);
    fullSync = true;
  }

  const upserts: Array<Record<string, unknown>> = [];
  const cancelledEventIds: string[] = [];
  for (const event of result.items) {
    if (!event.id) continue;
    if (event.status === 'cancelled') {
      cancelledEventIds.push(event.id);
      continue;
    }
    const now = new Date();
    const startAt = normalizeEventTime(event.start, now);
    const endAt = normalizeEventTime(event.end, new Date(new Date(startAt).getTime() + 60 * 60_000));
    upserts.push({
      user_id: userId,
      calendar_id: calendar.id,
      google_event_id: event.id,
      title: event.summary ?? 'Tanpa judul',
      description: event.description ?? null,
      location: event.location ?? null,
      html_link: event.htmlLink ?? null,
      conference_link: getConferenceLink(event) ?? null,
      start_at: startAt,
      end_at: endAt,
      all_day: Boolean(event.start?.date && !event.start?.dateTime),
      status: event.status ?? 'confirmed',
      organizer_email: event.organizer?.email ?? null,
      attendees_count: event.attendees?.length ?? 0,
      recurring_event_id: event.recurringEventId ?? null,
      original_start_at: event.originalStartTime ? normalizeEventTime(event.originalStartTime, new Date(startAt)) : null,
      updated_at_google: event.updated ?? null,
      etag: event.etag ?? null,
      updated_at: new Date().toISOString()
    });
  }

  for (let index = 0; index < cancelledEventIds.length; index += 100) {
    const ids = cancelledEventIds.slice(index, index + 100).map(encodeURIComponent).join(',');
    await deleteRows(
      'google_calendar_events',
      `user_id=eq.${encodeURIComponent(userId)}&calendar_id=eq.${encodeURIComponent(calendar.id)}&google_event_id=in.(${ids})`
    );
  }

  for (let index = 0; index < upserts.length; index += 250) {
    await insertRows('google_calendar_events', upserts.slice(index, index + 250), {
      onConflict: 'user_id,calendar_id,google_event_id'
    });
  }

  if (fullSync) {
    await deleteRows(
      'google_calendar_events',
      `user_id=eq.${encodeURIComponent(userId)}&calendar_id=eq.${encodeURIComponent(calendar.id)}&end_at=lt.${encodeURIComponent(new Date(Date.now() - 60 * 24 * 60 * 60_000).toISOString())}`
    );
  }

  await updateRows('google_calendars', `id=eq.${encodeURIComponent(calendar.id)}`, {
    sync_token: result.nextSyncToken ?? calendar.sync_token ?? null,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  return upserts.length;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return errorResponse(request, new Error('Method not allowed.'), 405);

  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({})) as { action?: 'status' | 'sync' | 'disconnect' };
    const action = body.action ?? 'status';
    const rows = await selectRows<ConnectionRow>(
      'google_calendar_connections',
      `user_id=eq.${encodeURIComponent(user.id)}&select=user_id,google_account_email,refresh_token_ciphertext,calendar_list_sync_token,connection_status,sync_error,connected_at,last_synced_at&limit=1`
    );
    const connection = rows[0];

    if (action === 'status') {
      return jsonResponse(request, connection ? {
        connected: true,
        accountEmail: connection.google_account_email,
        connectedAt: connection.connected_at,
        lastSyncedAt: connection.last_synced_at,
        syncStatus: connection.connection_status,
        syncError: connection.sync_error
      } : { connected: false });
    }

    if (!connection) throw new Error('Google Calendar belum terhubung.');
    const refreshToken = await decryptSecret(connection.refresh_token_ciphertext);

    if (action === 'disconnect') {
      try { await revokeGoogleToken(refreshToken); } catch { /* Koneksi tetap dibersihkan di Ruang. */ }
      await deleteRows('google_calendar_connections', `user_id=eq.${encodeURIComponent(user.id)}`);
      return jsonResponse(request, { disconnected: true });
    }

    const lastSyncAt = connection.last_synced_at ? new Date(connection.last_synced_at).getTime() : 0;
    if (Date.now() - lastSyncAt < 30_000) {
      return jsonResponse(request, {
        calendars: 0,
        events: 0,
        syncedAt: connection.last_synced_at,
        throttled: true
      });
    }

    let accessToken: string;
    try {
      const token = await refreshGoogleAccessToken(refreshToken);
      accessToken = token.access_token;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token Google tidak dapat diperbarui.';
      await updateRows('google_calendar_connections', `user_id=eq.${encodeURIComponent(user.id)}`, {
        connection_status: 'reauthorization_required',
        sync_error: message,
        updated_at: new Date().toISOString()
      });
      throw new Error('Akses Google Calendar perlu dihubungkan ulang.');
    }

    try {
      await syncCalendarList(user.id, accessToken, connection);
      const calendars = await selectRows<CalendarRow>(
        'google_calendars',
        `user_id=eq.${encodeURIComponent(user.id)}&is_visible=eq.true&deleted_at=is.null&select=id,user_id,google_calendar_id,summary,is_visible,is_primary,sync_token&order=is_primary.desc`
      );
      let eventCount = 0;
      // Batasi concurrency agar sinkron banyak kalender lebih cepat tanpa
      // membanjiri Google API atau koneksi database.
      for (let index = 0; index < calendars.length; index += 3) {
        const counts = await Promise.all(
          calendars.slice(index, index + 3).map((calendar) => syncOneCalendar(user.id, accessToken, calendar))
        );
        eventCount += counts.reduce((sum, count) => sum + count, 0);
      }
      const syncedAt = new Date().toISOString();
      await updateRows('google_calendar_connections', `user_id=eq.${encodeURIComponent(user.id)}`, {
        connection_status: 'connected',
        sync_error: null,
        last_synced_at: syncedAt,
        updated_at: syncedAt
      });
      return jsonResponse(request, { calendars: calendars.length, events: eventCount, syncedAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sinkronisasi Google Calendar gagal.';
      await updateRows('google_calendar_connections', `user_id=eq.${encodeURIComponent(user.id)}`, {
        connection_status: 'error', sync_error: message, updated_at: new Date().toISOString()
      });
      throw error;
    }
  } catch (error) {
    return errorResponse(request, error, 400);
  }
});
