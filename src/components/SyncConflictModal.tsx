import { Cloud, Download, Laptop, ShieldAlert } from 'lucide-react';
import { Modal } from './Modal';
import { describeData, downloadDataBackup } from '../lib/backup';
import { useAppStore } from '../store/AppStore';

const DataSummary = ({ label, data, revision }: { label: string; data: ReturnType<typeof describeData>; revision: number }) => (
  <div className="conflict-version-card">
    <div className="conflict-version-heading">
      <strong>{label}</strong>
      <span>Revisi {revision}</span>
    </div>
    <div className="data-count-grid">
      <span><strong>{data.tasks}</strong>Tugas</span>
      <span><strong>{data.projects}</strong>Proyek</span>
      <span><strong>{data.habits}</strong>Habit</span>
      <span><strong>{data.notes}</strong>Catatan</span>
      <span><strong>{data.transactions}</strong>Transaksi</span>
      <span><strong>{data.accounts}</strong>Rekening</span>
    </div>
  </div>
);

export const SyncConflictModal = () => {
  const { data, conflict, acceptCloudConflict, keepDeviceConflict } = useAppStore();
  if (!conflict) return null;

  const localSummary = describeData(data);
  const remoteSummary = describeData(conflict.remoteData);

  return (
    <Modal
      open
      closable={false}
      wide
      onClose={() => undefined}
      title="Konflik sinkronisasi ditemukan"
      description="Perangkat ini dan cloud sama-sama mempunyai perubahan. Tidak ada data yang ditimpa otomatis."
    >
      <div className="conflict-warning">
        <ShieldAlert size={20} />
        <p>Pilih versi yang ingin menjadi data utama. Versi yang tidak dipilih tetap dibuatkan backup lokal atau cloud sebelum diganti.</p>
      </div>

      <div className="conflict-compare-grid">
        <DataSummary label="Versi perangkat ini" data={localSummary} revision={conflict.localRevision} />
        <DataSummary label="Versi cloud" data={remoteSummary} revision={conflict.remoteRevision} />
      </div>

      <div className="conflict-downloads">
        <button className="secondary-button" onClick={() => downloadDataBackup(data, 'konflik-perangkat')}>
          <Download size={16} /> Download versi perangkat
        </button>
        <button className="secondary-button" onClick={() => downloadDataBackup(conflict.remoteData, 'konflik-cloud')}>
          <Download size={16} /> Download versi cloud
        </button>
      </div>

      <div className="conflict-actions">
        <button className="secondary-button conflict-choice" onClick={acceptCloudConflict}>
          <Cloud size={19} />
          <span><strong>Gunakan versi cloud</strong><small>Data perangkat saat ini disimpan sebagai backup lokal.</small></span>
        </button>
        <button className="primary-button conflict-choice" onClick={() => void keepDeviceConflict()}>
          <Laptop size={19} />
          <span><strong>Pertahankan versi perangkat</strong><small>Versi cloud lama disimpan sebagai backup sebelum ditimpa.</small></span>
        </button>
      </div>
    </Modal>
  );
};
