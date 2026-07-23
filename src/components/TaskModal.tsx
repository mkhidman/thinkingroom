import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Modal } from './Modal';
import { useAppStore } from '../store/AppStore';
import type { Priority, RecurrenceFrequency, RecurrenceMode, Task, TaskStatus } from '../types';
import { toDateInput } from '../lib/format';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
}

const dayOptions = [
  { value: 1, label: 'Sen' },
  { value: 2, label: 'Sel' },
  { value: 3, label: 'Rab' },
  { value: 4, label: 'Kam' },
  { value: 5, label: 'Jum' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Min' }
];

const datePart = (value?: string, fallback = toDateInput()) => value ? format(parseISO(value), 'yyyy-MM-dd') : fallback;
const timePart = (value?: string, fallback = '09:00') => value ? format(parseISO(value), 'HH:mm') : fallback;
const toIso = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();

export const TaskModal = ({ open, onClose, task }: TaskModalProps) => {
  const { data, addTask, updateTask } = useAppStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<Priority>(2);
  const [date, setDate] = useState(toDateInput());
  const [time, setTime] = useState('09:00');
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState(toDateInput());
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState(toDateInput());
  const [reminderTime, setReminderTime] = useState('08:30');
  const [estimate, setEstimate] = useState('30');
  const [labels, setLabels] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly');
  const [interval, setInterval] = useState('1');
  const [mode, setMode] = useState<RecurrenceMode>('fixed_schedule');
  const [days, setDays] = useState<number[]>([1]);
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [overflow, setOverflow] = useState<'last_day' | 'skip_month'>('last_day');
  const [endMode, setEndMode] = useState<'never' | 'date' | 'count'>('never');
  const [endDate, setEndDate] = useState('');
  const [maxOccurrences, setMaxOccurrences] = useState('');

  useEffect(() => {
    if (!open) return;
    const scheduleDate = datePart(task?.dueAt);
    const scheduleTime = timePart(task?.dueAt);
    const recurrence = task?.recurrence;

    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setProjectId(task?.projectId ?? '');
    setStatus(task?.status ?? 'todo');
    setPriority(task?.priority ?? 2);
    setDate(scheduleDate);
    setTime(scheduleTime);
    setDeadlineEnabled(Boolean(task?.deadlineAt));
    setDeadlineDate(datePart(task?.deadlineAt, scheduleDate));
    setDeadlineTime(timePart(task?.deadlineAt, '23:59'));
    setReminderEnabled(Boolean(task?.reminderAt));
    setReminderDate(datePart(task?.reminderAt, scheduleDate));
    setReminderTime(timePart(task?.reminderAt, '08:30'));
    setEstimate(task?.estimateMinutes ? String(task.estimateMinutes) : '30');
    setLabels(task?.labels.join(', ') ?? '');
    setRecurring(Boolean(recurrence));
    setFrequency(recurrence?.frequency ?? 'weekly');
    setInterval(String(recurrence?.interval ?? 1));
    setMode(recurrence?.mode ?? 'fixed_schedule');
    setDays(recurrence?.daysOfWeek?.length ? recurrence.daysOfWeek : [new Date(`${scheduleDate}T12:00:00`).getDay()]);
    setDayOfMonth(String(recurrence?.dayOfMonth ?? Number(scheduleDate.slice(-2))));
    setOverflow(recurrence?.monthlyOverflow ?? 'last_day');
    setEndMode(recurrence?.endDate ? 'date' : recurrence?.maxOccurrences ? 'count' : 'never');
    setEndDate(recurrence?.endDate ? format(parseISO(recurrence.endDate), 'yyyy-MM-dd') : '');
    setMaxOccurrences(recurrence?.maxOccurrences ? String(recurrence.maxOccurrences) : '');
  }, [open, task]);

  useEffect(() => {
    if (!open || !projectId) return;
    const exists = data.projects.some(
      (project) => project.id === projectId && (project.status !== 'done' || project.id === task?.projectId)
    );
    if (!exists) setProjectId('');
  }, [open, data.projects, projectId, task?.projectId]);

  const scheduleAt = useMemo(() => toIso(date, time), [date, time]);
  const deadlineAt = useMemo(
    () => deadlineEnabled ? toIso(deadlineDate, deadlineTime) : undefined,
    [deadlineEnabled, deadlineDate, deadlineTime]
  );
  const reminderAt = useMemo(
    () => reminderEnabled ? toIso(reminderDate, reminderTime) : undefined,
    [reminderEnabled, reminderDate, reminderTime]
  );
  const deadlineInvalid = Boolean(deadlineAt && new Date(deadlineAt).getTime() < new Date(scheduleAt).getTime());
  const reminderInvalid = Boolean(reminderAt && new Date(reminderAt).getTime() > new Date(deadlineAt ?? scheduleAt).getTime());
  const canSubmit = title.trim().length > 0 && !deadlineInvalid && !reminderInvalid && (!recurring || days.length > 0 || frequency !== 'weekly' || mode !== 'fixed_schedule');

  const toggleDay = (day: number) => {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  };

  const close = () => onClose();

  const submit = () => {
    if (!canSubmit) return;
    const recurrence = recurring ? {
      frequency,
      interval: Math.max(1, Number(interval) || 1),
      mode,
      daysOfWeek: frequency === 'weekly' && mode === 'fixed_schedule' ? days : undefined,
      dayOfMonth: frequency === 'monthly' && mode === 'fixed_schedule' ? Math.min(31, Math.max(1, Number(dayOfMonth) || 1)) : undefined,
      monthlyOverflow: frequency === 'monthly' ? overflow : undefined,
      endDate: endMode === 'date' && endDate ? new Date(`${endDate}T23:59:59`).toISOString() : undefined,
      maxOccurrences: endMode === 'count' ? Math.max(1, Number(maxOccurrences) || 1) : undefined,
      occurrenceCount: task?.recurrence?.occurrenceCount ?? 1,
      paused: task?.recurrence?.paused,
      anchorDate: task?.recurrence?.anchorDate ?? format(new Date(`${date}T12:00:00`), 'yyyy-MM-dd')
    } : undefined;

    const taskValue = {
      title: title.trim(),
      description: description.trim() || undefined,
      projectId: projectId || undefined,
      status,
      priority,
      dueAt: scheduleAt,
      deadlineAt,
      reminderAt,
      estimateMinutes: Number(estimate) || undefined,
      labels: labels.split(',').map((item) => item.trim()).filter(Boolean),
      subtasks: task?.subtasks ?? [],
      recurrence,
      seriesId: task?.seriesId,
      completedAt: status === 'done' ? (task?.completedAt ?? new Date().toISOString()) : undefined
    };

    if (task) updateTask(task.id, taskValue);
    else addTask(taskValue);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={task ? 'Edit tugas' : 'Tugas baru'}
      description="Jadwal pengerjaan dan deadline dipisahkan agar tugas bisa direncanakan sekaligus dipantau batas akhirnya."
      wide
    >
      <div className="form-grid two-columns">
        <label className="field full-field">
          <span>Nama tugas</span>
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Apa hasil yang ingin diselesaikan?" />
        </label>
        <label className="field full-field">
          <span>Deskripsi</span>
          <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Konteks, hasil akhir, atau catatan penting…" />
        </label>
        <label className="field">
          <span>Proyek</span>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Tanpa proyek</option>
            {data.projects.filter((project) => project.status !== 'done' || project.id === task?.projectId).map((project) => (
              <option key={project.id} value={project.id}>{project.name}{project.status === 'paused' ? ' — Dijeda' : project.status === 'done' ? ' — Selesai' : ''}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
            <option value="todo">Perlu dikerjakan</option>
            <option value="waiting">Menunggu</option>
            <option value="done">Selesai</option>
          </select>
        </label>
        <label className="field">
          <span>Prioritas</span>
          <select value={priority} onChange={(event) => setPriority(Number(event.target.value) as Priority)}>
            <option value={1}>P1 — Mendesak</option>
            <option value={2}>P2 — Penting</option>
            <option value={3}>P3 — Normal</option>
            <option value={4}>P4 — Rendah</option>
          </select>
        </label>
        <label className="field">
          <span>Estimasi menit</span>
          <input inputMode="numeric" value={estimate} onChange={(event) => setEstimate(event.target.value.replace(/[^0-9]/g, ''))} />
        </label>
        <label className="field full-field">
          <span>Label, pisahkan dengan koma</span>
          <input value={labels} onChange={(event) => setLabels(event.target.value)} placeholder="contoh: tagihan, operasional" />
        </label>
      </div>

      <div className="advanced-panel task-date-panel">
        <div className="panel-header compact-header"><div><h3>Jadwal pengerjaan</h3><p>Kapan tugas direncanakan mulai atau dikerjakan.</p></div></div>
        <div className="form-grid two-columns">
          <label className="field"><span>Tanggal jadwal</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label className="field"><span>Waktu jadwal</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
        </div>
      </div>

      <div className="advanced-panel">
        <label className="toggle-row">
          <div><strong>Tambahkan deadline</strong><span>Batas akhir penyelesaian, terpisah dari jadwal pengerjaan.</span></div>
          <input type="checkbox" checked={deadlineEnabled} onChange={(event) => setDeadlineEnabled(event.target.checked)} />
        </label>
        {deadlineEnabled && (
          <div className="form-grid two-columns recurrence-fields">
            <label className="field"><span>Tanggal deadline</span><input type="date" value={deadlineDate} min={date} onChange={(event) => setDeadlineDate(event.target.value)} /></label>
            <label className="field"><span>Waktu deadline</span><input type="time" value={deadlineTime} onChange={(event) => setDeadlineTime(event.target.value)} /></label>
            {deadlineInvalid && <p className="validation-message full-field">Deadline tidak boleh lebih awal daripada jadwal pengerjaan.</p>}
          </div>
        )}
      </div>

      <div className="advanced-panel">
        <label className="toggle-row">
          <div><strong>Reminder khusus</strong><span>Opsional. Jika kosong, aplikasi memakai aturan reminder global.</span></div>
          <input type="checkbox" checked={reminderEnabled} onChange={(event) => setReminderEnabled(event.target.checked)} />
        </label>
        {reminderEnabled && (
          <div className="form-grid two-columns recurrence-fields">
            <label className="field"><span>Tanggal reminder</span><input type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} /></label>
            <label className="field"><span>Waktu reminder</span><input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} /></label>
            {reminderInvalid && <p className="validation-message full-field">Reminder harus terjadi sebelum jadwal atau deadline tugas.</p>}
          </div>
        )}
      </div>

      <div className="advanced-panel">
        <label className="toggle-row">
          <div><strong>Ulangi tugas</strong><span>Gunakan untuk tagihan, review, checklist, atau rutinitas kerja.</span></div>
          <input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} />
        </label>

        {recurring && (
          <div className="recurrence-fields">
            <div className="form-grid three-columns">
              <label className="field"><span>Ulangi setiap</span><input inputMode="numeric" value={interval} onChange={(event) => setInterval(event.target.value.replace(/[^0-9]/g, ''))} /></label>
              <label className="field"><span>Periode</span><select value={frequency} onChange={(event) => setFrequency(event.target.value as RecurrenceFrequency)}><option value="daily">Hari</option><option value="weekly">Minggu</option><option value="monthly">Bulan</option></select></label>
              <label className="field"><span>Dasar jadwal</span><select value={mode} onChange={(event) => setMode(event.target.value as RecurrenceMode)}><option value="fixed_schedule">Tanggal tetap</option><option value="after_completion">Setelah selesai</option></select></label>
            </div>

            {frequency === 'weekly' && mode === 'fixed_schedule' && (
              <div className="field full-field"><span>Hari aktif</span><div className="weekday-picker">{dayOptions.map((day) => <button key={day.value} type="button" className={days.includes(day.value) ? 'active' : ''} onClick={() => toggleDay(day.value)}>{day.label}</button>)}</div></div>
            )}

            {frequency === 'monthly' && mode === 'fixed_schedule' && (
              <div className="form-grid two-columns">
                <label className="field"><span>Tanggal setiap bulan</span><input inputMode="numeric" value={dayOfMonth} onChange={(event) => setDayOfMonth(event.target.value.replace(/[^0-9]/g, ''))} /></label>
                <label className="field"><span>Jika tanggal tidak tersedia</span><select value={overflow} onChange={(event) => setOverflow(event.target.value as typeof overflow)}><option value="last_day">Gunakan hari terakhir bulan</option><option value="skip_month">Lewati bulan tersebut</option></select></label>
              </div>
            )}

            <div className="form-grid two-columns">
              <label className="field"><span>Berakhir</span><select value={endMode} onChange={(event) => setEndMode(event.target.value as typeof endMode)}><option value="never">Tidak pernah</option><option value="date">Pada tanggal tertentu</option><option value="count">Setelah beberapa kejadian</option></select></label>
              {endMode === 'date' && <label className="field"><span>Tanggal akhir</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>}
              {endMode === 'count' && <label className="field"><span>Jumlah kejadian</span><input inputMode="numeric" value={maxOccurrences} onChange={(event) => setMaxOccurrences(event.target.value.replace(/[^0-9]/g, ''))} /></label>}
            </div>
            <p className="form-hint">Pada tugas berulang, jarak antara jadwal dan deadline dipertahankan untuk kejadian berikutnya.</p>
          </div>
        )}
      </div>

      <div className="modal-actions">
        <button className="secondary-button" onClick={close}>Batal</button>
        <button className="primary-button" disabled={!canSubmit} onClick={submit}>{task ? 'Simpan perubahan' : 'Simpan tugas'}</button>
      </div>
    </Modal>
  );
};
