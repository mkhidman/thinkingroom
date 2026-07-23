import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { isTaskDeadlineOverdue, taskNeedsAttentionToday } from './taskTracking';

const waitingTask: Task = {
  id: 'waiting',
  title: 'Menunggu balasan',
  status: 'waiting',
  priority: 2,
  deadlineAt: '2026-07-22T10:00:00.000Z',
  labels: [],
  subtasks: [],
  createdAt: '2026-07-20T00:00:00.000Z'
};

describe('task tracking', () => {
  it('tetap menandai waiting task yang melewati deadline', () => {
    const now = new Date('2026-07-23T10:00:00.000Z');
    expect(isTaskDeadlineOverdue(waitingTask, now)).toBe(true);
    expect(taskNeedsAttentionToday(waitingTask, now)).toBe(true);
  });
});
