import { useMemo, useState } from 'react';
import {
  addDays,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
  startOfWeek
} from 'date-fns';
import { id } from 'date-fns/locale';
import {
  CalendarDays,
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

type CalendarView = 'today' | 'week' | 'agenda';

const eventTimeLabel = (event: GoogleCalendarEvent) => {
  if (event.allDay) return 'Sepanjang hari';
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  return `${format(start, 'HH.mm')}–${format(end, 'HH.mm')}`;
};

const groupEvents = (events: GoogleCalendarEvent[]) => {
  const groups = new Map<string, GoogleCalendarEvent[]>();
  events.forEach((event) => {
    const key = format(new Date(event.startAt), 'yyyy-MM-dd');
    groups.set(key, [...(groups.get(key) ?? []), event]);
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
  const [disconnecting, setDisconnecting] = useState(false);
  const now = new Date();
  const range = useMemo(() => {
    if (view === 'today') return { start: startOfDay(now), end: endOfDay(now) };
    if (view === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      return { start, end: endOfDay(addDays(start, 6)) };
    }
    return { start: startOfDay(now), end: endOfDay(addDays(now, 30)) };
  }, [view]);
  const visibleEvents = useMemo(
    () => calendarStore.eventsBetween(range.start, range.end),
    [calendarStore, range.start, range.end]
  );
  const grouped = useMemo(() => groupEvents(visibleEvents), [visibleEvents]);
  const calendarMap = useMemo(
    () => new Map(calendarStore.calendars.map((calendar) => [calendar.id, calendar])),
    [calendarStore.calendars]
  );

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
            <div><h3>Agenda</h3><p>{visibleEvents.length} event pada rentang yang dipilih.</p></div>
            <div className="segmented-control calendar-view-tabs">
              <button className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>Hari ini</button>
              <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Minggu</button>
              <button className={view === 'agenda' ? 'active' : ''} onClick={() => setView('agenda')}>30 hari</button>
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
