import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { useAppStore } from '../store/AppStore';
import type { Account, AccountType } from '../types';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  account?: Account | null;
}

export const AccountModal = ({ open, onClose, account }: AccountModalProps) => {
  const { addAccount, updateAccount } = useAppStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [color, setColor] = useState('#005BAC');

  useEffect(() => {
    if (!open) return;
    setName(account?.name ?? '');
    setType(account?.type ?? 'bank');
    setOpeningBalance(String(account?.openingBalance ?? 0));
    setColor(account?.color ?? '#005BAC');
  }, [open, account]);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  const changeType = (nextType: AccountType) => {
    setType(nextType);
    if (!account) setColor(nextType === 'cash' ? '#E59B2F' : nextType === 'ewallet' ? '#6C63D9' : '#005BAC');
  };

  const submit = () => {
    if (!canSubmit) return;
    const value = { name: name.trim(), type, openingBalance: Number(openingBalance) || 0, color };
    if (account) updateAccount(account.id, value);
    else addAccount(value);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={account ? 'Edit rekening' : 'Rekening baru'} description="Saldo awal hanya menjadi titik mulai; mutasi berikutnya berasal dari transaksi.">
      <div className="form-grid">
        <label className="field"><span>Nama rekening</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: BRI, Tunai rumah, GoPay" /></label>
        <label className="field"><span>Tipe</span><select value={type} onChange={(event) => changeType(event.target.value as AccountType)}><option value="bank">Bank</option><option value="cash">Tunai</option><option value="ewallet">E-Wallet</option></select></label>
        <label className="field"><span>Saldo awal</span><input inputMode="numeric" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value.replace(/[^0-9]/g, ''))} /></label>
        <label className="field"><span>Warna</span><div className="color-input-row"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /><input value={color} onChange={(event) => setColor(event.target.value)} /></div></label>
      </div>
      <p className="form-hint">Mengubah saldo awal akan memengaruhi saldo saat ini. Gunakan transaksi koreksi jika perubahan sebenarnya merupakan mutasi baru.</p>
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Batal</button><button className="primary-button" disabled={!canSubmit} onClick={submit}>{account ? 'Simpan perubahan' : 'Simpan rekening'}</button></div>
    </Modal>
  );
};
