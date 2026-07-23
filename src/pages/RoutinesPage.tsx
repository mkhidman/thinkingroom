import { useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { id } from 'date-fns/locale';
import { BellRing, Pencil, Plus, Settings2, Target, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { HabitModal } from '../components/HabitModal';
import { HabitLogModal } from '../components/HabitLogModal';
import { PrayerSettingsModal } from '../components/PrayerSettingsModal';
import type { Habit, PrayerName } from '../types';
import { toDayKey } from '../lib/format';
import { calculatePrayerTimes, defaultPrayerSettings } from '../lib/prayerTimes';

export const RoutinesPage = () => {
  const { data, logHabit, cyclePrayer, deleteHabit, updatePrayerSettings } = useAppStore();
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [loggingHabit, setLoggingHabit] = useState<Habit | null>(null);
  const [loggingDate, setLoggingDate] = useState(() => new Date());
  const [prayerSettingsOpen, setPrayerSettingsOpen] = useState(false);
  const today = new Date();
  const todayKey = toDayKey(today);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const prayerTimes = calculatePrayerTimes(today, data.prayerSettings);

  const editHabitLog = (habit: Habit, date: Date) => {
    if (habit.metric === 'boolean') {
      const key = toDayKey(date);
      logHabit(habit.id, habit.logs[key] ? 0 : 1, date);
      return;
    }
    setLoggingHabit(habit);
    setLoggingDate(date);
  };

  return (
    <div className="page-stack">
      <section className="section-toolbar">
        <div><h2 className="section-heading">Habit</h2><p className="section-description">Konsistensi ditampilkan sebagai pola mingguan, bukan skor kehidupan.</p></div>
        <button className="primary-button" onClick={() => { setEditingHabit(null); setHabitModalOpen(true); }}><Plus size={17} /> Habit baru</button>
      </section>

      <section className="panel habit-panel">
        <div className="habit-table-header">
          <div>Habit</div>
          {weekDays.map((day) => <div key={day.toISOString()}><span>{format(day, 'EEE', { locale: id })}</span><strong>{format(day, 'd')}</strong></div>)}
        </div>
        <div className="habit-table-body">
          {data.habits.map((habit) => {
            const weeklyCompletions = weekDays.filter((day) => (habit.logs[format(day, 'yyyy-MM-dd')] ?? 0) >= habit.targetValue).length;
            return (
              <article className="habit-table-row" key={habit.id}>
                <div className="habit-identity">
                  <div className="habit-title-actions">
                    <div><strong>{habit.name}</strong><span>Target {habit.targetPerWeek}x · {habit.targetValue} {habit.unit}{habit.paused ? ' · dijeda' : ''}</span></div>
                    <div className="row-actions always-visible">
                      <button className="row-action-button" onClick={() => { setEditingHabit(habit); setHabitModalOpen(true); }} aria-label="Edit habit"><Pencil size={13} /></button>
                      <button className="row-action-button danger" onClick={() => { if (window.confirm(`Hapus habit “${habit.name}” beserta seluruh lognya?`)) deleteHabit(habit.id); }} aria-label="Hapus habit"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="habit-mobile-progress"><i style={{ width: `${Math.min(100, (weeklyCompletions / habit.targetPerWeek) * 100)}%` }} /></div>
                </div>
                {weekDays.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const value = habit.logs[key] ?? 0;
                  const active = habit.daysOfWeek.includes(day.getDay());
                  const complete = value >= habit.targetValue;
                  return (
                    <button
                      key={key}
                      className={`habit-day-cell ${complete ? 'complete' : ''} ${!active ? 'inactive' : ''}`}
                      disabled={day.getTime() > today.getTime() || !active || habit.paused}
                      onClick={() => editHabitLog(habit, day)}
                      title={`${value}/${habit.targetValue} ${habit.unit}`}
                    >
                      {complete ? '✓' : value || '·'}
                    </button>
                  );
                })}
              </article>
            );
          })}
          {data.habits.length === 0 && <div className="empty-state habit-empty-state"><Target size={26} /><strong>Belum ada habit</strong><p>Tambahkan habit pertama untuk mulai mencatat progres.</p></div>}
        </div>
      </section>

      <div className="routine-grid">
        <section className="panel">
          <div className="panel-header"><div><h3>Habit hari ini</h3><p>Input cepat untuk progres parsial.</p></div><Target size={18} /></div>
          <div className="routine-card-list">
            {data.habits.filter((habit) => !habit.paused && habit.daysOfWeek.includes(today.getDay())).map((habit) => {
              const current = habit.logs[todayKey] ?? 0;
              const complete = current >= habit.targetValue;
              return (
                <article key={habit.id} className="routine-card">
                  <div><strong>{habit.name}</strong><span>{current}/{habit.targetValue} {habit.unit} · target {habit.targetPerWeek}x/minggu</span></div>
                  <button className={complete ? 'complete' : ''} onClick={() => editHabitLog(habit, today)}>{habit.metric === 'boolean' ? (complete ? 'Selesai' : 'Tandai') : 'Catat progres'}</button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div><h3>Sholat lima waktu</h3><p>{data.prayerSettings?.locationName ?? defaultPrayerSettings.locationName} · dihitung di perangkat.</p></div>
            <button className="row-action-button" onClick={() => setPrayerSettingsOpen(true)} aria-label="Atur lokasi dan metode waktu salat"><Settings2 size={16} /></button>
          </div>
          <div className="prayer-large-list">
            {(Object.keys(prayerTimes) as PrayerName[]).map((prayer) => {
              const status = data.prayers.find((item) => item.date === todayKey && item.prayer === prayer)?.status ?? 'belum';
              return (
                <button key={prayer} className={status !== 'belum' ? 'done' : ''} onClick={() => cyclePrayer(prayer)}>
                  <div><strong>{prayer}</strong><span>{prayerTimes[prayer]}</span></div>
                  <span>{status === 'belum' ? 'Belum' : status === 'tepat-waktu' ? 'Tepat waktu' : status === 'berjamaah' ? 'Berjamaah' : 'Selesai'}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel routine-notes-panel">
          <div className="panel-header"><div><h3>Aturan yang dijaga</h3><p>Agar tracker tidak berubah menjadi tekanan tambahan.</p></div><BellRing size={18} /></div>
          <ul className="plain-list">
            <li>Streak bukan satu-satunya ukuran; progres mingguan tetap terlihat meski satu hari terlewat.</li>
            <li>Habit dapat memiliki progres parsial, misalnya 5 dari 8 gelas.</li>
            <li>Hari aktif dan target mingguan dipisahkan untuk memberi ruang fleksibilitas.</li>
            <li>Sholat hanya mencatat status dan konteks opsional, tanpa nilai spiritual gabungan.</li>
          </ul>
        </section>
      </div>

      <HabitModal open={habitModalOpen} habit={editingHabit} onClose={() => { setHabitModalOpen(false); setEditingHabit(null); }} />
      <HabitLogModal
        open={Boolean(loggingHabit)}
        habit={loggingHabit}
        date={loggingDate}
        onSave={(value) => { if (loggingHabit) logHabit(loggingHabit.id, value, loggingDate); }}
        onClose={() => setLoggingHabit(null)}
      />
      <PrayerSettingsModal
        open={prayerSettingsOpen}
        settings={data.prayerSettings}
        onSave={updatePrayerSettings}
        onClose={() => setPrayerSettingsOpen(false)}
      />
    </div>
  );
};
