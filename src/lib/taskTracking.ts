import { isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';
import type { Task } from '../types';

const parseTaskDate = (value?: string) => value ? parseISO(value) : null;

export const isTaskDeadlineOverdue = (task: Task, now = new Date()) => {
  const deadline = parseTaskDate(task.deadlineAt);
  return task.status === 'todo' && Boolean(deadline && isBefore(deadline, now));
};

export const isTaskScheduledToday = (task: Task, now = new Date()) => {
  const schedule = parseTaskDate(task.dueAt);
  return Boolean(schedule && isSameDay(schedule, now));
};

export const isTaskDeadlineToday = (task: Task, now = new Date()) => {
  const deadline = parseTaskDate(task.deadlineAt);
  return Boolean(deadline && isSameDay(deadline, now));
};

/**
 * Jadwal pengerjaan sudah lewat sebelum hari ini, tetapi deadline belum lewat.
 * Ini berbeda dari overdue: tugas masih mungkin berada di dalam batas deadline.
 */
export const isTaskScheduleDeferred = (task: Task, now = new Date()) => {
  if (task.status !== 'todo' || !task.dueAt || isTaskDeadlineOverdue(task, now)) return false;
  return isBefore(parseISO(task.dueAt), startOfDay(now));
};

export const isTaskUnscheduled = (task: Task) => (
  task.status === 'todo' && !task.dueAt && !task.deadlineAt
);

/**
 * Daftar Hari Ini juga memuat pekerjaan yang membutuhkan keputusan ulang:
 * jadwal terlewat dan deadline terlewat tidak boleh menghilang dari UI.
 */
export const taskNeedsAttentionToday = (task: Task, now = new Date()) => {
  if (task.status !== 'todo') return false;
  return (
    isTaskScheduledToday(task, now)
    || isTaskDeadlineToday(task, now)
    || isTaskDeadlineOverdue(task, now)
    || isTaskScheduleDeferred(task, now)
  );
};

export const isTaskUpcoming = (task: Task, now = new Date()) => {
  if (task.status !== 'todo') return false;
  if (taskNeedsAttentionToday(task, now) || isTaskUnscheduled(task)) return false;

  const schedule = parseTaskDate(task.dueAt);
  const deadline = parseTaskDate(task.deadlineAt);
  return Boolean(
    (schedule && isBefore(now, schedule))
    || (deadline && isBefore(now, deadline))
  );
};

export const getTaskTrackingDate = (task: Task) => task.deadlineAt ?? task.dueAt;

export const compareTasksByAttention = (a: Task, b: Task, now = new Date()) => {
  const aOverdue = isTaskDeadlineOverdue(a, now);
  const bOverdue = isTaskDeadlineOverdue(b, now);
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

  const aDeferred = isTaskScheduleDeferred(a, now);
  const bDeferred = isTaskScheduleDeferred(b, now);
  if (aDeferred !== bDeferred) return aDeferred ? -1 : 1;

  return a.priority - b.priority
    || (getTaskTrackingDate(a) ?? '').localeCompare(getTaskTrackingDate(b) ?? '');
};
