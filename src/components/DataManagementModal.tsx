import { useEffect, useRef, useState } from 'react';
import {
  ArchiveRestore,
  Cloud,
  DatabaseBackup,
  Download,
  FileJson,
  FileSpreadsheet,
  LoaderCircle,
  Save,
  Trash2,
  Upload
} from 'lucide-react';
import { Modal } from './Modal';
import {
  describeData,
  downloadDataBackup,
  downloadTransactionsCsv,
  parseBackupFile,
  type RuangBackupFile
} from '../lib/backup';
import { useAppStore } from '../store/AppStore';

interface DataManagementModalProps {
  open: boolean;
  onClose: () => void;
}

const formatDateTime = (iso: string) => new Date(iso).toLocaleString('id-ID', {
  dateStyle: 'medium', timeStyle: 'short'
});

export const DataManagementModal = ({ open, onClose }: DataManagementModalProps) => {
  const store = useAppStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<RuangBackupFile | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (open) void store.refreshCloudBackups().catch(() => undefined);
  }, [open, store.refreshCloudBackups]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setImportError(null);
    try {
      setPendingImport(await parseBackupFile(file));
    } catch (error) {
      setPendingImport(null);
      setImportError(error instanceof Error ? error.message : 'File gagal dibaca.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    store.importData(pendingImport.data, 'Sebelum import file backup');
    setPendingImport(null);
  };

  return (
    <Modal open={open} onClose={onClose} wide title="Data & Backup" description="Export, import, dan pulihkan data tanpa bergantung pada satu perangkat.">
      <div className="data-manager-grid">
        <section className="data-manager-section">
          <div className="section-heading compact-heading">
            <div><strong>Export data</strong><span>Simpan salinan yang bisa dipindahkan ke perangkat lain.</span></div>
          </div>
          <div className="backup-action-grid">
            <button onClick={() => downloadDataBackup(store.data)}>
              <FileJson size={20} /><strong>Backup lengkap JSON</strong><span>Seluruh tugas, habit, ibadah, catatan, dan keuangan.</span>
            </button>
            <button onClick={() => downloadTransactionsCsv(store.data.transactions, store.data.accounts)}>
              <FileSpreadsheet size={20} /><strong>Transaksi CSV</strong><span>Untuk dibuka di Excel atau Google Sheets.</span>
            </button>
            <button onClick={store.createManualBackup}>
              <Save size={20} /><strong>Snapshot lokal</strong><span>Simpan versi saat ini di perangkat tanpa download.</span>
            </button>
          </div>
        </section>

        <section className="data-manager-section">
          <div className="section-heading compact-heading">
            <div><strong>Import backup</strong><span>Data sekarang akan dibackup otomatis sebelum diganti.</span></div>
          </div>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <button className="import-dropzone" onClick={() => fileInputRef.current?.click()}>
            <Upload size={22} /><strong>Pilih file backup JSON</strong><span>Mendukung export Fase 3 dan data mentah dari versi sebelumnya.</span>
          </button>
          {importError && <div className="auth-message error">{importError}</div>}
          {pendingImport && (() => {
            const summary = describeData(pendingImport.data);
            return (
              <div className="import-preview">
                <div><strong>Backup siap diimport</strong><span>Diekspor {formatDateTime(pendingImport.exportedAt)} · versi {pendingImport.appVersion}</span></div>
                <div className="data-count-grid">
                  <span><strong>{summary.tasks}</strong>Tugas</span>
                  <span><strong>{summary.projects}</strong>Proyek</span>
                  <span><strong>{summary.habits}</strong>Habit</span>
                  <span><strong>{summary.notes}</strong>Catatan</span>
                  <span><strong>{summary.transactions}</strong>Transaksi</span>
                  <span><strong>{summary.accounts}</strong>Rekening</span>
                </div>
                <div className="inline-actions">
                  <button className="secondary-button" onClick={() => setPendingImport(null)}>Batal</button>
                  <button className="primary-button" onClick={confirmImport}><Upload size={15} /> Import & ganti data</button>
                </div>
              </div>
            );
          })()}
        </section>

        <section className="data-manager-section full-span">
          <div className="section-heading compact-heading">
            <div><strong>Backup lokal</strong><span>Maksimal 10 snapshot. Backup lama dihapus otomatis saat ruang penyimpanan terbatas.</span></div>
            <span className="revision-badge">{store.localBackups.length} tersimpan</span>
          </div>
          <div className="backup-list">
            {store.localBackups.length === 0 && <div className="empty-state compact-empty"><DatabaseBackup size={22} /><span>Belum ada backup lokal.</span></div>}
            {store.localBackups.map((backup) => (
              <div className="backup-row" key={backup.id}>
                <div><ArchiveRestore size={17} /><span><strong>{backup.reason}</strong><small>{formatDateTime(backup.createdAt)}</small></span></div>
                <div className="inline-actions">
                  <button className="secondary-button small-button" onClick={() => {
                    if (window.confirm('Pulihkan backup ini dan ganti data saat ini?')) store.restoreLocalBackup(backup.id);
                  }}>Pulihkan</button>
                  <button className="icon-button danger-icon" onClick={() => store.deleteLocalBackup(backup.id)} aria-label="Hapus backup"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="data-manager-section full-span">
          <div className="section-heading compact-heading">
            <div><strong>Backup cloud</strong><span>Snapshot otomatis dibuat maksimal sekali sehari dan sebelum penyelesaian konflik.</span></div>
            <span className="revision-badge"><Cloud size={12} /> Revisi {store.cloudRevision}</span>
          </div>
          {!store.cloudEnabled ? (
            <div className="empty-state compact-empty"><Cloud size={22} /><span>Aktifkan Supabase untuk backup lintas perangkat.</span></div>
          ) : store.backupsLoading ? (
            <div className="empty-state compact-empty"><LoaderCircle className="spin" size={22} /><span>Memuat backup cloud…</span></div>
          ) : (
            <div className="backup-list">
              {store.cloudBackups.length === 0 && <div className="empty-state compact-empty"><Cloud size={22} /><span>Backup cloud akan muncul setelah sinkronisasi berikutnya.</span></div>}
              {store.cloudBackups.map((backup) => (
                <div className="backup-row" key={backup.id}>
                  <div><Cloud size={17} /><span><strong>{backup.reason}</strong><small>Revisi {backup.revision} · {formatDateTime(backup.created_at)}</small></span></div>
                  <button className="secondary-button small-button" disabled={store.backupsLoading} onClick={() => {
                    if (window.confirm('Pulihkan backup cloud ini ke perangkat sekarang?')) void store.restoreCloudBackup(backup.id);
                  }}>Pulihkan</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
};
