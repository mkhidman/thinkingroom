import type { Task } from '../types';
import { createRecurringTask } from './recurrence';

type TaskUpdates = Omit<Task, 'id' | 'createdAt'>;

const sameSeries = (first: Task, second: Task) => {
  const firstSeries = first.seriesId ?? first.id;
  const secondSeries = second.seriesId ?? second.id;
  return firstSeries === secondSeries;
};

const isGeneratedNextOccurrence = (candidate: Task, source: Task) => {
  if (candidate.previousOccurrenceId === source.id) return true;
  // Kompatibilitas untuk occurrence yang dibuat sebelum field
  // previousOccurrenceId diperkenalkan.
  return Boolean(
    source.recurrence
    && candidate.recurrence
    && sameSeries(candidate, source)
    && candidate.status !== 'done'
    && (candidate.recurrence.occurrenceCount ?? 1) === (source.recurrence.occurrenceCount ?? 1) + 1
    && new Date(candidate.createdAt).getTime() >= new Date(source.completedAt ?? source.createdAt).getTime()
  );
};

export const updateTaskWithLifecycle = (
  tasks: Task[],
  taskId: string,
  updates: TaskUpdates,
  now = new Date()
): Task[] => {
  const current = tasks.find((task) => task.id === taskId);
  if (!current) return tasks;

  const nextStatus = updates.status;
  const replacement: Task = { ...updates, id: taskId, createdAt: current.createdAt };

  if (current.status !== 'done' && nextStatus === 'done') {
    const completedAt = replacement.completedAt ?? now.toISOString();
    const completedTask = { ...replacement, completedAt };
    const generated = createRecurringTask(completedTask, completedAt);
    const updated = tasks.map((task) => task.id === taskId ? completedTask : task);
    if (!generated || updated.some((task) => isGeneratedNextOccurrence(task, completedTask))) return updated;
    return [generated, ...updated];
  }

  if (current.status === 'done' && nextStatus !== 'done') {
    // Undo completion membuang occurrence otomatis yang belum selesai agar
    // tidak ada dua task aktif dari satu seri.
    return tasks
      .filter((task) => task.id === taskId || !isGeneratedNextOccurrence(task, current))
      .map((task) => task.id === taskId
        ? { ...replacement, completedAt: undefined }
        : task);
  }

  return tasks.map((task) => task.id === taskId ? replacement : task);
};

export const toggleTaskWithLifecycle = (tasks: Task[], taskId: string, now = new Date()): Task[] => {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return tasks;
  const { id: _id, createdAt: _createdAt, ...updates } = task;
  return updateTaskWithLifecycle(tasks, taskId, {
    ...updates,
    status: task.status === 'done' ? 'todo' : 'done',
    completedAt: task.status === 'done' ? undefined : now.toISOString()
  }, now);
};
