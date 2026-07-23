import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { addDays, endOfDay, startOfDay, subDays } from 'date-fns';
import type {
  GoogleCalendarConnectionStatus,
  GoogleCalendarEvent,
  GoogleCalendarInfo
} from '../types';
import {
  disconnectGoogleCalendar,
  fetchGoogleCalendarEvents,
  fetchGoogleCalendars,
  fetchGoogleCalendarStatus,
  requestGoogleCalendarConnection,
  setGoogleCalendarVisibility,
  syncGoogleCalendar
} from '../lib/googleCalendar';
import { useAuthStore } from './AuthStore';

export type CalendarSyncStatus = 'idle' | 'loading' | 'syncing' | 'connected' | 'disconnected' | 'offline' | 'error';

interface CalendarStoreValue {
  connection: GoogleCalendarConnectionStatus;
  calendars: GoogleCalendarInfo[];
  events: GoogleCalendarEvent[];
  status: CalendarSyncStatus;
  error: string | null;
  rangeStart: string;
  rangeEnd: string;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleCalendar: (calendarId: string, visible: boolean) => Promise<void>;
  eventsBetween: (start: Date, end: Date) => GoogleCalendarEvent[];
}

const CalendarStoreContext = createContext<CalendarStoreValue | null>(null);
const readableError = (error: unknown) => error instanceof Error ? error.message : 'Google Calendar gagal dimuat.';
const CACHE_PREFIX = 'ruang-google-calendar-cache-v1';

interface CalendarCache {
  connection: GoogleCalendarConnectionStatus;
  calendars: GoogleCalendarInfo[];
  events: GoogleCalendarEvent[];
}

const loadCache = (userId: string): CalendarCache | null => {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}:${userId}`);
    return raw ? JSON.parse(raw) as CalendarCache : null;
  } catch {
    return null;
  }
};

const saveCache = (userId: string, cache: CalendarCache) => {
  const privacySafeCache: CalendarCache = {
    ...cache,
    events: cache.events.map((event) => ({
      ...event,
      description: undefined,
      location: undefined,
      organizerEmail: undefined
    }))
  };
  try { localStorage.setItem(`${CACHE_PREFIX}:${userId}`, JSON.stringify(privacySafeCache)); } catch { /* Cache hanya optimasi offline. */ }
};

const createRange = () => ({
  start: startOfDay(subDays(new Date(), 30)).toISOString(),
  end: endOfDay(addDays(new Date(), 365)).toISOString()
});

export const CalendarStoreProvider = ({ children }: PropsWithChildren) => {
  const auth = useAuthStore();
  const rangeRef = useRef(createRange());
  const [connection, setConnection] = useState<GoogleCalendarConnectionStatus>({ connected: false });
  const [calendars, setCalendars] = useState<GoogleCalendarInfo[]>([]);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [status, setStatus] = useState<CalendarSyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const autoSyncAttemptedRef = useRef(false);

  const loadCachedData = useCallback(async () => {
    if (!auth.configured || !auth.session) {
      setConnection({ connected: false });
      setCalendars([]);
      setEvents([]);
      setStatus('disconnected');
      return;
    }

    setError(null);
    const currentStatus = await fetchGoogleCalendarStatus(auth.session);
    setConnection(currentStatus);
    if (currentStatus.syncStatus && currentStatus.syncStatus !== 'connected') {
      setError(currentStatus.syncError ?? 'Koneksi Google Calendar perlu diperiksa.');
    }
    if (!currentStatus.connected) {
      setCalendars([]);
      setEvents([]);
      localStorage.removeItem(`${CACHE_PREFIX}:${auth.session.user.id}`);
      setStatus('disconnected');
      return;
    }

    const calendarRows = await fetchGoogleCalendars(auth.session);
    const eventRows = await fetchGoogleCalendarEvents(
      auth.session,
      rangeRef.current.start,
      rangeRef.current.end,
      calendarRows.filter((calendar) => calendar.isVisible).map((calendar) => calendar.id)
    );
    setCalendars(calendarRows);
    setEvents(eventRows);
    setStatus('connected');
    saveCache(auth.session.user.id, { connection: currentStatus, calendars: calendarRows, events: eventRows });
  }, [auth.configured, auth.session]);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const operation = (async () => {
      setStatus((current) => current === 'syncing' ? current : 'loading');
      try {
        await loadCachedData();
      } catch (loadError) {
        const cached = auth.session ? loadCache(auth.session.user.id) : null;
        if (cached) {
          setConnection(cached.connection);
          setCalendars(cached.calendars);
          setEvents(cached.events);
          setError('Tidak dapat menjangkau Supabase. Menampilkan cache agenda terakhir.');
          setStatus('offline');
        } else {
          setError(readableError(loadError));
          setStatus('error');
        }
      }
    })().finally(() => {
      refreshInFlight.current = null;
    });
    refreshInFlight.current = operation;
    return operation;
  }, [auth.session, loadCachedData]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackResult = params.get('google_calendar');
    const callbackError = params.get('google_calendar_error');
    if (!callbackResult) return;

    params.delete('google_calendar');
    params.delete('google_calendar_error');
    params.delete('open');
    const nextQuery = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`);

    if (callbackResult === 'error') {
      setError(callbackError || 'Koneksi Google Calendar gagal.');
      setStatus('error');
      return;
    }
    if (!auth.session) return;
    void (async () => {
      setStatus('syncing');
      setError(null);
      try {
        await syncGoogleCalendar(auth.session!);
        await loadCachedData();
      } catch (syncError) {
        setError(readableError(syncError));
        setStatus('error');
      }
    })();
  }, [auth.session, loadCachedData]);


  const connect = useCallback(async () => {
    if (!auth.session) {
      const missingSession = new Error('Supabase dan login diperlukan untuk menghubungkan Google Calendar.');
      setError(missingSession.message);
      setStatus('error');
      throw missingSession;
    }
    setError(null);
    try {
      const returnUrl = new URL(window.location.href);
      returnUrl.search = '';
      returnUrl.hash = '';
      returnUrl.searchParams.set('google_calendar', 'connected');
      returnUrl.searchParams.set('open', 'calendar');
      const result = await requestGoogleCalendarConnection(auth.session, returnUrl.toString());
      window.location.assign(result.authorizationUrl);
    } catch (connectError) {
      setError(readableError(connectError));
      setStatus('error');
      throw connectError;
    }
  }, [auth.session]);

  const syncNow = useCallback(async () => {
    if (!auth.session) return;
    setStatus('syncing');
    setError(null);
    try {
      await syncGoogleCalendar(auth.session);
      await loadCachedData();
    } catch (syncError) {
      setError(readableError(syncError));
      setStatus('error');
      throw syncError;
    }
  }, [auth.session, loadCachedData]);

  useEffect(() => {
    if (!auth.session || !connection.connected || autoSyncAttemptedRef.current || !navigator.onLine) return;
    const lastSync = connection.lastSyncedAt ? new Date(connection.lastSyncedAt).getTime() : 0;
    if (Date.now() - lastSync < 15 * 60_000) return;
    autoSyncAttemptedRef.current = true;
    void syncNow().catch(() => undefined);
  }, [auth.session, connection.connected, connection.lastSyncedAt, syncNow]);

  const disconnect = useCallback(async () => {
    if (!auth.session) return;
    setStatus('syncing');
    setError(null);
    try {
      await disconnectGoogleCalendar(auth.session);
      setConnection({ connected: false });
      setCalendars([]);
      setEvents([]);
      localStorage.removeItem(`${CACHE_PREFIX}:${auth.session.user.id}`);
      setStatus('disconnected');
    } catch (disconnectError) {
      setError(readableError(disconnectError));
      setStatus('error');
      throw disconnectError;
    }
  }, [auth.session]);

  const toggleCalendar = useCallback(async (calendarId: string, visible: boolean) => {
    if (!auth.session) return;
    const previous = calendars;
    const next = calendars.map((item) => item.id === calendarId ? { ...item, isVisible: visible } : item);
    setCalendars(next);
    saveCache(auth.session.user.id, { connection, calendars: next, events });
    try {
      await setGoogleCalendarVisibility(auth.session, calendarId, visible);
      if (visible) await syncNow();
    } catch (toggleError) {
      setCalendars(previous);
      saveCache(auth.session.user.id, { connection, calendars: previous, events });
      setError(readableError(toggleError));
      throw toggleError;
    }
  }, [auth.session, calendars, connection, events, syncNow]);

  const visibleCalendarIds = useMemo(
    () => new Set(calendars.filter((calendar) => calendar.isVisible).map((calendar) => calendar.id)),
    [calendars]
  );

  const eventsBetween = useCallback((start: Date, end: Date) => events.filter((event) => {
    if (!visibleCalendarIds.has(event.calendarId)) return false;
    const eventStart = event.allDay
      ? new Date(`${event.startAt.slice(0, 10)}T00:00:00`).getTime()
      : new Date(event.startAt).getTime();
    const eventEnd = event.allDay
      ? new Date(`${event.endAt.slice(0, 10)}T00:00:00`).getTime()
      : new Date(event.endAt).getTime();
    return eventStart < end.getTime() && eventEnd > start.getTime();
  }), [events, visibleCalendarIds]);

  const value = useMemo<CalendarStoreValue>(() => ({
    connection,
    calendars,
    events,
    status,
    error,
    rangeStart: rangeRef.current.start,
    rangeEnd: rangeRef.current.end,
    connect,
    refresh,
    syncNow,
    disconnect,
    toggleCalendar,
    eventsBetween
  }), [connection, calendars, events, status, error, connect, refresh, syncNow, disconnect, toggleCalendar, eventsBetween]);

  return <CalendarStoreContext.Provider value={value}>{children}</CalendarStoreContext.Provider>;
};

export const useCalendarStore = () => {
  const context = useContext(CalendarStoreContext);
  if (!context) throw new Error('useCalendarStore must be used inside CalendarStoreProvider');
  return context;
};
