import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { useAppStore } from '../store/AppStore';
import type { Budget } from '../types';
import { toMonthKey } from '../lib/format';

interface BudgetModalProps {
  open: boolean;
  onClose: () => void;
  budget?: Budget | null;
  defaultMonth?: string;
}

export const BudgetModal = ({ open, onClose, budget, defaultMonth }: BudgetModalProps) => {
  const { addBudget, updateBudget } = useAppStore();
  const [category, setCategory] = useState('Makan');
  const [limit, setLimit] = useState('');
  const [month, setMonth] = useState(toMonthKey());

  useEffect(() => {
    if (!open) return;
    setCategory(budget?.category ?? 'Makan');
    setLimit(budget ? String(budget.limit) : '');
    setMonth(budget?.month ?? defaultMonth ?? toMonthKey());
  }, [open, budget, defaultMonth]);

  const canSubmit = useMemo(() => category.trim().length > 0 && Number(limit) > 0 && /^\d{4}-\d{2}$/.test(month), [category, limit, month]);

  const submit = () => {
    if (!canSubmit) return;
    const value = { category: category.trim(), limit: Number(limit), month };
    if (budget) updateBudget(budget.id, value);
    else addBudget(value);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={budget ? 'Edit anggaran' : 'Anggaran baru'} description="Anggaran disimpan per kategori dan bulan.">
      <div className="form-grid">
        <label className="field"><span>Kategori</span><input autoFocus value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Contoh: Makan" /></label>
        <label className="field"><span>Batas anggaran</span><input inputMode="numeric" value={limit} onChange={(event) => setLimit(event.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></label>
        <label className="field"><span>Bulan</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
      </div>
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Batal</button><button className="primary-button" disabled={!canSubmit} onClick={submit}>{budget ? 'Simpan perubahan' : 'Simpan anggaran'}</button></div>
    </Modal>
  );
};
