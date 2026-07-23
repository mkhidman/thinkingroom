import { format, startOfDay } from 'date-fns';
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
import { compareTasksByAttention, isTaskDeadlineOverdue, isTaskScheduleDeferred, taskNeedsAttentionToday } from '../lib/taskTracking';
import { calculatePrayerTimes, getNextPrayer } from '../lib/prayerTimes';

interface TodayPageProps {
  onNavigate: (page: PageId) => void;
}

export const TodayPage = ({ onNavigate }: TodayPageProps) => {
  const { data, toggleTask, updateTask, logHabit, cyclePrayer } = useAppStore();
  const calendarStore = useCalendarStore();
  const now = new Date();
  const dayKey = toDayKey(now);
  const prayerTimes = calculatePrayerTimes(now, data.prayerSettings);
  const monthKey = toMonthKey(now);
  const todayTasks = data.tasks
    .filter((task) => taskNeedsAttentionToday(task, now))
    .sort((a, b) => compareTasksByAttention(a, b, now));
  const overdueCount = data.tasks.filter((task) => isTaskDeadlineOverdue(task, now)).length;
  const deferredCount = data.tasks.filter((task) => isTaskScheduleDeferred(task, now)).length;
  const focusTasks = todayTasks.slice(0, 3);
  const nextTask = focusTasks[0];
  const todayPrayers = (Object.keys(prayerTimes) as PrayerName[]).map((prayer) => ({
    prayer,
    time: prayerTimes[prayer],
    status: data.prayers.find((item) => item.date === dayKey && item.prayer === prayer)?.status ?? 'belum'
  }));
  const nextPrayerTime = getNextPrayer(prayerTimes, now);
  const nextPrayer = {
    ...nextPrayerTime,
    status: data.prayers.find((item) => item.date === dayKey && item.prayer === nextPrayerTime.prayer)?.status ?? 'belum'
  };
  const dueHabits = data.habits.filter((habit) => habit.daysOfWeek.includes(now.getDay()) && !habit.paused);
  const totals = getMonthTotals(data.transactions, monthKey);
  const totalBalance = data.accounts.reduce((sum, account) => sum + getAccountBalance(account, data.transactions), 0);
  const todayCalendarEvents = calendarStore.eventsBetween(startOfDay(now), new Date(startOfDay(now).getTime() + 24 * 60 * 60 * 1000)).slice(0, 4);
  const calendarMap = new Map(calendarStore.calendars.map((calendar) => [calendar.id, calendar]));

  const scheduleTaskToday = (task: (typeof data.tasks)[number]) => {
    const { id: _id, createdAt: _createdAt, ...updates } = task;
    const next = new Date();
    next.setSeconds(0, 0);
    updateTask(task.id, {
      ...updates,
      dueAt: next.toISOString(),
      reminderAt: task.reminderAt && new Date(task.reminderAt).getTime() > next.getTime() ? task.reminderAt : undefined
    });
  };

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
          <p>{nextPrayer.time}{nextPrayer.tomorrow ? ' besok' : ''} · {nextPrayer.status === 'belum' ? 'belum dicatat' : nextPrayer.status}</p>
          <button onClick={() => cyclePrayer(nextPrayer.prayer)}>Perbarui status</button>
        </div>
      </section>

      <section className="summary-strip">
        <div><Target size={18} /><span><strong>{todayTasks.length}</strong> perlu perhatian{deferredCount ? ` · ${deferredCount} tertunda` : ''}{overdueCount ? ` · ${overdueCount} terlambat` : ''}</span></div>
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
            <div><h3>Tiga fokus hari ini</h3><p>Termasuk tugas dengan jadwal terlewat agar tidak menghilang dari perhatian.</p></div>
            <button className="text-button" onClick={() => onNavigate('tasks')}>Tugas & proyek <ArrowRight size={14} /></button>
          </div>
          <div className="list-stack">
            {focusTasks.length > 0 ? focusTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                project={data.projects.find((project) => project.id === task.projectId)}
                onToggle={() => toggleTask(task.id)}
                onScheduleToday={isTaskScheduleDeferred(task, now) ? () => scheduleTaskToday(task) : undefined}
              />
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
                  <button onClick={() => logHabit(habit.id, current >= habit.targetValue ? 0 : habit.targetValue)}>
                    {current >= habit.targetValue ? 'Batalkan' : 'Catat target'}
                  </button>
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
            {[...data.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3).map((note) => (
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
