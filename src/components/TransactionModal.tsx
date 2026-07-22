import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { useAppStore } from '../store/AppStore';
import type { Transaction, TransactionType } from '../types';
import { toDateInput } from '../lib/format';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
}

const expenseCategories = ['Makan', 'Rumah Tangga', 'Transportasi', 'Pendidikan', 'Tagihan', 'Kesehatan', 'Sedekah', 'Lainnya'];
const incomeCategories = ['Pendapatan', 'Bonus', 'Penjualan', 'Pengembalian', 'Lainnya'];

export const TransactionModal = ({ open, onClose, transaction }: TransactionModalProps) => {
  const { data, addTransaction, updateTransaction } = useAppStore();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [category, setCategory] = useState('Makan');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toDateInput());

  useEffect(() => {
    if (!open) return;
    const defaultFrom = data.accounts[0]?.id ?? '';
    const currentFrom = transaction?.accountId && data.accounts.some((account) => account.id === transaction.accountId)
      ? transaction.accountId
      : defaultFrom;
    const defaultTo = data.accounts.find((account) => account.id !== currentFrom)?.id ?? '';
    setType(transaction?.type ?? 'expense');
    setAmount(transaction ? String(transaction.amount) : '');
    setAccountId(currentFrom);
    setToAccountId(transaction?.toAccountId ?? defaultTo);
    setCategory(transaction?.category ?? 'Makan');
    setNote(transaction?.note ?? '');
    setDate(transaction?.date ?? toDateInput());
  }, [open, transaction, data.accounts]);

  const categories = type === 'income' ? incomeCategories : expenseCategories;
  const canSubmit = useMemo(() => {
    if (!Number(amount) || !accountId || !note.trim()) return false;
    if (type === 'transfer') return Boolean(toAccountId) && toAccountId !== accountId;
    return true;
  }, [amount, accountId, note, type, toAccountId]);

  const changeType = (nextType: TransactionType) => {
    setType(nextType);
    setCategory(nextType === 'income' ? 'Pendapatan' : nextType === 'expense' ? 'Makan' : 'Transfer');
  };

  const submit = () => {
    if (!canSubmit) return;
    const value = {
      type,
      amount: Number(amount),
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      category: type === 'transfer' ? 'Transfer' : category,
      note: note.trim(),
      date
    };
    if (transaction) updateTransaction(transaction.id, value);
    else addTransaction(value);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={transaction ? 'Edit transaksi' : 'Transaksi baru'} description="Pemasukan, pengeluaran, dan transfer mengubah saldo rekening secara otomatis." wide>
      {data.accounts.length === 0 ? (
        <div className="empty-state"><strong>Belum ada rekening</strong><p>Tambahkan rekening terlebih dahulu sebelum mencatat transaksi.</p></div>
      ) : (
        <>
          <div className="segmented-control">
            <button className={type === 'expense' ? 'active' : ''} onClick={() => changeType('expense')}>Pengeluaran</button>
            <button className={type === 'income' ? 'active' : ''} onClick={() => changeType('income')}>Pemasukan</button>
            <button className={type === 'transfer' ? 'active' : ''} onClick={() => changeType('transfer')}>Transfer</button>
          </div>

          <div className="form-grid two-columns">
            <label className="field"><span>Jumlah</span><input autoFocus inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></label>
            <label className="field"><span>Tanggal</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label className="field"><span>{type === 'transfer' ? 'Dari rekening' : 'Rekening'}</span><select value={accountId} onChange={(event) => { setAccountId(event.target.value); if (toAccountId === event.target.value) setToAccountId(data.accounts.find((account) => account.id !== event.target.value)?.id ?? ''); }}>{data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            {type === 'transfer' && <label className="field"><span>Ke rekening</span><select value={toAccountId} onChange={(event) => setToAccountId(event.target.value)}>{data.accounts.filter((account) => account.id !== accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>}
            {type !== 'transfer' && <label className="field"><span>Kategori</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>}
            <label className="field full-field"><span>Catatan</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder={type === 'transfer' ? 'Contoh: isi uang tunai' : 'Apa transaksi ini?'} /></label>
          </div>
        </>
      )}

      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Batal</button>{data.accounts.length > 0 && <button className="primary-button" disabled={!canSubmit} onClick={submit}>{transaction ? 'Simpan perubahan' : 'Simpan transaksi'}</button>}</div>
    </Modal>
  );
};
