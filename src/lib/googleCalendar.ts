import type {
  GoogleCalendarConnectionStatus,
  GoogleCalendarEvent,
  GoogleCalendarInfo
} from '../types';
import type { AuthSession } from './supabase';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const baseHeaders = (session: AuthSession, extra?: Record<string, string>) => ({
  apikey: publishableKey,
  Authorization: `Bearer ${session.access_token}`,
  'Content-Type': 'application/json',
  ...extra
});

const getErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json() as { error?: string; message?: string; error_description?: string };
    return payload.error_description ?? payload.message ?? payload.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

const invokeCalendarFunction = async <T>(
  session: AuthSession,
  functionName: string,
  body: Record<string, unknown>
): Promise<T> => {
  if (!supabaseUrl || !publishableKey) throw new Error('Supabase belum dikonfigurasi.');
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: baseHeaders(session),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return response.json() as Promise<T>;
};

export const requestGoogleCalendarConnection = async (session: AuthSession, returnTo: string) => {
  return invokeCalendarFunction<{ authorizationUrl: string }>(session, 'google-calendar-connect', { returnTo });
};

export const fetchGoogleCalendarStatus = async (session: AuthSession) => {
  return invokeCalendarFunction<GoogleCalendarConnectionStatus>(session, 'google-calendar-sync', { action: 'status' });
};

export const syncGoogleCalendar = async (session: AuthSession) => {
  return invokeCalendarFunction<{ calendars: number; events: number; syncedAt: string }>(session, 'google-calendar-sync', { action: 'sync' });
};

export const disconnectGoogleCalendar = async (session: AuthSession) => {
  return invokeCalendarFunction<{ disconnected: boolean }>(session, 'google-calendar-sync', { action: 'disconnect' });
};

export const fetchGoogleCalendars = async (session: AuthSession): Promise<GoogleCalendarInfo[]> => {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/google_calendars?select=id,google_calendar_id,summary,description,time_zone,background_color,foreground_color,access_role,is_primary,is_visible,last_synced_at&deleted_at=is.null&order=is_primary.desc,summary.asc`,
    { headers: baseHeaders(session) }
  );
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const rows = await response.json() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    googleCalendarId: String(row.google_calendar_id),
    summary: String(row.summary ?? 'Tanpa nama'),
    description: typeof row.description === 'string' ? row.description : undefined,
    timeZone: typeof row.time_zone === 'string' ? row.time_zone : undefined,
    backgroundColor: typeof row.background_color === 'string' ? row.background_color : undefined,
    foregroundColor: typeof row.foreground_color === 'string' ? row.foreground_color : undefined,
    accessRole: typeof row.access_role === 'string' ? row.access_role : undefined,
    primary: Boolean(row.is_primary),
    isVisible: Boolean(row.is_visible),
    lastSyncedAt: typeof row.last_synced_at === 'string' ? row.last_synced_at : undefined
  }));
};

export const fetchGoogleCalendarEvents = async (
  session: AuthSession,
  rangeStart: string,
  rangeEnd: string
): Promise<GoogleCalendarEvent[]> => {
  const query = new URLSearchParams({
    select: 'id,calendar_id,google_event_id,title,description,location,html_link,conference_link,start_at,end_at,all_day,status,organizer_email,attendees_count,recurring_event_id,updated_at_google',
    start_at: `lt.${rangeEnd}`,
    end_at: `gt.${rangeStart}`,
    status: 'neq.cancelled',
    order: 'start_at.asc',
    limit: '1000'
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/google_calendar_events?${query.toString()}`, {
    headers: baseHeaders(session)
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const rows = await response.json() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    calendarId: String(row.calendar_id),
    googleEventId: String(row.google_event_id),
    title: String(row.title ?? 'Tanpa judul'),
    description: typeof row.description === 'string' ? row.description : undefined,
    location: typeof row.location === 'string' ? row.location : undefined,
    htmlLink: typeof row.html_link === 'string' ? row.html_link : undefined,
    conferenceLink: typeof row.conference_link === 'string' ? row.conference_link : undefined,
    startAt: String(row.start_at),
    endAt: String(row.end_at),
    allDay: Boolean(row.all_day),
    status: String(row.status ?? 'confirmed'),
    organizerEmail: typeof row.organizer_email === 'string' ? row.organizer_email : undefined,
    attendeesCount: Number(row.attendees_count ?? 0),
    recurringEventId: typeof row.recurring_event_id === 'string' ? row.recurring_event_id : undefined,
    updatedAtGoogle: typeof row.updated_at_google === 'string' ? row.updated_at_google : undefined
  }));
};

export const setGoogleCalendarVisibility = async (
  session: AuthSession,
  calendarId: string,
  isVisible: boolean
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/google_calendars?id=eq.${encodeURIComponent(calendarId)}`, {
    method: 'PATCH',
    headers: baseHeaders(session, { Prefer: 'return=minimal' }),
    body: JSON.stringify({ is_visible: isVisible })
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
};
