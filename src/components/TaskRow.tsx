import { CalendarClock, Check, Clock3, Pencil, Repeat2, Trash2 } from 'lucide-react';
import { formatDate } from '../lib/format';
import type { Project, Task } from '../types';

interface TaskRowProps {
  task: Task;
  project?: Project;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export const TaskRow = ({ task, project, onToggle, onEdit, onDelete, compact }: TaskRowProps) => {
  const overdue = task.status !== 'done' && Boolean(task.deadlineAt && new Date(task.deadlineAt).getTime() < Date.now());
  const deadlineToday = task.status !== 'done' && Boolean(task.deadlineAt && new Date(task.deadlineAt).toDateString() === new Date().toDateString());

  return (
    <div className={`task-row ${compact ? 'compact-row' : ''} ${overdue ? 'task-overdue' : ''}`}>
      <button className={`task-check ${task.status === 'done' ? 'done' : ''}`} onClick={onToggle} aria-label="Tandai selesai">
        {task.status === 'done' && <Check size={14} />}
      </button>
      <div className="task-copy">
        <strong className={task.status === 'done' ? 'struck' : ''}>{task.title}</strong>
        <div className="item-meta">
          {project && <span className="project-pill"><i style={{ background: project.color }} />{project.name}</span>}
          {task.dueAt && <span title="Jadwal pengerjaan"><Clock3 size={12} /> Jadwal {formatDate(task.dueAt, 'd MMM · HH.mm')}</span>}
          {task.deadlineAt && (
            <span className={overdue ? 'deadline-overdue' : deadlineToday ? 'deadline-today' : ''} title="Deadline">
              <CalendarClock size={12} /> {overdue ? 'Terlambat' : 'Deadline'} {formatDate(task.deadlineAt, 'd MMM · HH.mm')}
            </span>
          )}
          {task.estimateMinutes && <span>{task.estimateMinutes} menit</span>}
          {task.recurrence && <span><Repeat2 size={12} /> setiap {task.recurrence.interval} {task.recurrence.frequency === 'daily' ? 'hari' : task.recurrence.frequency === 'weekly' ? 'minggu' : 'bulan'}</span>}
        </div>
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
