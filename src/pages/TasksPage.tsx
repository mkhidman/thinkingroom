import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, CalendarClock, FolderKanban, Plus, Repeat2, Settings2, TimerReset } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { TaskRow } from '../components/TaskRow';
import { TaskModal } from '../components/TaskModal';
import { ProjectManagerModal } from '../components/ProjectManagerModal';
import type { Task, TaskStatus } from '../types';
import {
  compareTasksByAttention,
  isTaskDeadlineOverdue,
  isTaskScheduleDeferred,
  isTaskUnscheduled,
  isTaskUpcoming,
  taskNeedsAttentionToday
} from '../lib/taskTracking';
import { consumePendingFocus } from '../lib/navigation';

type TaskFilter = 'today' | 'deferred' | 'upcoming' | 'unscheduled' | 'overdue' | TaskStatus;

const filters: Array<{ id: TaskFilter; label: string }> = [
  { id: 'today', label: 'Hari ini' },
  { id: 'deferred', label: 'Tertunda' },
  { id: 'upcoming', label: 'Berikutnya' },
  { id: 'unscheduled', label: 'Tanpa jadwal' },
  { id: 'overdue', label: 'Terlambat' },
  { id: 'waiting', label: 'Menunggu' },
  { id: 'done', label: 'Selesai' }
];

export const TasksPage = () => {
  const { data, toggleTask, updateTask, deleteTask } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('today');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const now = new Date();

  useEffect(() => {
    const focusId = consumePendingFocus('tasks');
    if (!focusId) return;
    const task = data.tasks.find((item) => item.id === focusId);
    if (task) {
      setEditingTask(task);
      setTaskModalOpen(true);
    }
  }, [data.tasks]);

  const filteredTasks = useMemo(() => {
    return data.tasks
      .filter((task) => {
        if (activeFilter === 'done') return task.status === 'done';
        if (activeFilter === 'waiting') return task.status === 'waiting';
        if (activeFilter === 'overdue') return isTaskDeadlineOverdue(task, now);
        if (activeFilter === 'deferred') return isTaskScheduleDeferred(task, now);
        if (activeFilter === 'unscheduled') return isTaskUnscheduled(task);
        if (activeFilter === 'today') return taskNeedsAttentionToday(task, now);
        return isTaskUpcoming(task, now);
      })
      .sort((a, b) => compareTasksByAttention(a, b, now));
  }, [data.tasks, activeFilter, now]);

  const projectStats = data.projects.map((project) => {
    const tasks = data.tasks.filter((task) => task.projectId === project.id && task.status !== 'done');
    return { project, total: tasks.length, waiting: tasks.filter((task) => task.status === 'waiting').length };
  });

  const recurringCount = data.tasks.filter((task) => task.status === 'todo' && task.recurrence).length;
  const waitingCount = data.tasks.filter((task) => task.status === 'waiting').length;
  const overdueCount = data.tasks.filter((task) => isTaskDeadlineOverdue(task, now)).length;
  const deferredCount = data.tasks.filter((task) => isTaskScheduleDeferred(task, now)).length;
  const unscheduledCount = data.tasks.filter((task) => isTaskUnscheduled(task)).length;

  const createTask = () => {
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const scheduleTaskToday = (task: Task) => {
    const { id: _id, createdAt: _createdAt, ...updates } = task;
    const next = new Date();
    next.setSeconds(0, 0);
    updateTask(task.id, {
      ...updates,
      dueAt: next.toISOString(),
      reminderAt: task.reminderAt && new Date(task.reminderAt).getTime() > next.getTime() ? task.reminderAt : undefined
    });
  };

  const removeTask = (task: Task) => {
    if (!window.confirm(`Hapus tugas “${task.title}”? Riwayat tugas ini tidak dapat dipulihkan kecuali melalui backup.`)) return;
    deleteTask(task.id);
  };

  return (
    <div className="page-stack">
      <section className="section-toolbar">
        <div className="filter-tabs">
          {filters.map((filter) => (
            <button key={filter.id} className={activeFilter === filter.id ? 'active' : ''} onClick={() => setActiveFilter(filter.id)}>
              {filter.label}
              {filter.id === 'deferred' && deferredCount > 0 ? ` (${deferredCount})` : ''}
              {filter.id === 'unscheduled' && unscheduledCount > 0 ? ` (${unscheduledCount})` : ''}
              {filter.id === 'overdue' && overdueCount > 0 ? ` (${overdueCount})` : ''}
            </button>
          ))}
        </div>
        <button className="primary-button" onClick={createTask}><Plus size={17} /> Tugas baru</button>
      </section>

      <section className="metric-grid four-metrics">
        <article className="metric-card"><div className="metric-icon"><FolderKanban size={20} /></div><span>Proyek aktif</span><strong>{data.projects.filter((project) => project.status === 'active').length}</strong><p>Semua konteks kerja tetap terhubung.</p></article>
        <article className="metric-card"><div className="metric-icon"><Repeat2 size={20} /></div><span>Tugas berulang</span><strong>{recurringCount}</strong><p>Jadwal dan deadline ikut bergerak.</p></article>
        <article className="metric-card"><div className="metric-icon"><TimerReset size={20} /></div><span>Sedang menunggu</span><strong>{waitingCount}</strong><p>Tidak mencemari daftar tindakan harian.</p></article>
        <article className={`metric-card ${overdueCount ? 'metric-alert' : ''}`}><div className="metric-icon"><AlertTriangle size={20} /></div><span>Melewati deadline</span><strong>{overdueCount}</strong><p>Ditentukan dari deadline, bukan tanggal jadwal.</p></article>
      </section>

      <div className="content-split task-page-split">
        <section className="panel">
          <div className="panel-header">
            <div><h3>{filters.find((filter) => filter.id === activeFilter)?.label}</h3><p>{filteredTasks.length} item ditemukan{activeFilter === 'today' ? ' · termasuk jadwal dan deadline yang terlewat' : ''}</p></div>
            <span className="subtle-badge">Urut deadline & prioritas</span>
          </div>
          <div className="list-stack">
            {filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                project={data.projects.find((project) => project.id === task.projectId)}
                onToggle={() => toggleTask(task.id)}
                onEdit={() => editTask(task)}
                onDelete={() => removeTask(task)}
                onScheduleToday={isTaskScheduleDeferred(task, now) || isTaskUnscheduled(task) ? () => scheduleTaskToday(task) : undefined}
              />
            ))}
            {filteredTasks.length === 0 && <div className="empty-state"><Archive size={28} /><strong>Tidak ada item</strong><p>Filter ini sedang kosong.</p></div>}
          </div>
        </section>

        <aside className="right-stack">
          <section className="panel">
            <div className="panel-header"><div><h3>Proyek</h3><p>Tugas dan catatan hidup di dalam konteks yang sama.</p></div><button type="button" className="secondary-button compact-button" onClick={() => setProjectManagerOpen(true)}><Settings2 size={14} /> Kelola</button></div>
            <div className="project-list">
              {projectStats.map(({ project, total, waiting }) => (
                <article className="project-row" key={project.id}>
                  <i style={{ background: project.color }} />
                  <div><strong>{project.name}</strong><span>{total} tugas aktif{waiting ? ` · ${waiting} menunggu` : ''}</span></div>
                  <span>{total}</span>
                </article>
              ))}
              {projectStats.length === 0 && <div className="empty-state compact"><FolderKanban size={25} /><strong>Belum ada proyek</strong><p>Gunakan tombol Kelola untuk membuat proyek pertama.</p></div>}
            </div>
          </section>

          <section className="panel recurrence-explainer">
            <div className="panel-header"><div><h3>Jadwal vs deadline</h3><p>Dua tanggal memiliki fungsi yang berbeda.</p></div><CalendarClock size={18} /></div>
            <ul className="plain-list">
              <li><strong>Jadwal pengerjaan:</strong> kapan kamu berencana mulai atau mengerjakan tugas.</li>
              <li><strong>Deadline:</strong> batas terakhir tugas harus selesai.</li>
              <li><strong>Tertunda:</strong> jadwal pengerjaan sudah lewat, tetapi deadline belum terlewati.</li>
              <li><strong>Terlambat:</strong> hanya ditandai ketika deadline terlewati.</li>
              <li><strong>Recurring:</strong> jarak relatif antara jadwal dan deadline dipertahankan.</li>
            </ul>
          </section>
        </aside>
      </div>

      <TaskModal open={taskModalOpen} task={editingTask} onClose={() => { setTaskModalOpen(false); setEditingTask(null); }} />
      <ProjectManagerModal open={projectManagerOpen} onClose={() => setProjectManagerOpen(false)} />
    </div>
  );
};
