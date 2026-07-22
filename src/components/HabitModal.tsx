import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { useAppStore } from '../store/AppStore';
import type { Habit, HabitMetric } from '../types';

interface HabitModalProps {
  open: boolean;
  onClose: () => void;
  habit?: Habit | null;
}

const days = [
  { value: 1, label: 'Sen' }, { value: 2, label: 'Sel' }, { value: 3, label: 'Rab' },
  { value: 4, label: 'Kam' }, { value: 5, label: 'Jum' }, { value: 6, label: 'Sab' }, { value: 0, label: 'Min' }
];

export const HabitModal = ({ open, onClose, habit }: HabitModalProps) => {
  const { addHabit, updateHabit } = useAppStore();
  const [name, setName] = useState('');
  const [metric, setMetric] = useState<HabitMetric>('boolean');
  const [targetValue, setTargetValue] = useState('1');
  const [unit, setUnit] = useState('selesai');
  const [targetPerWeek, setTargetPerWeek] = useState('5');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [reminder, setReminder] = useState('07:00');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name ?? '');
    setMetric(habit?.metric ?? 'boolean');
    setTargetValue(String(habit?.targetValue ?? 1));
    setUnit(habit?.unit ?? 'selesai');
    setTargetPerWeek(String(habit?.targetPerWeek ?? 5));
    setSelectedDays(habit?.daysOfWeek ?? [1, 2, 3, 4, 5]);
    setReminder(habit?.reminderTime ?? '07:00');
    setPaused(Boolean(habit?.paused));
  }, [open, habit]);

  const canSubmit = useMemo(() => name.trim().length > 0 && selectedDays.length > 0, [name, selectedDays]);

  const changeMetric = (nextMetric: HabitMetric) => {
    setMetric(nextMetric);
    if (habit) return;
    if (nextMetric === 'boolean') {
      setTargetValue('1');
      setUnit('selesai');
    } else if (nextMetric === 'duration') {
      setTargetValue('10');
      setUnit('menit');
    } else {
      setTargetValue('8');
      setUnit('kali');
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  };

  const submit = () => {
    if (!canSubmit) return;
    const value = {
      name: name.trim(),
      metric,
      targetValue: Math.max(1, Number(targetValue) || 1),
      unit: unit.trim() || 'kali',
      targetPerWeek: Math.max(1, Number(targetPerWeek) || 1),
      daysOfWeek: selectedDays,
      reminderTime: reminder || undefined,
      paused
    };
    if (habit) updateHabit(habit.id, value);
    else addHabit(value);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={habit ? 'Edit habit' : 'Habit baru'} description="Habit memakai jadwal dan log progres, bukan membuat tugas baru setiap kali." wide>
      <div className="form-grid two-columns">
        <label className="field full-field">
          <span>Nama habit</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: jalan kaki 20 menit" />
        </label>
        <label className="field">
          <span>Tipe pencatatan</span>
          <select value={metric} onChange={(event) => changeMetric(event.target.value as HabitMetric)}>
            <option value="boolean">Ya / tidak</option>
            <option value="count">Jumlah</option>
            <option value="duration">Durasi</option>
          </select>
        </label>
        <label className="field">
          <span>Target per kejadian</span>
          <div className="inline-inputs">
            <input inputMode="numeric" value={targetValue} onChange={(event) => setTargetValue(event.target.value.replace(/[^0-9]/g, ''))} />
            <input value={unit} onChange={(event) => setUnit(event.target.value)} />
          </div>
        </label>
        <label className="field">
          <span>Target mingguan</span>
          <input inputMode="numeric" value={targetPerWeek} onChange={(event) => setTargetPerWeek(event.target.value.replace(/[^0-9]/g, ''))} />
        </label>
        <label className="field">
          <span>Waktu pengingat</span>
          <input type="time" value={reminder} onChange={(event) => setReminder(event.target.value)} />
        </label>
        <label className="field">
          <span>Status</span>
          <select value={paused ? 'paused' : 'active'} onChange={(event) => setPaused(event.target.value === 'paused')}>
            <option value="active">Aktif</option>
            <option value="paused">Dijeda</option>
          </select>
        </label>
        <div className="field full-field">
          <span>Hari aktif</span>
          <div className="weekday-picker">
            {days.map((day) => <button key={day.value} type="button" className={selectedDays.includes(day.value) ? 'active' : ''} onClick={() => toggleDay(day.value)}>{day.label}</button>)}
          </div>
        </div>
      </div>
      <p className="form-hint">Riwayat progres lama tetap dipertahankan saat habit diedit. Menghapus habit akan ikut menghapus seluruh log habit tersebut.</p>
      <div className="modal-actions">
        <button className="secondary-button" onClick={onClose}>Batal</button>
        <button className="primary-button" disabled={!canSubmit} onClick={submit}>{habit ? 'Simpan perubahan' : 'Simpan habit'}</button>
      </div>
    </Modal>
  );
};
