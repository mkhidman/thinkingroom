import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarWeeks,
  endOfMonth,
  getDate,
  getDay,
  isAfter,
  isValid,
  parseISO,
  setDate,
  startOfWeek
} from 'date-fns';
import type { RecurrenceRule, Task } from '../types';
import { createId } from './id';

const normalize = (date: Date) => {
  const copy = new Date(date);
  copy.setSeconds(0, 0);
  return copy;
};

const isBeyondRule = (candidate: Date, rule: RecurrenceRule) => {
  if (rule.endDate && isAfter(candidate, parseISO(rule.endDate))) return true;
  if (rule.maxOccurrences && (rule.occurrenceCount ?? 1) >= rule.maxOccurrences) return true;
  return false;
};

const monthlyCandidate = (base: Date, rule: RecurrenceRule): Date | null => {
  const targetDay = rule.dayOfMonth ?? getDate(base);
  const interval = Math.max(1, Math.floor(rule.interval));
  let monthCursor = addMonths(base, interval);
  const lastDay = getDate(endOfMonth(monthCursor));

  if (targetDay <= lastDay) return setDate(monthCursor, targetDay);
  if (rule.monthlyOverflow === 'skip_month') {
    // Kalender Gregorian berulang setiap 400 tahun. Jika tidak ada tanggal
    // yang cocok dalam rentang ini, kombinasi interval dan tanggal memang
    // tidak akan pernah menghasilkan occurrence yang valid.
    const attempts = Math.ceil(4_800 / interval);
    for (let i = 0; i < attempts; i += 1) {
      monthCursor = addMonths(monthCursor, interval);
      const candidateLastDay = getDate(endOfMonth(monthCursor));
      if (targetDay <= candidateLastDay) return setDate(monthCursor, targetDay);
    }
    return null;
  }
  return setDate(monthCursor, getDate(endOfMonth(monthCursor)));
};

export const getNextOccurrence = (
  rule: RecurrenceRule,
  currentDueAt: string | undefined,
  completedAt: string
): string | null => {
  if (rule.paused) return null;

  const completed = normalize(parseISO(completedAt));
  const current = currentDueAt ? normalize(parseISO(currentDueAt)) : completed;
  let candidate: Date | null;

  if (rule.mode === 'after_completion') {
    if (rule.frequency === 'daily') candidate = addDays(completed, rule.interval);
    else if (rule.frequency === 'weekly') candidate = addWeeks(completed, rule.interval);
    else candidate = monthlyCandidate(completed, rule);
  } else if (rule.frequency === 'daily') {
    candidate = addDays(current, rule.interval);
    while (!isAfter(candidate, completed)) candidate = addDays(candidate, rule.interval);
  } else if (rule.frequency === 'monthly') {
    candidate = monthlyCandidate(current, rule);
    while (candidate && !isAfter(candidate, completed)) candidate = monthlyCandidate(candidate, rule);
  } else {
    const allowedDays = rule.daysOfWeek?.length ? rule.daysOfWeek : [getDay(current)];
    const anchorWeek = startOfWeek(parseISO(rule.anchorDate), { weekStartsOn: 1 });
    candidate = addDays(current, 1);

    let found = false;
    // Interval UI dibatasi, tetapi guard ini juga melindungi data import lama.
    const maxSearchDays = Math.min(400 * 366, Math.max(740, rule.interval * 14 + 14));
    for (let i = 0; i < maxSearchDays; i += 1) {
      const candidateWeek = startOfWeek(candidate, { weekStartsOn: 1 });
      const weekDistance = differenceInCalendarWeeks(candidateWeek, anchorWeek, { weekStartsOn: 1 });
      const inCorrectInterval = weekDistance >= 0 && weekDistance % Math.max(1, rule.interval) === 0;
      if (isAfter(candidate, completed) && inCorrectInterval && allowedDays.includes(getDay(candidate))) {
        found = true;
        break;
      }
      candidate = addDays(candidate, 1);
    }
    if (!found) return null;
  }

  if (!candidate || !isValid(candidate) || isBeyondRule(candidate, rule)) return null;
  return candidate.toISOString();
};

export const createRecurringTask = (task: Task, completedAt: string): Task | null => {
  if (!task.recurrence) return null;
  const nextDueAt = getNextOccurrence(task.recurrence, task.dueAt, completedAt);
  if (!nextDueAt) return null;

  // Deadline mengikuti jarak relatif dari jadwal pengerjaan. Contoh: tugas
  // dijadwalkan Senin 08.00 dengan deadline Senin 17.00 akan tetap memiliki
  // rentang sembilan jam pada kejadian berikutnya.
  const deadlineOffset = task.deadlineAt && task.dueAt
    ? new Date(task.deadlineAt).getTime() - new Date(task.dueAt).getTime()
    : null;
  const nextDeadlineAt = deadlineOffset !== null
    ? new Date(new Date(nextDueAt).getTime() + deadlineOffset).toISOString()
    : task.deadlineAt
      ? getNextOccurrence(task.recurrence, task.deadlineAt, completedAt) ?? undefined
      : undefined;

  return {
    ...task,
    id: createId('task'),
    status: 'todo',
    completedAt: undefined,
    dueAt: nextDueAt,
    deadlineAt: nextDeadlineAt,
    reminderAt: undefined,
    seriesId: task.seriesId ?? task.id,
    previousOccurrenceId: task.id,
    subtasks: task.subtasks.map((subtask) => ({ ...subtask, id: createId('sub'), done: false })),
    recurrence: {
      ...task.recurrence,
      occurrenceCount: (task.recurrence.occurrenceCount ?? 1) + 1
    },
    createdAt: new Date().toISOString()
  };
};
