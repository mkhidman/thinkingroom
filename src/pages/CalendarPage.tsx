import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
  subDays,
  subMonths
} from 'date-fns';
import { id } from 'date-fns/locale';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  ExternalLink,
  Link2,
  LoaderCircle,
  LocateFixed,
  MapPin,
  RefreshCw,
  Unlink,
  Video
} from 'lucide-react';
import type { GoogleCalendarEvent, GoogleCalendarInfo } from '../types';
import { useCalendarStore } from '../store/CalendarStore';
import { useAuthStore } from '../store/AuthStore';
import { consumePendingFocus, setPendingFocus } from '../lib/navigation';

type CalendarView = 'today' | 'week' | 'agenda';

const eventTimeLabel = (event: GoogleCalendarEvent) => {
  if (event.allDay) return 'Sepanjang hari';
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  return `${format(start, 'HH.mm')}–${format(end, 'HH.mm')}`;
};

const groupEvents = (
  events: GoogleCalendarEvent[],
  range: { start: Date; end: Date }
) => {
  const groups = new Map<string, GoogleCalendarEvent[]>();
  events.forEach((event) => {
    const eventStart = event.allDay
      ? new Date(`${event.startAt.slice(0, 10)}T00:00:00`)
      : new Date(event.startAt);
    const eventEnd = event.allDay
      ? new Date(`${event.endAt.slice(0, 10)}T00:00:00`)
      : new Date(event.endAt);
    const startMs = Math.max(eventStart.getTime(), range.start.getTime());
    // Google memakai end eksklusif untuk all-day event.
    const endMs = Math.min(eventEnd.getTime() - 1, range.end.getTime());
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return;
    let cursor = startOfDay(new Date(startMs));
    const lastDay = startOfDay(new Date(endMs));
    while (cursor.getTime() <= lastDay.getTime()) {
      const key = format(cursor, 'yyyy-MM-dd');
      groups.set(key, [...(groups.get(key) ?? []), event]);
      cursor = addDays(cursor, 1);
    }
  });
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
};

const CalendarDot = ({ calendar }: { calendar?: GoogleCalendarInfo }) => (
  <span
    className="calendar-color-dot"
    style={{ background: calendar?.backgroundColor ?? '#005BAC' }}
    aria-hidden="true"
  />
);

export const CalendarPage = () => {
  const calendarStore = useCalendarStore();
  const auth = useAuthStore();
  const [view, setView] = useState<CalendarView>('week');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [disconnecting, setDisconnecting] = useState(false);
  const now = new Date();
  const range = useMemo(() => {
    if (view === 'today') return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
    if (view === 'week') {
      const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
      return { start, end: endOfDay(addDays(start, 6)) };
    }
    return { start: startOfDay(anchorDate), end: endOfDay(addDays(anchorDate, 29)) };
  }, [view, anchorDate]);
  const visibleEvents = useMemo(
    () => calendarStore.eventsBetween(range.start, range.end),
    [calendarStore, range.start, range.end]
  );
  const grouped = useMemo(() => groupEvents(visibleEvents, range), [visibleEvents, range]);
  const calendarMap = useMemo(
    () => new Map(calendarStore.calendars.map((calendar) => [calendar.id, calendar])),
    [calendarStore.calendars]
  );

  useEffect(() => {
    const focusId = consumePendingFocus('calendar');
    if (!focusId) return;
    const event = calendarStore.events.find((item) => item.id === focusId);
    if (!event) {
      if (calendarStore.status === 'loading' || calendarStore.status === 'idle') {
        setPendingFocus('calendar', focusId);
      }
      return;
    }
    setAnchorDate(event.allDay
      ? new Date(`${event.startAt.slice(0, 10)}T12:00:00`)
      : new Date(event.startAt));
    setView('today');
  }, [calendarStore.events, calendarStore.status]);

  const moveRange = (direction: -1 | 1) => {
    setAnchorDate((current) => {
      if (view === 'today') return direction === 1 ? addDays(current, 1) : subDays(current, 1);
      if (view === 'week') return direction === 1 ? addDays(current, 7) : subDays(current, 7);
      return direction === 1 ? addMonths(current, 1) : subMonths(current, 1);
    });
  };

  const rangeLabel = view === 'today'
    ? format(range.start, 'd MMMM yyyy', { locale: id })
    : `${format(range.start, 'd MMM', { locale: id })} – ${format(range.end, 'd MMM yyyy', { locale: id })}`;

  if (!calendarStore.connection.connected) {
    return (
      <div className="page-stack">
        <section className="calendar-connect-hero">
          <div className="calendar-connect-icon"><CalendarDays size={30} /></div>
          <span className="eyebrow">Google Calendar · Read-only</span>
          <h2>Satukan agenda tanpa memindahkan kalender.</h2>
          <p>Ruang hanya membaca kalender yang kamu pilih. Event tetap dikelola dari Google Calendar dan tidak akan diubah atau dihapus oleh aplikasi.</p>
          <button className="primary-button" onClick={() => void calendarStore.connect().catch(() => undefined)} disabled={calendarStore.status === 'loading' || !auth.configured || !auth.session}>
            <Link2 size={17} /> Hubungkan Google Calendar
          </button>
          {!auth.configured && <p className="calendar-error">Aktifkan Supabase terlebih dahulu karena token Google hanya disimpan melalui Edge Function.</p>}
          {calendarStore.error && <p className="calendar-error">{calendarStore.error}</p>}
        </section>

        <section className="panel calendar-benefits-grid">
          <article><LocateFixed size={20} /><strong>Agenda terpusat</strong><p>Jadwal hari ini muncul bersama tugas, habit, dan ibadah.</p></article>
          <article><Check size={20} /><strong>Akses read-only</strong><p>Fase ini tidak mempunyai izin menulis atau menghapus event Google.</p></article>
          <article><RefreshCw size={20} /><strong>Sinkronisasi efisien</strong><p>Setelah sinkronisasi pertama, hanya perubahan terbaru yang ditarik.</p></article>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="calendar-toolbar panel">
        <div>
          <span className="calendar-connection-label"><span className="status-dot online" /> Terhubung</span>
          <h2>{calendarStore.connection.accountEmail ?? 'Google Calendar'}</h2>
          <p>
            {calendarStore.connection.lastSyncedAt
              ? `Terakhir disinkronkan ${new Date(calendarStore.connection.lastSyncedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`
              : 'Belum pernah disinkronkan.'}
          </p>
        </div>
        <div className="calendar-toolbar-actions">
          <button className="secondary-button" onClick={() => void calendarStore.syncNow()} disabled={calendarStore.status === 'syncing'}>
            <RefreshCw size={15} className={calendarStore.status === 'syncing' ? 'spin' : ''} />
            {calendarStore.status === 'syncing' ? 'Menyinkronkan' : 'Sinkronkan'}
          </button>
          <button
            className="secondary-button danger-text"
            disabled={disconnecting}
            onClick={() => {
              if (!window.confirm('Putuskan Google Calendar dari Ruang? Cache event juga akan dihapus.')) return;
              setDisconnecting(true);
              void calendarStore.disconnect().finally(() => setDisconnecting(false));
            }}
          >
            <Unlink size={15} /> Putuskan
          </button>
        </div>
      </section>

      {calendarStore.error && <div className="calendar-inline-error">{calendarStore.error}</div>}

      <div className="calendar-layout">
        <aside className="panel calendar-source-panel">
          <div className="panel-header"><div><h3>Kalender</h3><p>Pilih kalender yang ingin ditampilkan dan disinkronkan.</p></div></div>
          <div className="calendar-source-list">
            {calendarStore.calendars.map((calendar) => (
              <label key={calendar.id} className="calendar-source-row">
                <span className="calendar-checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={calendar.isVisible}
                    onChange={(event) => void calendarStore.toggleCalendar(calendar.id, event.target.checked)}
                  />
                  <CalendarDot calendar={calendar} />
                </span>
                <span><strong>{calendar.summary}</strong><small>{calendar.primary ? 'Kalender utama' : calendar.timeZone ?? 'Google Calendar'}</small></span>
              </label>
            ))}
          </div>
          <p className="calendar-source-note">Menyalakan kalender baru akan memicu sinkronisasi event kalender tersebut.</p>
        </aside>

        <section className="panel calendar-agenda-panel">
          <div className="calendar-agenda-header">
            <div><h3>Agenda</h3><p>{visibleEvents.length} event · {rangeLabel}</p></div>
            <div className="calendar-navigation">
              <div className="calendar-range-buttons">
                <button className="icon-button" onClick={() => moveRange(-1)} aria-label="Rentang sebelumnya"><ChevronLeft size={17} /></button>
                <button className="secondary-button" onClick={() => setAnchorDate(new Date())}>Hari ini</button>
                <button className="icon-button" onClick={() => moveRange(1)} aria-label="Rentang berikutnya"><ChevronRight size={17} /></button>
              </div>
              <div className="segmented-control calendar-view-tabs" role="tablist" aria-label="Tampilan kalender">
                <button role="tab" aria-selected={view === 'today'} className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>Hari</button>
                <button role="tab" aria-selected={view === 'week'} className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Minggu</button>
                <button role="tab" aria-selected={view === 'agenda'} className={view === 'agenda' ? 'active' : ''} onClick={() => setView('agenda')}>30 hari</button>
              </div>
            </div>
          </div>

          {calendarStore.status === 'loading' && (
            <div className="empty-state calendar-loading"><LoaderCircle size={28} className="spin" /><strong>Mengambil agenda…</strong></div>
          )}

          {calendarStore.status !== 'loading' && grouped.length === 0 && (
            <div className="empty-state calendar-empty"><CalendarDays size={30} /><strong>Tidak ada agenda</strong><p>Tidak ada event pada rentang ini atau semua kalender sedang disembunyikan.</p></div>
          )}

          <div className="calendar-day-groups">
            {grouped.map(([dateKey, dayEvents]) => {
              const date = new Date(`${dateKey}T00:00:00`);
              return (
                <section className="calendar-day-group" key={dateKey}>
                  <header>
                    <span>{format(date, 'EEE', { locale: id })}</span>
                    <div><strong>{isSameDay(date, now) ? 'Hari ini' : format(date, 'd MMMM', { locale: id })}</strong><small>{format(date, 'EEEE', { locale: id })}</small></div>
                  </header>
                  <div className="calendar-event-list">
                    {dayEvents.map((event) => {
                      const source = calendarMap.get(event.calendarId);
                      return (
                        <article className="calendar-event-card" key={event.id}>
                          <div className="calendar-event-time">{eventTimeLabel(event)}</div>
                          <CalendarDot calendar={source} />
                          <div className="calendar-event-copy">
                            <strong>{event.title}</strong>
                            <div className="calendar-event-meta">
                              <span>{source?.summary ?? 'Google Calendar'}</span>
                              {event.location && <span><MapPin size={12} />{event.location}</span>}
                              {event.conferenceLink && <span><Video size={12} />Meeting online</span>}
                            </div>
                            {event.description && <p>{event.description}</p>}
                          </div>
                          {(event.htmlLink || event.conferenceLink) && (
                            <a
                              className="calendar-event-link"
                              href={event.conferenceLink ?? event.htmlLink}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={event.conferenceLink ? 'Buka meeting' : 'Buka di Google Calendar'}
                            ><ExternalLink size={15} /></a>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
