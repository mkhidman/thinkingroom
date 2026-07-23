import { CalendarCheck2, CalendarClock, Check, Clock3, Pencil, Repeat2, Trash2 } from 'lucide-react';
import { formatDate } from '../lib/format';
import type { Project, Task } from '../types';
import { isTaskDeadlineOverdue, isTaskScheduleDeferred } from '../lib/taskTracking';

interface TaskRowProps {
  task: Task;
  project?: Project;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onScheduleToday?: () => void;
  compact?: boolean;
}

export const TaskRow = ({ task, project, onToggle, onEdit, onDelete, onScheduleToday, compact }: TaskRowProps) => {
  const overdue = isTaskDeadlineOverdue(task);
  const deadlineToday = task.status !== 'done' && Boolean(task.deadlineAt && new Date(task.deadlineAt).toDateString() === new Date().toDateString());
  const scheduleDeferred = isTaskScheduleDeferred(task);

  return (
    <div className={`task-row ${compact ? 'compact-row' : ''} ${overdue ? 'task-overdue' : ''} ${scheduleDeferred ? 'task-deferred' : ''}`}>
      <button
        className={`task-check ${task.status === 'done' ? 'done' : ''}`}
        onClick={onToggle}
        aria-label={task.status === 'done' ? 'Buka kembali tugas' : 'Tandai tugas selesai'}
      >
        {task.status === 'done' && <Check size={14} />}
      </button>
      <div className="task-copy">
        <strong className={task.status === 'done' ? 'struck' : ''}>{task.title}</strong>
        <div className="item-meta">
          {project && <span className="project-pill"><i style={{ background: project.color }} />{project.name}</span>}
          {task.dueAt && <span className={scheduleDeferred ? 'schedule-deferred' : ''} title="Jadwal pengerjaan"><Clock3 size={12} /> {scheduleDeferred ? 'Jadwal terlewat' : 'Jadwal'} {formatDate(task.dueAt, 'd MMM · HH.mm')}</span>}
          {task.deadlineAt && (
            <span className={overdue ? 'deadline-overdue' : deadlineToday ? 'deadline-today' : ''} title="Deadline">
              <CalendarClock size={12} /> {overdue ? 'Terlambat' : 'Deadline'} {formatDate(task.deadlineAt, 'd MMM · HH.mm')}
            </span>
          )}
          {task.estimateMinutes && <span>{task.estimateMinutes} menit</span>}
          {task.subtasks.length > 0 && <span>{task.subtasks.filter((subtask) => subtask.done).length}/{task.subtasks.length} subtask</span>}
          {task.recurrence && <span><Repeat2 size={12} /> setiap {task.recurrence.interval} {task.recurrence.frequency === 'daily' ? 'hari' : task.recurrence.frequency === 'weekly' ? 'minggu' : 'bulan'}</span>}
        </div>
        {onScheduleToday && task.status === 'todo' && (
          <div className="task-quick-actions">
            <button type="button" onClick={onScheduleToday}><CalendarCheck2 size={13} /> Jadwalkan hari ini</button>
            {onEdit && <button type="button" onClick={onEdit}><Pencil size={13} /> Pilih tanggal baru</button>}
          </div>
        )}
      </div>
      <span className={`priority priority-${task.priority}`}>P{task.priority}</span>
      {(onEdit || onDelete) && (
        <div className="row-actions">
          {onEdit && <button className="row-action-button" onClick={onEdit} aria-label="Edit tugas" title="Edit"><Pencil size={14} /></button>}
          {onDelete && <button className="row-action-button danger" onClick={onDelete} aria-label="Hapus tugas" title="Hapus"><Trash2 size={14} /></button>}
        </div>
      )}
    </div>
  );
};
