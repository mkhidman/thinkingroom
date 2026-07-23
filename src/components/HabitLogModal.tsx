import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { Habit } from '../types';
import { Modal } from './Modal';

interface HabitLogModalProps {
  open: boolean;
  habit: Habit | null;
  date: Date;
  onSave: (value: number) => void;
  onClose: () => void;
}

export const HabitLogModal = ({ open, habit, date, onSave, onClose }: HabitLogModalProps) => {
  const dayKey = format(date, 'yyyy-MM-dd');
  const [value, setValue] = useState('0');

  useEffect(() => {
    if (!open || !habit) return;
    setValue(String(habit.logs[dayKey] ?? 0));
  }, [open, habit, dayKey]);

  const numericValue = Number(value);
  const canSubmit = useMemo(
    () => Number.isFinite(numericValue) && numericValue >= 0,
    [numericValue]
  );

  if (!habit) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Catat ${habit.name}`} description={format(date, 'EEEE, d MMMM yyyy', { locale: id })}>
      <label className="field">
        <span>Progres ({habit.unit})</span>
        <input autoFocus type="number" min="0" step="1" value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <div className="habit-log-presets">
        <button type="button" className="secondary-button" onClick={() => setValue('0')}>Kosongkan</button>
        <button type="button" className="secondary-button" onClick={() => setValue(String(habit.targetValue))}>Target {habit.targetValue}</button>
      </div>
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Batal</button><button className="primary-button" disabled={!canSubmit} onClick={() => { onSave(numericValue); onClose(); }}>Simpan progres</button></div>
    </Modal>
  );
};
