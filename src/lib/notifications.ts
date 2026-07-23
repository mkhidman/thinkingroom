import { format } from 'date-fns';
import type { AppData, Task } from '../types';

const SETTINGS_KEY = 'ruang-reminder-settings-v1';
const SENT_KEY = 'ruang-reminder-sent-v1';
const keyFor = (base: string, userId?: string) => userId ? `${base}:user:${userId}` : base;

export interface ReminderSettings {
  enabled: boolean;
  taskReminders: boolean;
  deadlineReminders: boolean;
  habitReminders: boolean;
  taskLeadMinutes: number;
  deadlineLeadMinutes: number;
}

export interface ReminderItem {
  id: string;
  title: string;
  body: string;
  at: string;
  kind: 'task' | 'deadline' | 'habit';
}

export const defaultReminderSettings: ReminderSettings = {
  enabled: false,
  taskReminders: true,
  deadlineReminders: true,
  habitReminders: true,
  taskLeadMinutes: 15,
  deadlineLeadMinutes: 60
};

export const loadReminderSettings = (userId?: string): ReminderSettings => {
  try {
    const raw = localStorage.getItem(keyFor(SETTINGS_KEY, userId));
    if (!raw) return defaultReminderSettings;
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    return {
      ...defaultReminderSettings,
      ...parsed,
      taskLeadMinutes: Math.max(0, Number(parsed.taskLeadMinutes ?? defaultReminderSettings.taskLeadMinutes)),
      deadlineLeadMinutes: Math.max(0, Number(parsed.deadlineLeadMinutes ?? defaultReminderSettings.deadlineLeadMinutes))
    };
  } catch {
    return defaultReminderSettings;
  }
};

export const saveReminderSettings = (settings: ReminderSettings, userId?: string) => {
  try { localStorage.setItem(keyFor(SETTINGS_KEY, userId), JSON.stringify(settings)); } catch { /* Tetap aktif di memory. */ }
  window.dispatchEvent(new CustomEvent('ruang:reminder-settings', { detail: settings }));
};

const atLead = (iso: string, minutes: number) => new Date(new Date(iso).getTime() - minutes * 60_000).toISOString();
const taskProjectName = (data: AppData, task: Task) => data.projects.find((project) => project.id === task.projectId)?.name;

export const collectReminderItems = (data: AppData, settings: ReminderSettings, now = new Date()): ReminderItem[] => {
  if (!settings.enabled) return [];
  const reminders: ReminderItem[] = [];

  data.tasks.filter((task) => task.status === 'todo').forEach((task) => {
    const project = taskProjectName(data, task);
    const context = project ? ` · ${project}` : '';
    const isBill = task.labels.some((label) => label.toLocaleLowerCase('id-ID') === 'tagihan');

    if (task.reminderAt) {
      reminders.push({
        id: `task-explicit:${task.id}:${task.reminderAt}`,
        title: isBill ? `Pengingat tagihan: ${task.title}` : `Pengingat tugas: ${task.title}`,
        body: `Reminder khusus${context}`,
        at: task.reminderAt,
        kind: 'task'
      });
    } else if (settings.taskReminders && task.dueAt) {
      reminders.push({
        id: `task-schedule:${task.id}:${task.dueAt}:${settings.taskLeadMinutes}`,
        title: isBill ? `Tagihan segera dijadwalkan: ${task.title}` : `Tugas segera dimulai: ${task.title}`,
        body: `${settings.taskLeadMinutes} menit sebelum jadwal${context}`,
        at: atLead(task.dueAt, settings.taskLeadMinutes),
        kind: 'task'
      });
    }

    if (settings.deadlineReminders && task.deadlineAt) {
      reminders.push({
        id: `task-deadline:${task.id}:${task.deadlineAt}:${settings.deadlineLeadMinutes}`,
        title: `Deadline mendekat: ${task.title}`,
        body: `${settings.deadlineLeadMinutes} menit sebelum deadline${context}`,
        at: atLead(task.deadlineAt, settings.deadlineLeadMinutes),
        kind: 'deadline'
      });
    }
  });

  if (settings.habitReminders) {
    const dayKey = format(now, 'yyyy-MM-dd');
    data.habits.filter((habit) => !habit.paused && habit.reminderTime && habit.daysOfWeek.includes(now.getDay())).forEach((habit) => {
      const progress = habit.logs[dayKey] ?? 0;
      if (progress >= habit.targetValue) return;
      const at = new Date(`${dayKey}T${habit.reminderTime}:00`).toISOString();
      reminders.push({
        id: `habit:${habit.id}:${dayKey}:${habit.reminderTime}`,
        title: `Habit hari ini: ${habit.name}`,
        body: `${progress}/${habit.targetValue} ${habit.unit}`,
        at,
        kind: 'habit'
      });
    });
  }

  return reminders.sort((a, b) => a.at.localeCompare(b.at));
};

const loadSent = (userId?: string): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(keyFor(SENT_KEY, userId)) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
};

const saveSent = (sent: Record<string, string>, userId?: string) => {
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const cleaned = Object.fromEntries(Object.entries(sent).filter(([, value]) => new Date(value).getTime() >= cutoff));
  try { localStorage.setItem(keyFor(SENT_KEY, userId), JSON.stringify(cleaned)); } catch { /* Dedupe hanya optimasi. */ }
};

export const getDueUnsentReminders = (
  data: AppData,
  settings: ReminderSettings,
  now = new Date(),
  graceMinutes = 24 * 60,
  userId?: string
): ReminderItem[] => {
  const sent = loadSent(userId);
  const nowMs = now.getTime();
  const lowerBound = nowMs - graceMinutes * 60_000;
  return collectReminderItems(data, settings, now).filter((item) => {
    if (sent[item.id]) return false;
    const at = new Date(item.at).getTime();
    return at <= nowMs && at >= lowerBound;
  });
};

export const markReminderSent = (id: string, userId?: string) => {
  const sent = loadSent(userId);
  sent[id] = new Date().toISOString();
  saveSent(sent, userId);
};

export const showSystemNotification = async (item: ReminderItem) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const options: NotificationOptions = {
    body: item.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: item.id,
    data: { url: '/' }
  };

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(item.title, options);
      return true;
    } catch {
      // Fallback ke Notification API biasa.
    }
  }
  new Notification(item.title, options);
  return true;
};
