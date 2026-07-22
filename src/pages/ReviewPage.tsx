import { useMemo, useState } from 'react';
import { endOfWeek, format, isWithinInterval, parseISO, startOfWeek } from 'date-fns';
import { id } from 'date-fns/locale';
import { CheckCircle2, CircleDollarSign, MoonStar, Save, Target, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { formatCurrency, toDayKey, toMonthKey } from '../lib/format';
import { getMonthTotals } from '../lib/finance';

export const ReviewPage = () => {
  const { data, saveReview, resetData } = useAppStore();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekKey = format(weekStart, 'yyyy-MM-dd');
  const existing = data.reviews.find((review) => review.weekKey === weekKey);
  const [wins, setWins] = useState(existing?.wins ?? '');
  const [obstacles, setObstacles] = useState(existing?.obstacles ?? '');
  const [stopDoing, setStopDoing] = useState(existing?.stopDoing ?? '');
  const [nextFocus, setNextFocus] = useState(existing?.nextFocus ?? '');
  const [saved, setSaved] = useState(false);

  const completedTasks = data.tasks.filter((task) => task.completedAt && isWithinInterval(parseISO(task.completedAt), { start: weekStart, end: weekEnd }));
  const habitStats = useMemo(() => {
    let scheduled = 0;
    let completed = 0;
    data.habits.forEach((habit) => {
      for (let index = 0; index < 7; index += 1) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        if (!habit.daysOfWeek.includes(date.getDay())) continue;
        scheduled += 1;
        if ((habit.logs[toDayKey(date)] ?? 0) >= habit.targetValue) completed += 1;
      }
    });
    return { scheduled, completed };
  }, [data.habits, weekStart]);
  const prayerCount = data.prayers.filter((prayer) => prayer.status !== 'belum' && isWithinInterval(parseISO(`${prayer.date}T12:00:00`), { start: weekStart, end: weekEnd })).length;
  const financeTotals = getMonthTotals(data.transactions, toMonthKey(now));
  const stalledProjects = data.projects.filter((project) => {
    const active = data.tasks.filter((task) => task.projectId === project.id && task.status === 'todo');
    return active.length > 0 && active.every((task) => !task.dueAt);
  });

  const clearAllData = () => {
    if (!window.confirm('Hapus seluruh data aplikasi? Backup otomatis akan dibuat sebelum penghapusan.')) return;
    resetData();
  };

  const submit = () => {
    saveReview({ weekKey, wins, obstacles, stopDoing, nextFocus, updatedAt: new Date().toISOString() });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="page-stack">
      <section className="review-intro">
        <div><span className="eyebrow">{format(weekStart, 'd MMM', { locale: id })} – {format(weekEnd, 'd MMM yyyy', { locale: id })}</span><h2>Review bukan penilaian diri.</h2><p>Tujuannya menemukan pola, keputusan yang perlu dibuat, dan fokus realistis untuk minggu berikutnya.</p></div>
        <button className="danger-button" onClick={clearAllData}><Trash2 size={16} /> Hapus seluruh data</button>
      </section>

      <section className="review-metrics">
        <article><CheckCircle2 size={19} /><div><span>Tugas selesai</span><strong>{completedTasks.length}</strong></div></article>
        <article><Target size={19} /><div><span>Habit tercapai</span><strong>{habitStats.completed}/{habitStats.scheduled}</strong></div></article>
        <article><MoonStar size={19} /><div><span>Sholat tercatat</span><strong>{prayerCount}</strong></div></article>
        <article><CircleDollarSign size={19} /><div><span>Pengeluaran bulan</span><strong>{formatCurrency(financeTotals.expense)}</strong></div></article>
      </section>

      <div className="content-split review-split">
        <section className="panel review-form-panel">
          <div className="panel-header"><div><h3>Refleksi mingguan</h3><p>Teks disimpan per minggu dan bisa ditinjau kembali.</p></div></div>
          <div className="review-form">
            <label className="field"><span>Apa yang berjalan baik?</span><textarea rows={4} value={wins} onChange={(event) => setWins(event.target.value)} placeholder="Hasil, kebiasaan, atau keputusan yang membantu…" /></label>
            <label className="field"><span>Apa yang menghambat?</span><textarea rows={4} value={obstacles} onChange={(event) => setObstacles(event.target.value)} placeholder="Bukan menyalahkan diri; cari pola dan hambatan nyata…" /></label>
            <label className="field"><span>Apa yang perlu dihentikan atau dikurangi?</span><textarea rows={4} value={stopDoing} onChange={(event) => setStopDoing(event.target.value)} /></label>
            <label className="field"><span>Maksimal tiga fokus minggu depan</span><textarea rows={4} value={nextFocus} onChange={(event) => setNextFocus(event.target.value)} placeholder="1. …\n2. …\n3. …" /></label>
          </div>
          <div className="modal-actions"><button className="primary-button" onClick={submit}><Save size={16} /> {saved ? 'Tersimpan' : 'Simpan review'}</button></div>
        </section>

        <aside className="right-stack">
          <section className="panel">
            <div className="panel-header"><div><h3>Proyek yang perlu diperhatikan</h3><p>Data diarahkan menjadi keputusan, bukan hanya statistik.</p></div></div>
            <div className="project-review-list">
              {data.projects.map((project) => {
                const active = data.tasks.filter((task) => task.projectId === project.id && task.status !== 'done').length;
                const completed = completedTasks.filter((task) => task.projectId === project.id).length;
                return <article key={project.id}><i style={{ background: project.color }} /><div><strong>{project.name}</strong><span>{active} aktif · {completed} selesai minggu ini</span></div></article>;
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header"><div><h3>Sinyal yang perlu dicek</h3><p>Bukan vonis otomatis; hanya pemicu untuk meninjau.</p></div></div>
            <ul className="plain-list">
              <li>{habitStats.scheduled ? Math.round((habitStats.completed / habitStats.scheduled) * 100) : 0}% kejadian habit mencapai target minggu ini.</li>
              <li>{data.tasks.filter((task) => task.status === 'waiting').length} item masih berada dalam waiting list.</li>
              <li>{stalledProjects.length || 'Tidak ada'} proyek aktif belum memiliki tugas bertanggal.</li>
              <li>Selisih pemasukan dan pengeluaran bulan ini: {formatCurrency(financeTotals.income - financeTotals.expense)}.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};
