import { useEffect, useMemo, useState } from 'react';
import type { PageId } from './types';
import { Layout } from './components/Layout';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { CommandPalette } from './components/CommandPalette';
import { CloudSetupModal } from './components/CloudSetupModal';
import { AuthScreen } from './components/AuthScreen';
import { AppLoadingScreen } from './components/AppLoadingScreen';
import { DataManagementModal } from './components/DataManagementModal';
import { SyncConflictModal } from './components/SyncConflictModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { TodayPage } from './pages/TodayPage';
import { CalendarPage } from './pages/CalendarPage';
import { TasksPage } from './pages/TasksPage';
import { RoutinesPage } from './pages/RoutinesPage';
import { NotesPage } from './pages/NotesPage';
import { FinancePage } from './pages/FinancePage';
import { ReviewPage } from './pages/ReviewPage';
import { useAuthStore } from './store/AuthStore';
import { useAppStore } from './store/AppStore';
import {
  collectReminderItems,
  getDueUnsentReminders,
  loadReminderSettings,
  markReminderSent,
  showSystemNotification,
  type ReminderSettings
} from './lib/notifications';

const pageMeta: Record<PageId, { title: string; subtitle: string }> = {
  today: { title: 'Hari Ini', subtitle: 'Lihat yang perlu dilakukan tanpa membuka semua tracker.' },
  calendar: { title: 'Jadwal', subtitle: 'Agenda Google Calendar yang dipilih, dibaca secara read-only.' },
  tasks: { title: 'Tugas & Proyek', subtitle: 'Tindakan, recurrence, waiting list, dan konteks proyek.' },
  routines: { title: 'Rutinitas', subtitle: 'Habit dan ibadah tetap terpisah, tetapi mudah dilihat bersama.' },
  notes: { title: 'Catatan', subtitle: 'Catatan cepat, ide, dan keputusan yang terhubung dengan proyek.' },
  finance: { title: 'Keuangan', subtitle: 'Rekening, transaksi, anggaran, dan tagihan dalam satu arus.' },
  review: { title: 'Review Mingguan', subtitle: 'Ubah data yang terkumpul menjadi keputusan minggu berikutnya.' }
};

export default function App() {
  const auth = useAuthStore();
  const store = useAppStore();
  const [page, setPage] = useState<PageId>(() => new URLSearchParams(window.location.search).get('open') === 'calendar' ? 'calendar' : 'today');
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dataManagementOpen, setDataManagementOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(() => loadReminderSettings());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === 'Escape') {
        setCommandOpen(false);
        setQuickCaptureOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  useEffect(() => {
    const handleSettings = (event: Event) => {
      const custom = event as CustomEvent<ReminderSettings>;
      setReminderSettings(custom.detail ?? loadReminderSettings());
    };
    window.addEventListener('ruang:reminder-settings', handleSettings);
    return () => window.removeEventListener('ruang:reminder-settings', handleSettings);
  }, []);

  useEffect(() => {
    if (!reminderSettings.enabled || !('Notification' in window) || Notification.permission !== 'granted') return;

    const checkReminders = async () => {
      const due = getDueUnsentReminders(store.data, reminderSettings);
      for (const item of due) {
        const shown = await showSystemNotification(item);
        if (shown) markReminderSent(item.id);
      }
    };

    void checkReminders();
    const timer = window.setInterval(() => void checkReminders(), 30_000);
    const handleVisibility = () => { if (document.visibilityState === 'visible') void checkReminders(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [store.data, reminderSettings]);

  const notificationCount = useMemo(() => {
    if (!reminderSettings.enabled) return 0;
    const now = Date.now();
    const horizon = now + 24 * 60 * 60 * 1000;
    return collectReminderItems(store.data, reminderSettings)
      .filter((item) => {
        const at = new Date(item.at).getTime();
        return at >= now - 10 * 60_000 && at <= horizon;
      }).length;
  }, [store.data, reminderSettings]);

  const pageComponent = useMemo(() => {
    if (page === 'calendar') return <CalendarPage />;
    if (page === 'tasks') return <TasksPage />;
    if (page === 'routines') return <RoutinesPage />;
    if (page === 'notes') return <NotesPage />;
    if (page === 'finance') return <FinancePage />;
    if (page === 'review') return <ReviewPage />;
    return <TodayPage onNavigate={setPage} />;
  }, [page]);

  if (auth.loading) return <AppLoadingScreen label="Memeriksa sesi…" />;
  if (auth.configured && !auth.session) return <AuthScreen />;
  if (auth.configured && store.syncStatus === 'loading') return <AppLoadingScreen label="Mengambil data akun…" />;

  const metadataName = auth.session?.user.user_metadata?.display_name;
  const userName = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName
    : auth.session?.user.email?.split('@')[0] ?? 'Khidir';

  return (
    <>
      <Layout
        page={page}
        onPageChange={setPage}
        onQuickCapture={() => setQuickCaptureOpen(true)}
        onSearch={() => setCommandOpen(true)}
        onDataManagement={() => { setMobileOpen(false); setDataManagementOpen(true); }}
        onNotifications={() => setNotificationOpen(true)}
        notificationCount={notificationCount}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        title={pageMeta[page].title}
        subtitle={pageMeta[page].subtitle}
        userName={userName}
        userEmail={auth.session?.user.email}
        cloudEnabled={auth.configured}
        syncStatus={store.syncStatus}
        syncError={store.syncError}
        lastSyncedAt={store.lastSyncedAt}
        onSync={() => void store.syncNow()}
        onSignOut={auth.configured ? () => void auth.signOut() : undefined}
      >
        {pageComponent}
      </Layout>
      <QuickCaptureModal open={quickCaptureOpen} onClose={() => setQuickCaptureOpen(false)} />
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={(nextPage) => { setPage(nextPage); setCommandOpen(false); }}
        onQuickCapture={() => { setCommandOpen(false); setQuickCaptureOpen(true); }}
      />
      <CloudSetupModal />
      <DataManagementModal open={dataManagementOpen} onClose={() => setDataManagementOpen(false)} />
      <SyncConflictModal />
      <NotificationSettingsModal open={notificationOpen} onClose={() => setNotificationOpen(false)} />
    </>
  );
}
