import { useEffect, useMemo, useState } from 'react';
import { CheckSquare2, CircleDollarSign, NotebookPen } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from './Modal';
import { useAppStore } from '../store/AppStore';
import { toDateInput } from '../lib/format';

interface QuickCaptureModalProps {
  open: boolean;
  onClose: () => void;
}

type CaptureType = 'task' | 'note' | 'expense';

export const QuickCaptureModal = ({ open, onClose }: QuickCaptureModalProps) => {
  const { data, addTask, addNote, addTransaction } = useAppStore();
  const [type, setType] = useState<CaptureType>('task');
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(toDateInput());
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? '');
  const [category, setCategory] = useState('Makan');

  useEffect(() => {
    if (!open || type !== 'expense') return;
    if (!data.accounts.some((account) => account.id === accountId)) {
      setAccountId(data.accounts[0]?.id ?? '');
    }
  }, [open, type, data.accounts, accountId]);

  useEffect(() => {
    if (!open || type === 'expense') return;
    const exists = data.projects.some(
      (project) => project.id === projectId && project.status !== 'done'
    );
    if (!exists) {
      setProjectId(
        data.projects.find((project) => project.status === 'active')?.id ??
          data.projects.find((project) => project.status !== 'done')?.id ??
          ''
      );
    }
  }, [open, type, data.projects, projectId]);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (type === 'expense') return Number(amount) > 0 && Boolean(accountId);
    return true;
  }, [title, type, amount, accountId]);

  const resetAndClose = () => {
    setTitle('');
    setAmount('');
    onClose();
  };

  const submit = () => {
    if (!canSubmit) return;

    if (type === 'task') {
      addTask({
        title: title.trim(),
        projectId: projectId || undefined,
        priority: 2,
        dueAt: new Date(`${date}T09:00:00`).toISOString(),
        estimateMinutes: 30
      });
    } else if (type === 'note') {
      addNote({
        title: title.trim().slice(0, 80),
        content: title.trim(),
        type: 'note',
        projectId: projectId || undefined,
        tags: []
      });
    } else {
      addTransaction({
        type: 'expense',
        amount: Number(amount),
        accountId,
        category,
        note: title.trim(),
        date: format(new Date(`${date}T12:00:00`), 'yyyy-MM-dd')
      });
    }
    resetAndClose();
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Tangkap cepat"
      description="Masukkan dulu. Detail bisa dirapikan setelahnya."
    >
      <div className="segmented-control">
        <button className={type === 'task' ? 'active' : ''} onClick={() => setType('task')}>
          <CheckSquare2 size={16} /> Tugas
        </button>
        <button className={type === 'note' ? 'active' : ''} onClick={() => setType('note')}>
          <NotebookPen size={16} /> Catatan
        </button>
        <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>
          <CircleDollarSign size={16} /> Pengeluaran
        </button>
      </div>

      <label className="field full-field">
        <span>{type === 'expense' ? 'Untuk apa pengeluarannya?' : 'Apa yang ingin dicatat?'}</span>
        <textarea
          rows={3}
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={type === 'task' ? 'Contoh: bayar uang sekolah tanggal 25' : type === 'note' ? 'Tulis ide atau pemikiran singkat…' : 'Contoh: belanja sayur dan kebutuhan dapur'}
        />
      </label>

      <div className="form-grid two-columns">
        {type !== 'expense' && (
          <label className="field">
            <span>Proyek</span>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">Tanpa proyek</option>
              {data.projects.filter((project) => project.status !== 'done').map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}{project.status === 'paused' ? ' — Dijeda' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span>Tanggal</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>

        {type === 'expense' && (
          <>
            <label className="field">
              <span>Jumlah</span>
              <input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
            </label>
            <label className="field">
              <span>Rekening</span>
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                {data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Kategori</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {['Makan', 'Rumah Tangga', 'Transportasi', 'Pendidikan', 'Tagihan', 'Kesehatan', 'Lainnya'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </>
        )}
      </div>

      <div className="modal-actions">
        <button className="secondary-button" onClick={resetAndClose}>Batal</button>
        <button className="primary-button" disabled={!canSubmit} onClick={submit}>Simpan</button>
      </div>
    </Modal>
  );
};
