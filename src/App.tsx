import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
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

const TodayPage = lazy(() => import('./pages/TodayPage').then((module) => ({ default: module.TodayPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const TasksPage = lazy(() => import('./pages/TasksPage').then((module) => ({ default: module.TasksPage })));
const RoutinesPage = lazy(() => import('./pages/RoutinesPage').then((module) => ({ default: module.RoutinesPage })));
const NotesPage = lazy(() => import('./pages/NotesPage').then((module) => ({ default: module.NotesPage })));
const FinancePage = lazy(() => import('./pages/FinancePage').then((module) => ({ default: module.FinancePage })));
const ReviewPage = lazy(() => import('./pages/ReviewPage').then((module) => ({ default: module.ReviewPage })));

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
  const [pwaUpdate, setPwaUpdate] = useState<(() => void) | null>(null);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(() => loadReminderSettings(auth.session?.user.id));

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
      setReminderSettings(custom.detail ?? loadReminderSettings(auth.session?.user.id));
    };
    window.addEventListener('ruang:reminder-settings', handleSettings);
    return () => window.removeEventListener('ruang:reminder-settings', handleSettings);
  }, [auth.session?.user.id]);

  useEffect(() => {
    setReminderSettings(loadReminderSettings(auth.session?.user.id));
  }, [auth.session?.user.id]);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ update?: () => void }>).detail;
      if (detail?.update) setPwaUpdate(() => detail.update!);
    };
    window.addEventListener('ruang:pwa-update', handleUpdate);
    return () => window.removeEventListener('ruang:pwa-update', handleUpdate);
  }, []);

  useEffect(() => {
    if (!reminderSettings.enabled || !('Notification' in window) || Notification.permission !== 'granted') return;

    const checkReminders = async () => {
      const due = getDueUnsentReminders(store.data, reminderSettings, new Date(), 24 * 60, auth.session?.user.id);
      for (const item of due) {
        const shown = await showSystemNotification(item);
        if (shown) markReminderSent(item.id, auth.session?.user.id);
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
  }, [store.data, reminderSettings, auth.session?.user.id]);

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
      {pwaUpdate && (
        <div className="pwa-update-banner" role="status">
          <span>Versi baru Ruang sudah siap.</span>
          <button onClick={() => pwaUpdate()}>Muat versi baru</button>
          <button aria-label="Tutup pemberitahuan update" onClick={() => setPwaUpdate(null)}>×</button>
        </div>
      )}
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
        <Suspense fallback={<div className="page-loading-inline">Memuat halaman…</div>}>
          {pageComponent}
        </Suspense>
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
