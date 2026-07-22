import { isAppData } from './appData';
import { createId } from './id';
import type { Account, AppData, Transaction } from '../types';

export const BACKUP_SCHEMA_VERSION = 1;
const MAX_LOCAL_BACKUPS = 10;
const BACKUP_KEY = 'ruang-life-os-backups-v1';

export interface RuangBackupFile {
  product: 'ruang-personal-life-os';
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  data: AppData;
}

export interface LocalBackupSnapshot {
  id: string;
  createdAt: string;
  reason: string;
  data: AppData;
}

const keyFor = (userId?: string) => userId ? `${BACKUP_KEY}:user:${userId}` : BACKUP_KEY;
const safeDate = (iso: string) => iso.replace(/[:.]/g, '-');

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const createBackupEnvelope = (data: AppData): RuangBackupFile => ({
  product: 'ruang-personal-life-os',
  schemaVersion: BACKUP_SCHEMA_VERSION,
  appVersion: '0.4.0',
  exportedAt: new Date().toISOString(),
  data
});

export const downloadDataBackup = (data: AppData, suffix = 'backup') => {
  const envelope = createBackupEnvelope(data);
  const json = JSON.stringify(envelope, null, 2);
  downloadBlob(
    new Blob([json], { type: 'application/json;charset=utf-8' }),
    `ruang-${suffix}-${safeDate(envelope.exportedAt)}.json`
  );
};

const csvCell = (value: string | number | undefined) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

export const downloadTransactionsCsv = (transactions: Transaction[], accounts: Account[]) => {
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const header = ['tanggal', 'tipe', 'jumlah', 'rekening_asal', 'rekening_tujuan', 'kategori', 'catatan', 'dibuat_pada'];
  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.type,
    transaction.amount,
    accountNames.get(transaction.accountId) ?? transaction.accountId,
    transaction.toAccountId ? (accountNames.get(transaction.toAccountId) ?? transaction.toAccountId) : '',
    transaction.category,
    transaction.note,
    transaction.createdAt
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  downloadBlob(
    new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
    `ruang-transaksi-${safeDate(new Date().toISOString())}.csv`
  );
};

export const parseBackupFile = async (file: File): Promise<RuangBackupFile> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text()) as unknown;
  } catch {
    throw new Error('File tidak berisi JSON yang valid.');
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('Format backup tidak dikenali.');
  const record = parsed as Record<string, unknown>;

  // Mendukung file envelope Fase 3 dan export AppData mentah dari versi awal.
  if (isAppData(record.data)) {
    const schemaVersion = typeof record.schemaVersion === 'number' ? record.schemaVersion : 1;
    if (schemaVersion > BACKUP_SCHEMA_VERSION) {
      throw new Error('Backup berasal dari versi aplikasi yang lebih baru dan belum didukung.');
    }
    return {
      product: 'ruang-personal-life-os',
      schemaVersion,
      appVersion: typeof record.appVersion === 'string' ? record.appVersion : 'unknown',
      exportedAt: typeof record.exportedAt === 'string' ? record.exportedAt : new Date().toISOString(),
      data: record.data
    };
  }

  if (isAppData(parsed)) {
    return {
      product: 'ruang-personal-life-os',
      schemaVersion: 1,
      appVersion: 'legacy',
      exportedAt: new Date().toISOString(),
      data: parsed
    };
  }

  throw new Error('Isi file bukan backup data Ruang yang valid.');
};

export const loadLocalBackups = (userId?: string): LocalBackupSnapshot[] => {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is LocalBackupSnapshot => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Record<string, unknown>;
      return typeof record.id === 'string' && typeof record.createdAt === 'string' && typeof record.reason === 'string' && isAppData(record.data);
    });
  } catch {
    return [];
  }
};

const persistWithQuotaFallback = (snapshots: LocalBackupSnapshot[], userId?: string) => {
  let candidates = snapshots.slice(0, MAX_LOCAL_BACKUPS);
  while (candidates.length) {
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(candidates));
      return candidates;
    } catch {
      candidates = candidates.slice(0, -1);
    }
  }
  return [];
};

export const createLocalBackup = (data: AppData, reason: string, userId?: string) => {
  const snapshot: LocalBackupSnapshot = {
    id: createId('backup'),
    createdAt: new Date().toISOString(),
    reason,
    data: structuredClone(data)
  };
  return persistWithQuotaFallback([snapshot, ...loadLocalBackups(userId)], userId);
};

export const deleteLocalBackup = (backupId: string, userId?: string) =>
  persistWithQuotaFallback(loadLocalBackups(userId).filter((item) => item.id !== backupId), userId);

export const clearLocalBackups = (userId?: string) => localStorage.removeItem(keyFor(userId));

export const describeData = (data: AppData) => ({
  tasks: data.tasks.length,
  projects: data.projects.length,
  habits: data.habits.length,
  notes: data.notes.length,
  accounts: data.accounts.length,
  transactions: data.transactions.length
});
