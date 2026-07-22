import type { AppData } from '../types';

const appDataKeys: Array<keyof AppData> = [
  'tasks', 'projects', 'habits', 'prayers', 'notes', 'accounts', 'transactions', 'budgets', 'reviews'
];

export const isAppData = (value: unknown): value is AppData => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return appDataKeys.every((key) => Array.isArray(record[key]));
};
