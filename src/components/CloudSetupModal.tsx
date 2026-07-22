import { CloudUpload, Database, Eraser, Smartphone } from 'lucide-react';
import { Modal } from './Modal';
import { useAppStore } from '../store/AppStore';

export const CloudSetupModal = () => {
  const { syncStatus, initializeCloud, syncError } = useAppStore();
  const open = syncStatus === 'needs-setup';

  return (
    <Modal open={open} onClose={() => undefined} title="Siapkan data akun" description="Belum ada data Ruang pada akun ini. Pilih titik awal yang ingin digunakan.">
      <div className="cloud-setup-options">
        <button onClick={() => void initializeCloud('device')}>
          <span className="cloud-option-icon"><Smartphone size={22} /></span>
          <div><strong>Pindahkan data perangkat ini</strong><p>Upload seluruh data yang sekarang ada di browser, termasuk perubahan dari prototype sebelumnya.</p></div>
          <CloudUpload size={19} />
        </button>
        <button onClick={() => void initializeCloud('empty')}>
          <span className="cloud-option-icon"><Eraser size={22} /></span>
          <div><strong>Mulai dari data kosong</strong><p>Abaikan cache perangkat ini dan mulai akun baru tanpa isi.</p></div>
          <Database size={19} />
        </button>
      </div>
      {syncError && <div className="auth-message error">{syncError}</div>}
      <p className="cloud-setup-note">Pilihan ini hanya muncul satu kali. Setelah itu, perubahan akan tersinkron otomatis.</p>
    </Modal>
  );
};
