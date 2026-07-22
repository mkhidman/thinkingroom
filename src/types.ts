export type PageId = 'today' | 'tasks' | 'routines' | 'notes' | 'finance' | 'review';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';
export type RecurrenceMode = 'fixed_schedule' | 'after_completion';
export type MonthlyOverflow = 'last_day' | 'skip_month';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  mode: RecurrenceMode;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthlyOverflow?: MonthlyOverflow;
  endDate?: string;
  maxOccurrences?: number;
  occurrenceCount?: number;
  paused?: boolean;
  anchorDate: string;
}

export type TaskStatus = 'todo' | 'waiting' | 'done';
export type Priority = 1 | 2 | 3 | 4;

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  status: TaskStatus;
  priority: Priority;
  /** Waktu tugas direncanakan mulai/dikerjakan. */
  dueAt?: string;
  /** Batas akhir penyelesaian yang terpisah dari jadwal pengerjaan. */
  deadlineAt?: string;
  /** Waktu reminder eksplisit; jika kosong, pengaturan reminder global digunakan. */
  reminderAt?: string;
  estimateMinutes?: number;
  labels: string[];
  subtasks: Subtask[];
  recurrence?: RecurrenceRule;
  seriesId?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  status: 'active' | 'paused' | 'done';
  note?: string;
}

export type HabitMetric = 'boolean' | 'count' | 'duration';

export interface Habit {
  id: string;
  name: string;
  metric: HabitMetric;
  targetValue: number;
  unit: string;
  targetPerWeek: number;
  daysOfWeek: number[];
  reminderTime?: string;
  paused?: boolean;
  logs: Record<string, number>;
}

export type PrayerName = 'Subuh' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya';
export type PrayerStatus = 'belum' | 'selesai' | 'tepat-waktu' | 'berjamaah';

export interface PrayerLog {
  date: string;
  prayer: PrayerName;
  status: PrayerStatus;
  note?: string;
}

export type NoteType = 'note' | 'decision' | 'idea';

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  projectId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type AccountType = 'cash' | 'bank' | 'ewallet';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId?: string;
  category: string;
  note: string;
  date: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  month: string;
}

export interface WeeklyReview {
  weekKey: string;
  wins: string;
  obstacles: string;
  stopDoing: string;
  nextFocus: string;
  updatedAt: string;
}

export interface AppData {
  tasks: Task[];
  projects: Project[];
  habits: Habit[];
  prayers: PrayerLog[];
  notes: Note[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  reviews: WeeklyReview[];
}
