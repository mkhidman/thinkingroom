import type { AppData } from '../types';

/**
 * Produces a genuinely empty workspace. Demo/seed content is intentionally
 * not bundled with the production application.
 */
export const createEmptyData = (): AppData => ({
  tasks: [],
  projects: [],
  habits: [],
  prayers: [],
  notes: [],
  accounts: [],
  transactions: [],
  budgets: [],
  reviews: []
});
