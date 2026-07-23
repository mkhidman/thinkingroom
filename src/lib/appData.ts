import type {
  Account,
  AppData,
  Budget,
  Habit,
  Note,
  PrayerLog,
  PrayerSettings,
  Project,
  RecurrenceRule,
  Task,
  Transaction,
  WeeklyReview
} from '../types';

const appDataKeys: Array<keyof AppData> = [
  'tasks', 'projects', 'habits', 'prayers', 'notes', 'accounts', 'transactions', 'budgets', 'reviews'
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isOptionalString = (value: unknown) => value === undefined || isString(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isOptionalFiniteNumber = (value: unknown) => value === undefined || isFiniteNumber(value);
const isEnum = <T extends string>(value: unknown, values: readonly T[]): value is T =>
  typeof value === 'string' && values.includes(value as T);
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);
const isIsoDate = (value: unknown) =>
  isString(value) && value.trim().length > 0 && Number.isFinite(Date.parse(value));
const isOptionalIsoDate = (value: unknown) => value === undefined || isIsoDate(value);
const isDateKey = (value: unknown) =>
  isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00`));
const isMonthKey = (value: unknown) => isString(value) && /^\d{4}-\d{2}$/.test(value);
const hasBaseId = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && isString(value.id) && value.id.length > 0;

const isRecurrenceRule = (value: unknown): value is RecurrenceRule => {
  if (!isRecord(value)) return false;
  return isEnum(value.frequency, ['daily', 'weekly', 'monthly'])
    && isFiniteNumber(value.interval) && value.interval >= 1
    && isEnum(value.mode, ['fixed_schedule', 'after_completion'])
    && (value.daysOfWeek === undefined || (
      Array.isArray(value.daysOfWeek)
      && value.daysOfWeek.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    ))
    && (value.dayOfMonth === undefined || (
      Number.isInteger(value.dayOfMonth) && Number(value.dayOfMonth) >= 1 && Number(value.dayOfMonth) <= 31
    ))
    && (value.monthlyOverflow === undefined || isEnum(value.monthlyOverflow, ['last_day', 'skip_month']))
    && isOptionalIsoDate(value.endDate)
    && (value.maxOccurrences === undefined || (
      Number.isInteger(value.maxOccurrences) && Number(value.maxOccurrences) >= 1
    ))
    && (value.occurrenceCount === undefined || (
      Number.isInteger(value.occurrenceCount) && Number(value.occurrenceCount) >= 1
    ))
    && (value.paused === undefined || typeof value.paused === 'boolean')
    && isDateKey(value.anchorDate);
};

const isTask = (value: unknown): value is Task => {
  if (!hasBaseId(value)) return false;
  return isString(value.title) && value.title.trim().length > 0
    && isOptionalString(value.description)
    && isOptionalString(value.projectId)
    && isEnum(value.status, ['todo', 'waiting', 'done'])
    && isFiniteNumber(value.priority) && [1, 2, 3, 4].includes(value.priority)
    && isOptionalIsoDate(value.dueAt)
    && isOptionalIsoDate(value.deadlineAt)
    && isOptionalIsoDate(value.reminderAt)
    && isOptionalFiniteNumber(value.estimateMinutes)
    && isStringArray(value.labels)
    && (value.billAmount === undefined || (isFiniteNumber(value.billAmount) && value.billAmount > 0))
    && isOptionalString(value.billAccountId)
    && isOptionalString(value.billCategory)
    && Array.isArray(value.subtasks)
    && value.subtasks.every((subtask) => hasBaseId(subtask)
      && isString(subtask.title)
      && typeof subtask.done === 'boolean')
    && (value.recurrence === undefined || isRecurrenceRule(value.recurrence))
    && isOptionalString(value.seriesId)
    && isOptionalString(value.previousOccurrenceId)
    && isOptionalIsoDate(value.completedAt)
    && isIsoDate(value.createdAt);
};

const isProject = (value: unknown): value is Project =>
  hasBaseId(value)
  && isString(value.name)
  && isString(value.color)
  && isEnum(value.status, ['active', 'paused', 'done'])
  && isOptionalString(value.note);

const isHabit = (value: unknown): value is Habit =>
  hasBaseId(value)
  && isString(value.name)
  && isEnum(value.metric, ['boolean', 'count', 'duration'])
  && isFiniteNumber(value.targetValue) && value.targetValue > 0
  && isString(value.unit)
  && isFiniteNumber(value.targetPerWeek) && value.targetPerWeek >= 0
  && Array.isArray(value.daysOfWeek)
  && value.daysOfWeek.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  && isOptionalString(value.reminderTime)
  && (value.paused === undefined || typeof value.paused === 'boolean')
  && isRecord(value.logs)
  && Object.entries(value.logs).every(([key, logValue]) => isDateKey(key) && isFiniteNumber(logValue) && logValue >= 0);

const isPrayer = (value: unknown): value is PrayerLog =>
  isRecord(value)
  && isDateKey(value.date)
  && isEnum(value.prayer, ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'])
  && isEnum(value.status, ['belum', 'selesai', 'tepat-waktu', 'berjamaah'])
  && isOptionalString(value.note);

const isNote = (value: unknown): value is Note =>
  hasBaseId(value)
  && isString(value.title)
  && isString(value.content)
  && isEnum(value.type, ['note', 'decision', 'idea'])
  && isOptionalString(value.projectId)
  && isStringArray(value.tags)
  && isIsoDate(value.createdAt)
  && isIsoDate(value.updatedAt);

const isAccount = (value: unknown): value is Account =>
  hasBaseId(value)
  && isString(value.name)
  && isEnum(value.type, ['cash', 'bank', 'ewallet'])
  && isFiniteNumber(value.openingBalance)
  && isString(value.color);

const isTransaction = (value: unknown): value is Transaction =>
  hasBaseId(value)
  && isEnum(value.type, ['income', 'expense', 'transfer'])
  && isFiniteNumber(value.amount) && value.amount > 0
  && isString(value.accountId)
  && isOptionalString(value.toAccountId)
  && isString(value.category)
  && isString(value.note)
  && isDateKey(value.date)
  && isIsoDate(value.createdAt);

const isBudget = (value: unknown): value is Budget =>
  hasBaseId(value)
  && isString(value.category)
  && value.category.trim().length > 0
  && isFiniteNumber(value.limit) && value.limit > 0
  && isMonthKey(value.month);

const isReview = (value: unknown): value is WeeklyReview =>
  isRecord(value)
  && isDateKey(value.weekKey)
  && isString(value.wins)
  && isString(value.obstacles)
  && isString(value.stopDoing)
  && isString(value.nextFocus)
  && isIsoDate(value.updatedAt);

const isPrayerSettings = (value: unknown): value is PrayerSettings =>
  isRecord(value)
  && isString(value.locationName)
  && isFiniteNumber(value.latitude) && value.latitude >= -90 && value.latitude <= 90
  && isFiniteNumber(value.longitude) && value.longitude >= -180 && value.longitude <= 180
  && isFiniteNumber(value.timezone) && value.timezone >= -12 && value.timezone <= 14
  && isFiniteNumber(value.fajrAngle) && value.fajrAngle >= 10 && value.fajrAngle <= 30
  && isFiniteNumber(value.ishaAngle) && value.ishaAngle >= 10 && value.ishaAngle <= 30
  && (value.asrShadowFactor === 1 || value.asrShadowFactor === 2);

export const isAppData = (value: unknown): value is AppData => {
  if (!isRecord(value) || !appDataKeys.every((key) => Array.isArray(value[key]))) return false;
  const record = value as Record<keyof AppData, unknown>;
  const structurallyValid = (record.tasks as unknown[]).every(isTask)
    && (record.projects as unknown[]).every(isProject)
    && (record.habits as unknown[]).every(isHabit)
    && (record.prayers as unknown[]).every(isPrayer)
    && (record.notes as unknown[]).every(isNote)
    && (record.accounts as unknown[]).every(isAccount)
    && (record.transactions as unknown[]).every(isTransaction)
    && (record.budgets as unknown[]).every(isBudget)
    && (record.reviews as unknown[]).every(isReview)
    && (record.prayerSettings === undefined || isPrayerSettings(record.prayerSettings));
  return structurallyValid;
};
