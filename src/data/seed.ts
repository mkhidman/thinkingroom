import { addDays, format, setHours, setMinutes, startOfDay, subDays } from 'date-fns';
import type { AppData } from '../types';

const isoAt = (date: Date, hour: number, minute = 0) =>
  setMinutes(setHours(startOfDay(date), hour), minute).toISOString();

export const createSeedData = (): AppData => {
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const monthKey = format(today, 'yyyy-MM');
  const schoolBillDate = new Date(today.getFullYear(), today.getMonth(), 25, 9, 0, 0, 0);
  if (schoolBillDate < today) schoolBillDate.setMonth(schoolBillDate.getMonth() + 1);

  return {
    projects: [
      { id: 'project-personal', name: 'Pribadi', color: '#005BAC', status: 'active', note: 'Rutinitas dan pengembangan diri.' },
      { id: 'project-pride', name: 'Pride Chicken', color: '#E59B2F', status: 'active', note: 'Operasional dan evaluasi usaha.' },
      { id: 'project-sase', name: 'SASE Portal', color: '#6C63D9', status: 'active', note: 'Sistem absensi dan sensus jamaah.' },
      { id: 'project-kayyisu', name: 'Al-Kayyisu Daily', color: '#2E8A72', status: 'active', note: 'Konten reflektif dan pengembangan brand.' }
    ],
    tasks: [
      {
        id: 'task-pride-report',
        title: 'Periksa laporan harian Pride Chicken',
        description: 'Cek penjualan, stok ayam, nasi sisa, dan mutasi kas/bank.',
        projectId: 'project-pride',
        status: 'todo',
        priority: 1,
        dueAt: isoAt(today, 8),
        estimateMinutes: 20,
        labels: ['operasional'],
        subtasks: [],
        recurrence: {
          frequency: 'daily', interval: 1, mode: 'fixed_schedule', anchorDate: todayKey, occurrenceCount: 1
        },
        createdAt: subDays(today, 8).toISOString()
      },
      {
        id: 'task-sase-mobile',
        title: 'Perbaiki mobile overflow dashboard SASE',
        projectId: 'project-sase',
        status: 'todo',
        priority: 1,
        dueAt: isoAt(today, 10, 30),
        estimateMinutes: 45,
        labels: ['development'],
        subtasks: [
          { id: 'sub-1', title: 'Audit container yang melebar', done: true },
          { id: 'sub-2', title: 'Uji pada lebar 360px', done: false }
        ],
        createdAt: subDays(today, 2).toISOString()
      },
      {
        id: 'task-content',
        title: 'Finalisasi ide konten kedua Al-Kayyisu',
        projectId: 'project-kayyisu',
        status: 'todo',
        priority: 2,
        dueAt: isoAt(today, 16),
        estimateMinutes: 60,
        labels: ['konten'],
        subtasks: [],
        createdAt: subDays(today, 1).toISOString()
      },
      {
        id: 'task-weekly-review',
        title: 'Review mingguan pribadi',
        projectId: 'project-personal',
        status: 'todo',
        priority: 3,
        dueAt: isoAt(addDays(today, 3), 20),
        estimateMinutes: 25,
        labels: ['review'],
        subtasks: [],
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          mode: 'fixed_schedule',
          daysOfWeek: [5],
          anchorDate: todayKey,
          occurrenceCount: 1
        },
        createdAt: subDays(today, 15).toISOString()
      },
      {
        id: 'task-school-bill',
        title: 'Bayar uang sekolah',
        projectId: 'project-personal',
        status: 'todo',
        priority: 1,
        dueAt: schoolBillDate.toISOString(),
        estimateMinutes: 10,
        labels: ['tagihan', 'keuangan'],
        subtasks: [],
        recurrence: {
          frequency: 'monthly', interval: 1, mode: 'fixed_schedule', dayOfMonth: 25,
          monthlyOverflow: 'last_day', anchorDate: todayKey, occurrenceCount: 1
        },
        createdAt: subDays(today, 30).toISOString()
      },
      {
        id: 'task-waiting-sensus',
        title: 'Konfirmasi data sensus dari pengurus',
        projectId: 'project-sase',
        status: 'waiting',
        priority: 2,
        labels: ['menunggu'],
        subtasks: [],
        createdAt: subDays(today, 2).toISOString()
      }
    ],
    habits: [
      {
        id: 'habit-water', name: 'Minum 2L air', metric: 'count', targetValue: 8, unit: 'gelas', targetPerWeek: 7,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], reminderTime: '09:00', logs: { [todayKey]: 5 }
      },
      {
        id: 'habit-read', name: 'Baca 10 menit', metric: 'duration', targetValue: 10, unit: 'menit', targetPerWeek: 5,
        daysOfWeek: [1, 2, 3, 4, 5], reminderTime: '20:30', logs: { [format(subDays(today, 1), 'yyyy-MM-dd')]: 10 }
      },
      {
        id: 'habit-walk', name: 'Jalan kaki', metric: 'duration', targetValue: 20, unit: 'menit', targetPerWeek: 3,
        daysOfWeek: [1, 3, 6], reminderTime: '06:30', logs: {}
      },
      {
        id: 'habit-night-review', name: 'Review malam', metric: 'boolean', targetValue: 1, unit: 'selesai', targetPerWeek: 5,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], reminderTime: '21:00', logs: {}
      }
    ],
    prayers: [
      { date: todayKey, prayer: 'Subuh', status: 'tepat-waktu' },
      { date: todayKey, prayer: 'Dzuhur', status: 'berjamaah' },
      { date: todayKey, prayer: 'Ashar', status: 'belum' },
      { date: todayKey, prayer: 'Maghrib', status: 'belum' },
      { date: todayKey, prayer: 'Isya', status: 'belum' }
    ],
    notes: [
      {
        id: 'note-sensus',
        title: 'Ringkasan sensus per gender',
        content: 'Tampilkan jumlah laki-laki dan perempuan untuk setiap kategori sensus secara periodik.',
        type: 'note', projectId: 'project-sase', tags: ['fitur'],
        createdAt: subDays(today, 1).toISOString(), updatedAt: subDays(today, 1).toISOString()
      },
      {
        id: 'decision-role',
        title: 'Role pegawai ditunda',
        content: 'Selama dua bulan awal aplikasi Pride Chicken dikelola sendiri; laporan pegawai diterima secara manual.',
        type: 'decision', projectId: 'project-pride', tags: ['scope', 'MVP'],
        createdAt: subDays(today, 6).toISOString(), updatedAt: subDays(today, 6).toISOString()
      },
      {
        id: 'idea-carousel',
        title: 'Ide carousel: hidup sibuk tanpa arah',
        content: 'Pendekatan reflektif, lembut, dan tidak terasa menggurui.',
        type: 'idea', projectId: 'project-kayyisu', tags: ['konten'],
        createdAt: today.toISOString(), updatedAt: today.toISOString()
      }
    ],
    accounts: [
      { id: 'account-cash', name: 'Tunai', type: 'cash', openingBalance: 850000, color: '#E59B2F' },
      { id: 'account-bca', name: 'BCA', type: 'bank', openingBalance: 4250000, color: '#005BAC' },
      { id: 'account-ewallet', name: 'E-Wallet', type: 'ewallet', openingBalance: 375000, color: '#6C63D9' }
    ],
    transactions: [
      {
        id: 'trx-1', type: 'income', amount: 5200000, accountId: 'account-bca', category: 'Pendapatan',
        note: 'Pendapatan bulan ini', date: `${monthKey}-02`, createdAt: `${monthKey}-02T08:00:00.000Z`
      },
      {
        id: 'trx-2', type: 'expense', amount: 850000, accountId: 'account-bca', category: 'Rumah Tangga',
        note: 'Belanja bulanan', date: `${monthKey}-04`, createdAt: `${monthKey}-04T11:00:00.000Z`
      },
      {
        id: 'trx-3', type: 'expense', amount: 350000, accountId: 'account-cash', category: 'Pendidikan',
        note: 'Keperluan sekolah anak', date: `${monthKey}-08`, createdAt: `${monthKey}-08T10:00:00.000Z`
      },
      {
        id: 'trx-4', type: 'expense', amount: 185000, accountId: 'account-ewallet', category: 'Transportasi',
        note: 'Transportasi dan parkir', date: todayKey, createdAt: today.toISOString()
      },
      {
        id: 'trx-5', type: 'transfer', amount: 300000, accountId: 'account-bca', toAccountId: 'account-cash', category: 'Transfer',
        note: 'Isi uang tunai', date: todayKey, createdAt: today.toISOString()
      }
    ],
    budgets: [
      { id: 'budget-house', category: 'Rumah Tangga', limit: 1800000, month: monthKey },
      { id: 'budget-food', category: 'Makan', limit: 1200000, month: monthKey },
      { id: 'budget-transport', category: 'Transportasi', limit: 600000, month: monthKey },
      { id: 'budget-education', category: 'Pendidikan', limit: 900000, month: monthKey }
    ],
    reviews: []
  };
};

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
