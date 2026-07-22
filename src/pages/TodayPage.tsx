import { format, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Landmark,
  MoonStar,
  NotebookPen,
  Target
} from 'lucide-react';
import type { PageId, PrayerName } from '../types';
import { useAppStore } from '../store/AppStore';
import { useCalendarStore } from '../store/CalendarStore';
import { TaskRow } from '../components/TaskRow';
import { formatCurrency, toDayKey, toMonthKey } from '../lib/format';
import { getAccountBalance, getMonthTotals } from '../lib/finance';

const prayerTimes: Record<PrayerName, string> = {
  Subuh: '04.42', Dzuhur: '11.57', Ashar: '15.18', Maghrib: '17.53', Isya: '19.04'
};

interface TodayPageProps {
  onNavigate: (page: PageId) => void;
}

export const TodayPage = ({ onNavigate }: TodayPageProps) => {
  const { data, toggleTask, logHabit, cyclePrayer } = useAppStore();
  const calendarStore = useCalendarStore();
  const now = new Date();
  const dayKey = toDayKey(now);
  const monthKey = toMonthKey(now);
  const todayStart = startOfDay(now);
  const todayTasks = data.tasks
    .filter((task) => {
      if (task.status !== 'todo') return false;
      const scheduledToday = Boolean(task.dueAt && isSameDay(parseISO(task.dueAt), now));
      const deadlineToday = Boolean(task.deadlineAt && isSameDay(parseISO(task.deadlineAt), now));
      const deadlineOverdue = Boolean(task.deadlineAt && isBefore(parseISO(task.deadlineAt), todayStart));
      return scheduledToday || deadlineToday || deadlineOverdue;
    })
    .sort((a, b) => {
      const aOverdue = Boolean(a.deadlineAt && isBefore(parseISO(a.deadlineAt), now));
      const bOverdue = Boolean(b.deadlineAt && isBefore(parseISO(b.deadlineAt), now));
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      return a.priority - b.priority || (a.deadlineAt ?? a.dueAt ?? '').localeCompare(b.deadlineAt ?? b.dueAt ?? '');
    });
  const overdueCount = data.tasks.filter((task) => task.status === 'todo' && task.deadlineAt && isBefore(parseISO(task.deadlineAt), now)).length;
  const focusTasks = todayTasks.slice(0, 3);
  const nextTask = focusTasks[0];
  const todayPrayers = (Object.keys(prayerTimes) as PrayerName[]).map((prayer) => ({
    prayer,
    time: prayerTimes[prayer],
    status: data.prayers.find((item) => item.date === dayKey && item.prayer === prayer)?.status ?? 'belum'
  }));
  const nextPrayer = todayPrayers.find((prayer) => prayer.status === 'belum') ?? todayPrayers[todayPrayers.length - 1];
  const dueHabits = data.habits.filter((habit) => habit.daysOfWeek.includes(now.getDay()) && !habit.paused);
  const totals = getMonthTotals(data.transactions, monthKey);
  const totalBalance = data.accounts.reduce((sum, account) => sum + getAccountBalance(account, data.transactions), 0);
  const todayCalendarEvents = calendarStore.eventsBetween(startOfDay(now), new Date(startOfDay(now).getTime() + 24 * 60 * 60 * 1000)).slice(0, 4);
  const calendarMap = new Map(calendarStore.calendars.map((calendar) => [calendar.id, calendar]));

  return (
    <div className="page-stack">
      <section className="today-hero">
        <div>
          <span className="eyebrow">{format(now, 'EEEE, d MMMM yyyy', { locale: id })}</span>
          <h2>{nextTask ? nextTask.title : 'Hari ini cukup terkendali.'}</h2>
          <p>{nextTask ? 'Ini tindakan paling masuk akal untuk dikerjakan berikutnya berdasarkan waktu dan prioritas.' : 'Tidak ada tugas utama tersisa. Gunakan waktu untuk review atau istirahat.'}</p>
          <div className="hero-action-row">
            {nextTask && <button className="light-button" onClick={() => toggleTask(nextTask.id)}><CheckCircle2 size={17} /> Tandai selesai</button>}
            <button className="ghost-light-button" onClick={() => onNavigate('tasks')}>Lihat semua tugas <ArrowRight size={16} /></button>
          </div>
        </div>
        <div className="next-info-card">
          <span>Berikutnya</span>
          <strong>{nextPrayer.prayer}</strong>
          <p>{nextPrayer.time} · {nextPrayer.status === 'belum' ? 'belum dicatat' : nextPrayer.status}</p>
          <button onClick={() => cyclePrayer(nextPrayer.prayer)}>Perbarui status</button>
        </div>
      </section>

      <section className="summary-strip">
        <div><Target size={18} /><span><strong>{todayTasks.length}</strong> perlu perhatian hari ini{overdueCount ? ` · ${overdueCount} terlambat` : ''}</span></div>
        <div><MoonStar size={18} /><span><strong>{todayPrayers.filter((item) => item.status !== 'belum').length}/5</strong> sholat tercatat</span></div>
        <div><CircleDollarSign size={18} /><span><strong>{formatCurrency(totals.expense)}</strong> pengeluaran bulan ini</span></div>
        <div><Landmark size={18} /><span><strong>{formatCurrency(totalBalance)}</strong> total saldo</span></div>
      </section>

      <div className="dashboard-grid main-dashboard-grid">
        <section className="panel full-width today-calendar-panel">
          <div className="panel-header">
            <div><h3>Agenda hari ini</h3><p>Event dari Google Calendar yang kamu pilih.</p></div>
            <button className="text-button" onClick={() => onNavigate('calendar')}>Buka jadwal <ArrowRight size={14} /></button>
          </div>
          {!calendarStore.connection.connected && (
            <button className="today-calendar-connect" onClick={() => onNavigate('calendar')}>
              <CalendarDays size={20} /><span><strong>Hubungkan Google Calendar</strong><small>Tampilkan agenda di halaman Hari Ini tanpa memberi izin edit.</small></span><ArrowRight size={16} />
            </button>
          )}
          {calendarStore.connection.connected && todayCalendarEvents.length === 0 && (
            <div className="empty-state compact calendar-today-empty"><CalendarDays size={24} /><strong>Tidak ada event hari ini</strong><p>Agenda berikutnya tetap bisa dilihat di halaman Jadwal.</p></div>
          )}
          {calendarStore.connection.connected && todayCalendarEvents.length > 0 && (
            <div className="today-calendar-list">
              {todayCalendarEvents.map((event) => {
                const source = calendarMap.get(event.calendarId);
                return (
                  <article key={event.id} className="today-calendar-item">
                    <div className="today-calendar-time">{event.allDay ? 'Sehari' : format(new Date(event.startAt), 'HH.mm')}</div>
                    <i style={{ background: source?.backgroundColor ?? '#005BAC' }} />
                    <div><strong>{event.title}</strong><span>{source?.summary ?? 'Google Calendar'}{event.location ? ` · ${event.location}` : ''}</span></div>
                    {(event.conferenceLink || event.htmlLink) && <a href={event.conferenceLink ?? event.htmlLink} target="_blank" rel="noreferrer" aria-label="Buka event"><ExternalLink size={14} /></a>}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel span-two">
          <div className="panel-header">
            <div><h3>Tiga fokus hari ini</h3><p>Prioritas dibatasi agar daftar tidak berubah menjadi sumber tekanan.</p></div>
            <button className="text-button" onClick={() => onNavigate('tasks')}>Tugas & proyek <ArrowRight size={14} /></button>
          </div>
          <div className="list-stack">
            {focusTasks.length > 0 ? focusTasks.map((task) => (
              <TaskRow key={task.id} task={task} project={data.projects.find((project) => project.id === task.projectId)} onToggle={() => toggleTask(task.id)} />
            )) : <div className="empty-state"><CheckCircle2 size={28} /><strong>Tidak ada fokus tersisa</strong><p>Tugas lain tetap tersedia di halaman Tugas.</p></div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header"><div><h3>Sholat hari ini</h3><p>Satu ketukan untuk berpindah status.</p></div><MoonStar size={18} /></div>
          <div className="prayer-list">
            {todayPrayers.map((item) => (
              <button key={item.prayer} className={`prayer-item ${item.status !== 'belum' ? 'done' : ''}`} onClick={() => cyclePrayer(item.prayer)}>
                <div><strong>{item.prayer}</strong><span>{item.time}</span></div>
                <span>{item.status === 'belum' ? 'Belum' : item.status === 'tepat-waktu' ? 'Tepat waktu' : item.status === 'berjamaah' ? 'Berjamaah' : 'Selesai'}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel span-two">
          <div className="panel-header"><div><h3>Habit yang relevan hari ini</h3><p>Tampilkan hanya yang memang dijadwalkan hari ini.</p></div><button className="text-button" onClick={() => onNavigate('routines')}>Rutinitas <ArrowRight size={14} /></button></div>
          <div className="habit-today-grid">
            {dueHabits.map((habit) => {
              const current = habit.logs[dayKey] ?? 0;
              const percentage = Math.min(100, Math.round((current / habit.targetValue) * 100));
              return (
                <article className="habit-today-card" key={habit.id}>
                  <div className="habit-card-top"><div><strong>{habit.name}</strong><span>{current}/{habit.targetValue} {habit.unit}</span></div><span>{percentage}%</span></div>
                  <div className="progress-track"><i style={{ width: `${percentage}%` }} /></div>
                  <button onClick={() => logHabit(habit.id)}>{habit.metric === 'boolean' ? (current ? 'Batalkan' : 'Tandai selesai') : `+1 ${habit.unit}`}</button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header"><div><h3>Keuangan bulan ini</h3><p>Ringkas, bukan dashboard akuntansi.</p></div><button className="text-button" onClick={() => onNavigate('finance')}>Detail <ArrowRight size={14} /></button></div>
          <div className="money-summary">
            <div><span>Pemasukan</span><strong className="positive">{formatCurrency(totals.income)}</strong></div>
            <div><span>Pengeluaran</span><strong>{formatCurrency(totals.expense)}</strong></div>
            <div className="money-net"><span>Selisih</span><strong>{formatCurrency(totals.income - totals.expense)}</strong></div>
          </div>
        </section>

        <section className="panel full-width">
          <div className="panel-header"><div><h3>Catatan terbaru</h3><p>Potongan konteks yang bisa ditemukan kembali lewat pencarian.</p></div><button className="text-button" onClick={() => onNavigate('notes')}>Semua catatan <ArrowRight size={14} /></button></div>
          <div className="note-preview-grid">
            {data.notes.slice(0, 3).map((note) => (
              <article key={note.id} className="note-preview-card">
                <span className={`note-type ${note.type}`}>{note.type === 'decision' ? 'Keputusan' : note.type === 'idea' ? 'Ide' : 'Catatan'}</span>
                <strong>{note.title}</strong>
                <p>{note.content}</p>
                <small><NotebookPen size={12} /> {data.projects.find((project) => project.id === note.projectId)?.name ?? 'Tanpa proyek'}</small>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
