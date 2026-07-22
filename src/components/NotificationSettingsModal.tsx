import { useEffect, useMemo, useState } from 'react';
import { BellRing, BellOff, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';
import {
  collectReminderItems,
  loadReminderSettings,
  saveReminderSettings,
  type ReminderSettings
} from '../lib/notifications';
import { useAppStore } from '../store/AppStore';
import { formatDate } from '../lib/format';

interface NotificationSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const permissionLabel = () => {
  if (!('Notification' in window)) return 'Tidak didukung browser';
  if (Notification.permission === 'granted') return 'Diizinkan';
  if (Notification.permission === 'denied') return 'Diblokir browser';
  return 'Belum diminta';
};

export const NotificationSettingsModal = ({ open, onClose }: NotificationSettingsModalProps) => {
  const { data } = useAppStore();
  const [settings, setSettings] = useState<ReminderSettings>(() => loadReminderSettings());
  const [permission, setPermission] = useState(permissionLabel());

  useEffect(() => {
    if (!open) return;
    setSettings(loadReminderSettings());
    setPermission(permissionLabel());
  }, [open]);

  const upcoming = useMemo(
    () => collectReminderItems(data, settings).filter((item) => new Date(item.at).getTime() >= Date.now()).slice(0, 6),
    [data, settings]
  );

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(permissionLabel());
    if (result === 'granted') setSettings((current) => ({ ...current, enabled: true }));
  };

  const save = () => {
    saveReminderSettings(settings);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Reminder & notifikasi" description="Atur pengingat tugas, deadline, habit, dan tagihan pada perangkat ini." wide>
      <div className="notification-permission-card">
        <div className={`notification-permission-icon ${permission === 'Diizinkan' ? 'granted' : ''}`}>{permission === 'Diizinkan' ? <ShieldCheck size={22} /> : <BellOff size={22} />}</div>
        <div><strong>Izin notifikasi browser</strong><span>{permission}</span></div>
        {permission !== 'Diizinkan' && <button className="secondary-button" onClick={() => void requestPermission()}><BellRing size={15} /> Izinkan</button>}
      </div>

      <div className="advanced-panel">
        <label className="toggle-row">
          <div><strong>Aktifkan reminder</strong><span>Reminder hanya dikirim setelah izin browser diberikan.</span></div>
          <input type="checkbox" checked={settings.enabled} disabled={permission === 'Diblokir browser'} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} />
        </label>
      </div>

      <div className="form-grid two-columns">
        <label className="field"><span>Jadwal tugas</span><select value={settings.taskReminders ? 'on' : 'off'} onChange={(event) => setSettings({ ...settings, taskReminders: event.target.value === 'on' })}><option value="on">Aktif</option><option value="off">Nonaktif</option></select></label>
        <label className="field"><span>Berapa menit sebelumnya?</span><input inputMode="numeric" value={settings.taskLeadMinutes} onChange={(event) => setSettings({ ...settings, taskLeadMinutes: Math.max(0, Number(event.target.value.replace(/[^0-9]/g, '')) || 0) })} /></label>
        <label className="field"><span>Deadline tugas</span><select value={settings.deadlineReminders ? 'on' : 'off'} onChange={(event) => setSettings({ ...settings, deadlineReminders: event.target.value === 'on' })}><option value="on">Aktif</option><option value="off">Nonaktif</option></select></label>
        <label className="field"><span>Berapa menit sebelumnya?</span><input inputMode="numeric" value={settings.deadlineLeadMinutes} onChange={(event) => setSettings({ ...settings, deadlineLeadMinutes: Math.max(0, Number(event.target.value.replace(/[^0-9]/g, '')) || 0) })} /></label>
        <label className="field full-field"><span>Habit sesuai waktu masing-masing</span><select value={settings.habitReminders ? 'on' : 'off'} onChange={(event) => setSettings({ ...settings, habitReminders: event.target.value === 'on' })}><option value="on">Aktif</option><option value="off">Nonaktif</option></select></label>
      </div>

      <section className="notification-preview">
        <div className="panel-header compact-header"><div><h3>Reminder mendatang</h3><p>Tagihan otomatis mengikuti tugas yang memiliki label “tagihan”.</p></div></div>
        {upcoming.length ? upcoming.map((item) => <article key={item.id}><BellRing size={15} /><div><strong>{item.title}</strong><span>{formatDate(item.at, 'd MMM yyyy · HH.mm')} · {item.body}</span></div></article>) : <div className="empty-state compact"><BellOff size={23} /><strong>Belum ada reminder</strong><p>Tambahkan jadwal, deadline, atau waktu habit.</p></div>}
      </section>

      <p className="form-hint">Reminder lokal bekerja ketika aplikasi/PWA sedang aktif atau masih berjalan di latar belakang. Notifikasi yang benar-benar terjadwal saat aplikasi sudah ditutup memerlukan layanan push server dan akan dikerjakan pada fase terpisah.</p>
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Batal</button><button className="primary-button" onClick={save}>Simpan pengaturan</button></div>
    </Modal>
  );
};
