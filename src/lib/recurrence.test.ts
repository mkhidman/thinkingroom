import { describe, expect, it } from 'vitest';
import type { RecurrenceRule, Task } from '../types';
import { getNextOccurrence } from './recurrence';
import { toggleTaskWithLifecycle, updateTaskWithLifecycle } from './taskLifecycle';

const baseTask = (recurrence?: RecurrenceRule): Task => ({
  id: 'task-1',
  title: 'Review rutin',
  status: 'todo',
  priority: 2,
  dueAt: '2026-07-20T02:00:00.000Z',
  labels: [],
  subtasks: [{ id: 'sub-1', title: 'Langkah', done: true }],
  recurrence,
  createdAt: '2026-07-01T00:00:00.000Z'
});

describe('recurrence engine', () => {
  it('menghasilkan occurrence daily berikutnya setelah completion', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 2,
      mode: 'after_completion',
      anchorDate: '2026-07-20'
    };
    expect(getNextOccurrence(rule, undefined, '2026-07-23T02:00:00.000Z'))
      .toBe('2026-07-25T02:00:00.000Z');
  });

  it('mengembalikan null untuk kombinasi skip-month yang tidak pernah valid', () => {
    const rule: RecurrenceRule = {
      frequency: 'monthly',
      interval: 12,
      mode: 'fixed_schedule',
      dayOfMonth: 31,
      monthlyOverflow: 'skip_month',
      anchorDate: '2026-02-28'
    };
    expect(getNextOccurrence(rule, '2026-02-28T02:00:00.000Z', '2026-02-28T03:00:00.000Z'))
      .toBeNull();
  });
});

describe('task lifecycle', () => {
  const recurrence: RecurrenceRule = {
    frequency: 'daily',
    interval: 1,
    mode: 'fixed_schedule',
    anchorDate: '2026-07-20',
    occurrenceCount: 1
  };

  it('membuat satu occurrence dan menghapusnya lagi saat completion di-undo', () => {
    const task = baseTask(recurrence);
    const completed = toggleTaskWithLifecycle([task], task.id, new Date('2026-07-20T03:00:00.000Z'));
    expect(completed).toHaveLength(2);
    expect(completed[0].previousOccurrenceId).toBe(task.id);
    expect(completed[0].subtasks[0].done).toBe(false);

    const completedTask = completed.find((item) => item.id === task.id)!;
    const { id: _id, createdAt: _createdAt, ...updates } = completedTask;
    const reopened = updateTaskWithLifecycle(completed, task.id, {
      ...updates,
      status: 'todo',
      completedAt: undefined
    });
    expect(reopened).toHaveLength(1);
    expect(reopened[0].status).toBe('todo');
  });

  it('memproses status selesai dari modal melalui lifecycle yang sama', () => {
    const task = baseTask(recurrence);
    const { id: _id, createdAt: _createdAt, ...updates } = task;
    const result = updateTaskWithLifecycle([task], task.id, {
      ...updates,
      status: 'done',
      completedAt: '2026-07-20T03:00:00.000Z'
    });
    expect(result.filter((item) => item.status === 'todo')).toHaveLength(1);
    expect(result.find((item) => item.id === task.id)?.status).toBe('done');
  });
});
