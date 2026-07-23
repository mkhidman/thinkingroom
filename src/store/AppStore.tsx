import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { format } from 'date-fns';
import { createEmptyData } from '../data/empty';
import { toggleTaskWithLifecycle, updateTaskWithLifecycle } from '../lib/taskLifecycle';
import {
  clearAppData,
  clearLegacyAppData,
  loadAppData,
  loadSyncMeta,
  saveAppData,
  saveSyncMeta
} from '../lib/storage';
import {
  createLocalBackup,
  deleteLocalBackup as removeLocalBackup,
  loadLocalBackups,
  type LocalBackupSnapshot
} from '../lib/backup';
import { createId } from '../lib/id';
import {
  fetchCloudBackupData,
  fetchCloudBackups,
  fetchCloudState,
  saveCloudState,
  type AppStateRow,
  type AuthSession,
  type CloudBackupSummary
} from '../lib/supabase';
import { useAuthStore } from './AuthStore';
import type {
  Account,
  AppData,
  Budget,
  Habit,
  Note,
  PrayerName,
  Project,
  PrayerSettings,
  PrayerStatus,
  Task,
  Transaction,
  WeeklyReview
} from '../types';

type NewTask = Omit<Task, 'id' | 'createdAt' | 'status' | 'labels' | 'subtasks'> &
  Partial<Pick<Task, 'status' | 'labels' | 'subtasks'>>;
type TaskUpdates = Omit<Task, 'id' | 'createdAt'>;
type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;
type TransactionUpdates = Omit<Transaction, 'id' | 'createdAt'>;
type NewNote = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;
export type SyncStatus = 'local' | 'loading' | 'needs-setup' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error';

export interface SyncConflict {
  remoteData: AppData;
  remoteRevision: number;
  remoteUpdatedAt: string;
  localRevision: number;
}

interface StoreValue {
  data: AppData;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  cloudEnabled: boolean;
  cloudRevision: number;
  hasUnsyncedChanges: boolean;
  conflict: SyncConflict | null;
  localBackups: LocalBackupSnapshot[];
  cloudBackups: CloudBackupSummary[];
  backupsLoading: boolean;
  addTask: (task: NewTask) => void;
  updateTask: (taskId: string, updates: TaskUpdates) => void;
  deleteTask: (taskId: string) => void;
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (projectId: string, updates: Omit<Project, 'id'>) => void;
  deleteProject: (projectId: string) => void;
  toggleTask: (taskId: string) => void;
  addTransaction: (transaction: NewTransaction) => void;
  updateTransaction: (transactionId: string, updates: TransactionUpdates) => void;
  deleteTransaction: (transactionId: string) => void;
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (accountId: string, updates: Omit<Account, 'id'>) => void;
  deleteAccount: (accountId: string) => boolean;
  addHabit: (habit: Omit<Habit, 'id' | 'logs'>) => void;
  updateHabit: (habitId: string, updates: Omit<Habit, 'id' | 'logs'>) => void;
  deleteHabit: (habitId: string) => void;
  logHabit: (habitId: string, value?: number, date?: Date) => void;
  cyclePrayer: (prayer: PrayerName) => void;
  updatePrayerSettings: (settings: PrayerSettings) => void;
  addNote: (note: NewNote) => void;
  updateNote: (noteId: string, updates: NewNote) => void;
  deleteNote: (noteId: string) => void;
  addBudget: (budget: Omit<Budget, 'id'>) => void;
  updateBudget: (budgetId: string, updates: Omit<Budget, 'id'>) => void;
  deleteBudget: (budgetId: string) => void;
  saveReview: (review: WeeklyReview) => void;
  resetData: () => void;
  syncNow: () => Promise<void>;
  initializeCloud: (source: 'device' | 'empty') => Promise<void>;
  acceptCloudConflict: () => void;
  keepDeviceConflict: () => Promise<void>;
  importData: (nextData: AppData, reason?: string) => void;
  createManualBackup: () => void;
  restoreLocalBackup: (backupId: string) => void;
  deleteLocalBackup: (backupId: string) => void;
  refreshCloudBackups: () => Promise<void>;
  restoreCloudBackup: (backupId: string) => Promise<void>;
}

const AppStoreContext = createContext<StoreValue | null>(null);
const prayerCycle: PrayerStatus[] = ['belum', 'selesai', 'tepat-waktu', 'berjamaah'];
const readableError = (error: unknown) => error instanceof Error ? error.message : 'Sinkronisasi gagal.';
const sameLocalDay = (first: string, second: Date) => new Date(first).toDateString() === second.toDateString();
const normalizeCategory = (value: string) => value.trim().toLocaleLowerCase('id-ID');

export const AppStoreProvider = ({ children }: PropsWithChildren) => {
  const { configured, session, refreshSession } = useAuthStore();
  const [data, setData] = useState<AppData>(() => configured ? createEmptyData() : (loadAppData() ?? createEmptyData()));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(configured ? 'loading' : 'local');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [cloudRevision, setCloudRevision] = useState(0);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const [localBackups, setLocalBackups] = useState<LocalBackupSnapshot[]>(() => loadLocalBackups());
  const [cloudBackups, setCloudBackups] = useState<CloudBackupSummary[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);

  const cloudReadyRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const dataRef = useRef(data);
  const revisionRef = useRef(cloudRevision);
  const dirtyRef = useRef(hasUnsyncedChanges);
  const syncTimerRef = useRef<number | null>(null);
  const mutationVersionRef = useRef(0);
  const saveInFlightRef = useRef<Promise<boolean> | null>(null);
  const pendingCloudBackupReasonRef = useRef<string | null>(null);
  const pendingSetupDeviceDataRef = useRef<AppData | null>(null);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { revisionRef.current = cloudRevision; }, [cloudRevision]);
  useEffect(() => { dirtyRef.current = hasUnsyncedChanges; }, [hasUnsyncedChanges]);

  const persistBackup = useCallback((snapshotData: AppData, reason: string, dailyOnly = false) => {
    const userId = session?.user.id;
    const current = loadLocalBackups(userId);
    if (dailyOnly && current.some((item) => item.reason === reason && sameLocalDay(item.createdAt, new Date()))) {
      setLocalBackups(current);
      return;
    }
    const nextBackups = createLocalBackup(snapshotData, reason, userId);
    setLocalBackups(nextBackups);
    if (nextBackups.length === 0) {
      setSyncError('Snapshot lokal tidak dapat disimpan karena penyimpanan perangkat penuh atau diblokir.');
    }
  }, [session?.user.id]);

  useEffect(() => {
    let stored = true;
    if (configured && session) {
      if (cloudReadyRef.current || syncStatus === 'conflict') {
        stored = saveAppData(data, session.user.id);
        saveSyncMeta(session.user.id, {
          revision: cloudRevision,
          dirty: hasUnsyncedChanges,
          lastSyncedAt
        });
      }
    } else if (!configured) {
      stored = saveAppData(data);
    }
    if (!stored) {
      setSyncError('Penyimpanan perangkat penuh atau diblokir. Export backup sebelum menambah data baru.');
    }
  }, [data, configured, session, syncStatus, cloudRevision, hasUnsyncedChanges, lastSyncedAt]);

  const markLocalChange = useCallback((updater: (current: AppData) => AppData) => {
    const next = updater(dataRef.current);
    if (next === dataRef.current) return;
    dataRef.current = next;
    mutationVersionRef.current += 1;
    setData(next);
    setHasUnsyncedChanges(true);
    dirtyRef.current = true;
    if (!configured) setSyncStatus('local');
    else if (!navigator.onLine && !conflict) setSyncStatus('offline');
  }, [configured, conflict]);

  const handleSaved = useCallback((revision: number, updatedAt: string, savedMutationVersion: number) => {
    setCloudRevision(revision);
    revisionRef.current = revision;
    setLastSyncedAt(updatedAt);
    setConflict(null);
    setSyncError(null);
    cloudReadyRef.current = true;
    if (mutationVersionRef.current === savedMutationVersion) {
      setHasUnsyncedChanges(false);
      dirtyRef.current = false;
      pendingCloudBackupReasonRef.current = null;
      setSyncStatus('synced');
    } else {
      setHasUnsyncedChanges(true);
      dirtyRef.current = true;
      setSyncStatus('syncing');
    }
  }, []);

  const applyCloudState = useCallback((row: AppStateRow, userId: string) => {
    applyingRemoteRef.current = true;
    dataRef.current = row.data;
    revisionRef.current = row.revision;
    dirtyRef.current = false;
    mutationVersionRef.current = 0;
    pendingSetupDeviceDataRef.current = null;
    setData(row.data);
    saveAppData(row.data, userId);
    clearLegacyAppData();
    setCloudRevision(row.revision);
    setLastSyncedAt(row.updated_at);
    setHasUnsyncedChanges(false);
    setConflict(null);
    setSyncError(null);
    saveSyncMeta(userId, { revision: row.revision, dirty: false, lastSyncedAt: row.updated_at });
    cloudReadyRef.current = true;
    setSyncStatus('synced');
    window.setTimeout(() => { applyingRemoteRef.current = false; }, 0);
  }, []);

  const saveToCloud = useCallback((
    activeSession: AuthSession,
    nextData: AppData,
    expectedRevision = revisionRef.current,
    backupReason?: string
  ) => {
    if (saveInFlightRef.current) return saveInFlightRef.current;
    setSyncStatus('syncing');
    setSyncError(null);

    const operation = (async () => {
      let targetSession = activeSession;
      let snapshot = nextData;
      let baseRevision = expectedRevision;
      let reason = backupReason;
      let snapshotVersion = mutationVersionRef.current;

      while (true) {
        persistBackup(snapshot, 'Backup otomatis harian', true);
        let result;
        try {
          result = await saveCloudState(targetSession, snapshot, baseRevision, reason);
        } catch (firstError) {
          const firstMessage = readableError(firstError);
          const lower = firstMessage.toLowerCase();
          const looksLikeExpiredSession = firstMessage.includes('401') || lower.includes('jwt') || lower.includes('token');
          if (looksLikeExpiredSession) {
            const nextSession = await refreshSession();
            if (nextSession) {
              targetSession = nextSession;
              result = await saveCloudState(targetSession, snapshot, baseRevision, reason);
            } else {
              throw firstError;
            }
          } else {
            throw firstError;
          }
        }

        if (result.status === 'conflict') {
          setConflict({
            remoteData: result.data,
            remoteRevision: result.revision,
            remoteUpdatedAt: result.updated_at,
            localRevision: baseRevision
          });
          setHasUnsyncedChanges(true);
          dirtyRef.current = true;
          setSyncStatus('conflict');
          setSyncError('Data perangkat dan cloud berubah dari versi dasar yang sama. Pilih versi yang ingin dipertahankan.');
          return false;
        }

        handleSaved(result.revision, result.updated_at, snapshotVersion);
        if (mutationVersionRef.current === snapshotVersion) return true;

        // Ada edit yang terjadi ketika request sebelumnya berjalan. Kirim
        // snapshot terbaru dengan revision hasil commit tadi dalam antrean yang
        // sama, sehingga tidak ada request cloud yang saling menimpa.
        snapshot = dataRef.current;
        snapshotVersion = mutationVersionRef.current;
        baseRevision = result.revision;
        reason = pendingCloudBackupReasonRef.current ?? undefined;
      }
    })().catch((error) => {
      if (!navigator.onLine) {
        setSyncStatus('offline');
        setSyncError('Perubahan tersimpan di perangkat dan akan dicoba lagi saat online.');
      } else {
        setSyncStatus('error');
        setSyncError(readableError(error));
      }
      throw error;
    }).finally(() => {
      saveInFlightRef.current = null;
    });
    saveInFlightRef.current = operation;
    return operation;
  }, [handleSaved, persistBackup, refreshSession]);

  useEffect(() => {
    if (!configured) {
      cloudReadyRef.current = false;
      pendingSetupDeviceDataRef.current = null;
      setSyncStatus('local');
      setConflict(null);
      setLocalBackups(loadLocalBackups());
      return;
    }
    if (!session) {
      cloudReadyRef.current = false;
      pendingSetupDeviceDataRef.current = null;
      dataRef.current = createEmptyData();
      setData(dataRef.current);
      setCloudRevision(0);
      revisionRef.current = 0;
      setHasUnsyncedChanges(false);
      dirtyRef.current = false;
      mutationVersionRef.current = 0;
      setLastSyncedAt(null);
      setSyncStatus('loading');
      setConflict(null);
      return;
    }

    let active = true;
    cloudReadyRef.current = false;
    setSyncStatus('loading');
    setSyncError(null);
    setConflict(null);

    const userId = session.user.id;
    const deviceData = loadAppData(userId) ?? loadAppData();
    const meta = loadSyncMeta(userId);
    pendingSetupDeviceDataRef.current = deviceData;
    setLocalBackups(loadLocalBackups(userId));

    fetchCloudState(session)
      .then((row) => {
        if (!active) return;
        if (!row) {
          const emptyData = createEmptyData();
          applyingRemoteRef.current = true;
          dataRef.current = emptyData;
          revisionRef.current = 0;
          dirtyRef.current = false;
          setData(emptyData);
          setCloudRevision(0);
          setHasUnsyncedChanges(false);
          setLastSyncedAt(null);
          setSyncStatus('needs-setup');
          applyingRemoteRef.current = false;
          return;
        }

        if (meta.dirty && deviceData && JSON.stringify(deviceData) !== JSON.stringify(row.data)) {
          applyingRemoteRef.current = true;
          dataRef.current = deviceData;
          mutationVersionRef.current = 1;
          dirtyRef.current = true;
          setData(deviceData);
          setHasUnsyncedChanges(true);
          setLastSyncedAt(meta.lastSyncedAt);
          cloudReadyRef.current = true;

          if (row.revision === meta.revision) {
            revisionRef.current = row.revision;
            setCloudRevision(row.revision);
            setSyncStatus(navigator.onLine ? 'syncing' : 'offline');
          } else {
            revisionRef.current = meta.revision;
            setCloudRevision(meta.revision);
            setConflict({
              remoteData: row.data,
              remoteRevision: row.revision,
              remoteUpdatedAt: row.updated_at,
              localRevision: meta.revision
            });
            setSyncError('Perubahan offline dan cloud sama-sama berubah. Pilih versi yang ingin dipertahankan.');
            setSyncStatus('conflict');
          }
          applyingRemoteRef.current = false;
          return;
        }
        applyCloudState(row, userId);
      })
      .catch(async (error) => {
        if (!active) return;
        const message = readableError(error);
        if (message.includes('401') || message.toLowerCase().includes('jwt')) {
          try {
            await refreshSession();
            return;
          } catch {
            setSyncError('Sesi berakhir. Silakan masuk kembali.');
          }
        } else {
          setSyncError(message);
        }

        if (deviceData) {
          applyingRemoteRef.current = true;
          dataRef.current = deviceData;
          revisionRef.current = meta.revision;
          dirtyRef.current = meta.dirty;
          mutationVersionRef.current = meta.dirty ? 1 : 0;
          setData(deviceData);
          setCloudRevision(meta.revision);
          setHasUnsyncedChanges(meta.dirty);
          setLastSyncedAt(meta.lastSyncedAt);
          cloudReadyRef.current = true;
          setSyncStatus(navigator.onLine ? 'error' : 'offline');
          window.setTimeout(() => { applyingRemoteRef.current = false; }, 0);
          return;
        }

        // Saat online, jangan diam-diam mengganti Supabase dengan localStorage.
        const emptyData = createEmptyData();
        dataRef.current = emptyData;
        setData(emptyData);
        setCloudRevision(0);
        revisionRef.current = 0;
        setHasUnsyncedChanges(false);
        dirtyRef.current = false;
        cloudReadyRef.current = false;
        setSyncStatus(navigator.onLine ? 'error' : 'offline');
      });

    return () => { active = false; };
  }, [configured, session?.user.id, session?.access_token, refreshSession, persistBackup, applyCloudState]);

  useEffect(() => {
    if (!configured || !session || !cloudReadyRef.current || applyingRemoteRef.current || !hasUnsyncedChanges || conflict) return;
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    setSyncStatus(navigator.onLine ? 'syncing' : 'offline');
    if (!navigator.onLine) return;
    syncTimerRef.current = window.setTimeout(() => {
      void saveToCloud(session, dataRef.current, revisionRef.current, pendingCloudBackupReasonRef.current ?? undefined).catch(() => undefined);
    }, 900);
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [data, configured, session, hasUnsyncedChanges, conflict, saveToCloud]);

  const syncNow = useCallback(async () => {
    if (!configured || !session || conflict) return;
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);

    if (!navigator.onLine) {
      setSyncStatus('offline');
      setSyncError('Tidak ada koneksi. Cache perangkat tetap tersedia sampai Supabase dapat dihubungi kembali.');
      return;
    }

    if (!cloudReadyRef.current) {
      setSyncStatus('loading');
      setSyncError(null);
      try {
        const row = await fetchCloudState(session);
        if (!row) {
          pendingSetupDeviceDataRef.current = loadAppData(session.user.id) ?? loadAppData();
          setSyncStatus('needs-setup');
          return;
        }
        applyCloudState(row, session.user.id);
      } catch (error) {
        setSyncStatus('error');
        setSyncError(readableError(error));
      }
      return;
    }

    if (hasUnsyncedChanges) {
      await saveToCloud(session, dataRef.current, revisionRef.current, pendingCloudBackupReasonRef.current ?? undefined);
      return;
    }
    const row = await fetchCloudState(session);
    if (!row || row.revision <= revisionRef.current) {
      setSyncStatus('synced');
      return;
    }
    persistBackup(dataRef.current, 'Sebelum menarik versi cloud');
    applyCloudState(row, session.user.id);
  }, [configured, session, conflict, hasUnsyncedChanges, saveToCloud, persistBackup, applyCloudState]);

  useEffect(() => {
    const handleOnline = () => {
      if (configured && session && !conflict) void syncNow().catch(() => undefined);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [configured, session, conflict, syncNow]);

  useEffect(() => {
    const pullNewerCloudState = async () => {
      if (
        document.visibilityState !== 'visible' || !configured || !session || !cloudReadyRef.current ||
        dirtyRef.current || conflict || syncStatus !== 'synced'
      ) return;
      try {
        const row = await fetchCloudState(session);
        if (!row || row.revision <= revisionRef.current) return;
        persistBackup(dataRef.current, 'Sebelum pembaruan dari perangkat lain');
        applyCloudState(row, session.user.id);
      } catch {
        // Pemeriksaan pasif tidak mengganggu data lokal.
      }
    };
    document.addEventListener('visibilitychange', pullNewerCloudState);
    return () => document.removeEventListener('visibilitychange', pullNewerCloudState);
  }, [configured, session, conflict, syncStatus, persistBackup, applyCloudState]);

  const initializeCloud = useCallback(async (source: 'device' | 'empty') => {
    if (!session) return;
    const nextData = source === 'empty'
      ? createEmptyData()
      : (pendingSetupDeviceDataRef.current ?? loadAppData(session.user.id) ?? loadAppData() ?? createEmptyData());
    setSyncError(null);
    try {
      const success = await saveToCloud(session, nextData, 0, source === 'empty' ? 'Inisialisasi akun kosong' : 'Migrasi data perangkat');
      if (!success) return;
      applyingRemoteRef.current = true;
      setData(nextData);
      saveAppData(nextData, session.user.id);
      clearLegacyAppData();
      pendingSetupDeviceDataRef.current = null;
      window.setTimeout(() => { applyingRemoteRef.current = false; }, 0);
    } catch {
      cloudReadyRef.current = false;
      setSyncStatus(navigator.onLine ? 'needs-setup' : 'offline');
    }
  }, [session, saveToCloud]);

  const acceptCloudConflict = useCallback(() => {
    if (!conflict || !session) return;
    persistBackup(dataRef.current, 'Versi perangkat sebelum memilih data cloud');
    applyingRemoteRef.current = true;
    setData(conflict.remoteData);
    saveAppData(conflict.remoteData, session.user.id);
    setCloudRevision(conflict.remoteRevision);
    revisionRef.current = conflict.remoteRevision;
    setLastSyncedAt(conflict.remoteUpdatedAt);
    setHasUnsyncedChanges(false);
    dirtyRef.current = false;
    setConflict(null);
    pendingCloudBackupReasonRef.current = null;
    setSyncError(null);
    setSyncStatus('synced');
    saveSyncMeta(session.user.id, {
      revision: conflict.remoteRevision,
      dirty: false,
      lastSyncedAt: conflict.remoteUpdatedAt
    });
    window.setTimeout(() => { applyingRemoteRef.current = false; }, 0);
  }, [conflict, session, persistBackup]);

  const keepDeviceConflict = useCallback(async () => {
    if (!conflict || !session) return;
    await saveToCloud(session, dataRef.current, conflict.remoteRevision, 'Versi cloud sebelum penyelesaian konflik');
  }, [conflict, session, saveToCloud]);

  const importData = useCallback((nextData: AppData, reason = 'Sebelum import data') => {
    persistBackup(dataRef.current, reason);
    pendingCloudBackupReasonRef.current = 'Versi cloud sebelum import data';
    markLocalChange(() => structuredClone(nextData));
  }, [markLocalChange, persistBackup]);

  const createManualBackup = useCallback(() => {
    persistBackup(dataRef.current, 'Backup manual');
  }, [persistBackup]);

  const restoreLocalBackup = useCallback((backupId: string) => {
    const backup = loadLocalBackups(session?.user.id).find((item) => item.id === backupId);
    if (!backup) return;
    persistBackup(dataRef.current, 'Sebelum memulihkan backup lokal');
    pendingCloudBackupReasonRef.current = 'Versi cloud sebelum pemulihan backup lokal';
    markLocalChange(() => structuredClone(backup.data));
  }, [session?.user.id, persistBackup, markLocalChange]);

  const deleteLocalBackup = useCallback((backupId: string) => {
    setLocalBackups(removeLocalBackup(backupId, session?.user.id));
  }, [session?.user.id]);

  const refreshCloudBackups = useCallback(async () => {
    if (!configured || !session) {
      setCloudBackups([]);
      return;
    }
    setBackupsLoading(true);
    try {
      setCloudBackups(await fetchCloudBackups(session));
    } finally {
      setBackupsLoading(false);
    }
  }, [configured, session]);

  const restoreCloudBackup = useCallback(async (backupId: string) => {
    if (!session) return;
    setBackupsLoading(true);
    try {
      const backupData = await fetchCloudBackupData(session, backupId);
      persistBackup(dataRef.current, 'Sebelum memulihkan backup cloud');
      pendingCloudBackupReasonRef.current = 'Versi cloud sebelum pemulihan backup';
      markLocalChange(() => structuredClone(backupData));
    } finally {
      setBackupsLoading(false);
    }
  }, [session, persistBackup, markLocalChange]);

  const addTask = useCallback((task: NewTask) => {
    markLocalChange((current) => {
      const nextTask: Task = {
        ...task,
        id: createId('task'),
        status: task.status ?? 'todo',
        labels: task.labels ?? [],
        subtasks: task.subtasks ?? [],
        createdAt: new Date().toISOString()
      };
      if (nextTask.status !== 'done') return { ...current, tasks: [nextTask, ...current.tasks] };
      const { id: _id, createdAt: _createdAt, ...updates } = nextTask;
      const initialTask: Task = { ...nextTask, status: 'todo', completedAt: undefined };
      return {
        ...current,
        tasks: updateTaskWithLifecycle([initialTask, ...current.tasks], initialTask.id, updates)
      };
    });
  }, [markLocalChange]);

  const updateTask = useCallback((taskId: string, updates: TaskUpdates) => {
    markLocalChange((current) => ({
      ...current,
      tasks: updateTaskWithLifecycle(current.tasks, taskId, updates)
    }));
  }, [markLocalChange]);

  const deleteTask = useCallback((taskId: string) => {
    markLocalChange((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId)
    }));
  }, [markLocalChange]);

  const addProject = useCallback((project: Omit<Project, 'id'>) => {
    markLocalChange((current) => ({ ...current, projects: [...current.projects, { ...project, id: createId('project') }] }));
  }, [markLocalChange]);

  const updateProject = useCallback((projectId: string, updates: Omit<Project, 'id'>) => {
    markLocalChange((current) => ({
      ...current,
      projects: current.projects.map((project) => project.id === projectId ? { ...updates, id: projectId } : project)
    }));
  }, [markLocalChange]);

  const deleteProject = useCallback((projectId: string) => {
    markLocalChange((current) => ({
      ...current,
      projects: current.projects.filter((project) => project.id !== projectId),
      tasks: current.tasks.map((task) => task.projectId === projectId ? { ...task, projectId: undefined } : task),
      notes: current.notes.map((note) => note.projectId === projectId ? { ...note, projectId: undefined } : note)
    }));
  }, [markLocalChange]);

  const toggleTask = useCallback((taskId: string) => {
    markLocalChange((current) => ({ ...current, tasks: toggleTaskWithLifecycle(current.tasks, taskId) }));
  }, [markLocalChange]);

  const addAccount = useCallback((account: Omit<Account, 'id'>) => {
    markLocalChange((current) => ({ ...current, accounts: [...current.accounts, { ...account, id: createId('account') }] }));
  }, [markLocalChange]);

  const updateAccount = useCallback((accountId: string, updates: Omit<Account, 'id'>) => {
    markLocalChange((current) => ({
      ...current,
      accounts: current.accounts.map((account) => account.id === accountId ? { ...updates, id: accountId } : account)
    }));
  }, [markLocalChange]);

  const deleteAccount = useCallback((accountId: string) => {
    if (
      dataRef.current.transactions.some((transaction) => transaction.accountId === accountId || transaction.toAccountId === accountId)
      || dataRef.current.tasks.some((task) => task.billAccountId === accountId && task.status !== 'done')
    ) return false;
    markLocalChange((current) => ({ ...current, accounts: current.accounts.filter((account) => account.id !== accountId) }));
    return true;
  }, [markLocalChange]);

  const addHabit = useCallback((habit: Omit<Habit, 'id' | 'logs'>) => {
    markLocalChange((current) => ({ ...current, habits: [{ ...habit, id: createId('habit'), logs: {} }, ...current.habits] }));
  }, [markLocalChange]);

  const updateHabit = useCallback((habitId: string, updates: Omit<Habit, 'id' | 'logs'>) => {
    markLocalChange((current) => ({
      ...current,
      habits: current.habits.map((habit) => habit.id === habitId ? { ...updates, id: habitId, logs: habit.logs } : habit)
    }));
  }, [markLocalChange]);

  const deleteHabit = useCallback((habitId: string) => {
    markLocalChange((current) => ({ ...current, habits: current.habits.filter((habit) => habit.id !== habitId) }));
  }, [markLocalChange]);

  const addTransaction = useCallback((transaction: NewTransaction) => {
    markLocalChange((current) => ({
      ...current,
      transactions: [{ ...transaction, id: createId('trx'), createdAt: new Date().toISOString() }, ...current.transactions]
    }));
  }, [markLocalChange]);

  const updateTransaction = useCallback((transactionId: string, updates: TransactionUpdates) => {
    markLocalChange((current) => ({
      ...current,
      transactions: current.transactions.map((transaction) => transaction.id === transactionId
        ? { ...updates, id: transactionId, createdAt: transaction.createdAt }
        : transaction)
    }));
  }, [markLocalChange]);

  const deleteTransaction = useCallback((transactionId: string) => {
    markLocalChange((current) => ({ ...current, transactions: current.transactions.filter((transaction) => transaction.id !== transactionId) }));
  }, [markLocalChange]);

  const logHabit = useCallback((habitId: string, value?: number, date = new Date()) => {
    const dayKey = format(date, 'yyyy-MM-dd');
    markLocalChange((current) => ({
      ...current,
      habits: current.habits.map((habit) => {
        if (habit.id !== habitId) return habit;
        const currentValue = habit.logs[dayKey] ?? 0;
        const nextValue = value ?? (habit.metric === 'boolean' ? (currentValue ? 0 : 1) : currentValue + 1);
        return { ...habit, logs: { ...habit.logs, [dayKey]: nextValue } };
      })
    }));
  }, [markLocalChange]);

  const updatePrayerSettings = useCallback((settings: PrayerSettings) => {
    markLocalChange((current) => ({ ...current, prayerSettings: settings }));
  }, [markLocalChange]);

  const cyclePrayer = useCallback((prayer: PrayerName) => {
    const dayKey = format(new Date(), 'yyyy-MM-dd');
    markLocalChange((current) => {
      const existing = current.prayers.find((item) => item.date === dayKey && item.prayer === prayer);
      const currentIndex = prayerCycle.indexOf(existing?.status ?? 'belum');
      const status = prayerCycle[(currentIndex + 1) % prayerCycle.length];
      const prayers = existing
        ? current.prayers.map((item) => item.date === dayKey && item.prayer === prayer ? { ...item, status } : item)
        : [...current.prayers, { date: dayKey, prayer, status }];
      return { ...current, prayers };
    });
  }, [markLocalChange]);

  const addNote = useCallback((note: NewNote) => {
    const now = new Date().toISOString();
    markLocalChange((current) => ({
      ...current,
      notes: [{ ...note, id: createId('note'), createdAt: now, updatedAt: now }, ...current.notes]
    }));
  }, [markLocalChange]);

  const updateNote = useCallback((noteId: string, updates: NewNote) => {
    markLocalChange((current) => ({
      ...current,
      notes: current.notes.map((note) => note.id === noteId
        ? { ...updates, id: noteId, createdAt: note.createdAt, updatedAt: new Date().toISOString() }
        : note)
    }));
  }, [markLocalChange]);

  const deleteNote = useCallback((noteId: string) => {
    markLocalChange((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== noteId) }));
  }, [markLocalChange]);

  const addBudget = useCallback((budget: Omit<Budget, 'id'>) => {
    markLocalChange((current) => {
      const existing = current.budgets.find(
        (item) => item.month === budget.month && normalizeCategory(item.category) === normalizeCategory(budget.category)
      );
      return {
        ...current,
        budgets: existing
          ? current.budgets.map((item) => item.id === existing.id ? { ...item, ...budget } : item)
          : [...current.budgets, { ...budget, id: createId('budget') }]
      };
    });
  }, [markLocalChange]);

  const updateBudget = useCallback((budgetId: string, updates: Omit<Budget, 'id'>) => {
    markLocalChange((current) => ({
      ...current,
      budgets: current.budgets
        .filter((budget) => budget.id === budgetId || !(
          budget.month === updates.month
          && normalizeCategory(budget.category) === normalizeCategory(updates.category)
        ))
        .map((budget) => budget.id === budgetId ? { ...updates, id: budgetId } : budget)
    }));
  }, [markLocalChange]);

  const deleteBudget = useCallback((budgetId: string) => {
    markLocalChange((current) => ({ ...current, budgets: current.budgets.filter((budget) => budget.id !== budgetId) }));
  }, [markLocalChange]);

  const saveReview = useCallback((review: WeeklyReview) => {
    markLocalChange((current) => ({
      ...current,
      reviews: [review, ...current.reviews.filter((item) => item.weekKey !== review.weekKey)]
    }));
  }, [markLocalChange]);

  const resetData = useCallback(() => {
    persistBackup(dataRef.current, 'Sebelum reset data');
    pendingCloudBackupReasonRef.current = 'Versi cloud sebelum reset data';
    clearAppData(session?.user.id);
    if (!session) clearAppData();
    markLocalChange(() => createEmptyData());
  }, [session, persistBackup, markLocalChange]);

  const value = useMemo<StoreValue>(() => ({
    data,
    syncStatus,
    syncError,
    lastSyncedAt,
    cloudEnabled: configured,
    cloudRevision,
    hasUnsyncedChanges,
    conflict,
    localBackups,
    cloudBackups,
    backupsLoading,
    addTask,
    updateTask,
    deleteTask,
    addProject,
    updateProject,
    deleteProject,
    toggleTask,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    addHabit,
    updateHabit,
    deleteHabit,
    logHabit,
    cyclePrayer,
    updatePrayerSettings,
    addNote,
    updateNote,
    deleteNote,
    addBudget,
    updateBudget,
    deleteBudget,
    saveReview,
    resetData,
    syncNow,
    initializeCloud,
    acceptCloudConflict,
    keepDeviceConflict,
    importData,
    createManualBackup,
    restoreLocalBackup,
    deleteLocalBackup,
    refreshCloudBackups,
    restoreCloudBackup
  }), [
    data, syncStatus, syncError, lastSyncedAt, configured, cloudRevision, hasUnsyncedChanges, conflict,
    localBackups, cloudBackups, backupsLoading, addTask, updateTask, deleteTask, addProject, updateProject, deleteProject, toggleTask,
    addTransaction, updateTransaction, deleteTransaction, addAccount, updateAccount, deleteAccount, addHabit, updateHabit, deleteHabit, logHabit, cyclePrayer, updatePrayerSettings, addNote, updateNote, deleteNote, addBudget, updateBudget, deleteBudget, saveReview, resetData, syncNow,
    initializeCloud, acceptCloudConflict, keepDeviceConflict, importData, createManualBackup, restoreLocalBackup,
    deleteLocalBackup, refreshCloudBackups, restoreCloudBackup
  ]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
};

export const useAppStore = () => {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error('useAppStore must be used inside AppStoreProvider');
  return context;
};
