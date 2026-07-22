import type { ReactNode } from 'react';
import {
  Bell,
  CalendarCheck2,
  CalendarDays,
  CheckSquare2,
  CircleDollarSign,
  Cloud,
  CloudOff,
  DatabaseBackup,
  LoaderCircle,
  LogOut,
  Menu,
  NotebookPen,
  PanelLeftClose,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  X
} from 'lucide-react';
import type { PageId } from '../types';
import type { SyncStatus } from '../store/AppStore';

const navItems: Array<{ id: PageId; label: string; icon: typeof CalendarCheck2 }> = [
  { id: 'today', label: 'Hari Ini', icon: CalendarCheck2 },
  { id: 'calendar', label: 'Jadwal', icon: CalendarDays },
  { id: 'tasks', label: 'Tugas', icon: CheckSquare2 },
  { id: 'routines', label: 'Rutinitas', icon: Target },
  { id: 'notes', label: 'Catatan', icon: NotebookPen },
  { id: 'finance', label: 'Keuangan', icon: CircleDollarSign },
  { id: 'review', label: 'Review', icon: Sparkles }
];

interface LayoutProps {
  page: PageId;
  onPageChange: (page: PageId) => void;
  onQuickCapture: () => void;
  onSearch: () => void;
  onDataManagement: () => void;
  onNotifications: () => void;
  notificationCount: number;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  userName: string;
  userEmail?: string;
  cloudEnabled: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  onSync: () => void;
  onSignOut?: () => void;
  children: ReactNode;
}

const syncMeta: Record<SyncStatus, { label: string; icon: typeof Cloud }> = {
  local: { label: 'Mode lokal', icon: CloudOff },
  loading: { label: 'Mengambil dari Supabase', icon: LoaderCircle },
  'needs-setup': { label: 'Siapkan cloud', icon: Cloud },
  syncing: { label: 'Menyinkronkan', icon: LoaderCircle },
  synced: { label: 'Supabase utama', icon: Cloud },
  offline: { label: 'Offline · memakai cache', icon: CloudOff },
  conflict: { label: 'Perlu pilih versi', icon: CloudOff },
  error: { label: 'Supabase tidak dapat dimuat', icon: CloudOff }
};

const formatSyncTime = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export const Layout = ({
  page,
  onPageChange,
  onQuickCapture,
  onSearch,
  onDataManagement,
  onNotifications,
  notificationCount,
  mobileOpen,
  onMobileOpenChange,
  title,
  subtitle,
  userName,
  userEmail,
  cloudEnabled,
  syncStatus,
  syncError,
  lastSyncedAt,
  onSync,
  onSignOut,
  children
}: LayoutProps) => {
  const selectPage = (nextPage: PageId) => {
    onPageChange(nextPage);
    onMobileOpenChange(false);
  };
  const SyncIcon = syncMeta[syncStatus].icon;
  const syncTime = formatSyncTime(lastSyncedAt);
  const avatar = userName.trim().charAt(0).toUpperCase() || 'R';

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-lockup">
            <div className="brand-mark">R</div>
            <div><strong>Ruang</strong><span>Personal Life OS</span></div>
          </div>
          <button className="icon-button sidebar-close" onClick={() => onMobileOpenChange(false)} aria-label="Tutup menu"><X size={19} /></button>
        </div>

        <nav className="sidebar-nav" aria-label="Navigasi utama">
          <p className="nav-caption">Ruang kerja</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => selectPage(item.id)}>
                <Icon size={18} strokeWidth={2} /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="search-shortcut" onClick={onSearch}><Search size={17} /><span>Cari apa saja</span><kbd>Ctrl K</kbd></button>
          <button className="search-shortcut" onClick={onDataManagement}><DatabaseBackup size={17} /><span>Data & Backup</span></button>
          <button
            className={`sync-card sync-${syncStatus}`}
            onClick={cloudEnabled && syncStatus !== 'loading' && syncStatus !== 'needs-setup' ? onSync : undefined}
            title={syncError ?? undefined}
          >
            <SyncIcon size={16} className={syncStatus === 'syncing' || syncStatus === 'loading' ? 'spin' : ''} />
            <div><strong>{syncMeta[syncStatus].label}</strong><span>{cloudEnabled ? (syncTime ? `Terakhir ${syncTime}` : 'Akun Supabase') : 'Data hanya di perangkat ini'}</span></div>
            {cloudEnabled && syncStatus !== 'loading' && syncStatus !== 'needs-setup' && <RefreshCw size={13} />}
          </button>
          <div className="profile-card">
            <div className="avatar">{avatar}</div>
            <div><strong>{userName}</strong><span>{userEmail ?? 'Ruang pribadi'}</span></div>
            {onSignOut && <button className="profile-signout" onClick={onSignOut} aria-label="Keluar dari akun" title="Keluar"><LogOut size={15} /></button>}
          </div>
        </div>
      </aside>

      {mobileOpen && <button className="sidebar-overlay" aria-label="Tutup menu" onClick={() => onMobileOpenChange(false)} />}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button mobile-menu" onClick={() => onMobileOpenChange(true)} aria-label="Buka menu"><Menu size={21} /></button>
            <div><h1>{title}</h1><p>{subtitle}</p></div>
          </div>
          <div className="topbar-actions">
            <button className="icon-button desktop-search" onClick={onSearch} aria-label="Cari"><Search size={19} /></button>
            <button className="icon-button notification-button" onClick={onNotifications} aria-label="Reminder dan notifikasi" title="Reminder & notifikasi">
              <Bell size={18} />
              {notificationCount > 0 && <span>{notificationCount > 9 ? '9+' : notificationCount}</span>}
            </button>
            <button className="primary-button" onClick={onQuickCapture}><PanelLeftClose size={17} />Tangkap cepat</button>
          </div>
        </header>
        <div className="page-container">{children}</div>
      </main>
    </div>
  );
};
