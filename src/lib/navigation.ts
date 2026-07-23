import type { PageId } from '../types';

const FOCUS_KEY = 'ruang-pending-focus-v1';

export const setPendingFocus = (page: PageId, id: string) => {
  try {
    sessionStorage.setItem(FOCUS_KEY, JSON.stringify({ page, id }));
  } catch {
    // Deep-link focus adalah enhancement; navigasi halaman tetap berjalan.
  }
};

export const consumePendingFocus = (page: PageId): string | null => {
  try {
    const raw = sessionStorage.getItem(FOCUS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { page?: PageId; id?: string };
    if (parsed.page !== page || typeof parsed.id !== 'string') return null;
    sessionStorage.removeItem(FOCUS_KEY);
    return parsed.id;
  } catch {
    return null;
  }
};
