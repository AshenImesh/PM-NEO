import { CalendarDays, Clock3, User } from 'lucide-react';
import type { Task } from '@types';
import { classNames, formatDate, getPriorityColor, getPriorityLabel, isOverdue } from '@utils/helpers';
import { Badge } from '@components/ui/Badge';

export function TaskCard({
  task,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  task: Task;
  dragging: boolean;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  const color = getPriorityColor(task.priority);
  const late = isOverdue(task.dueDate);

  return (
    <div
      draggable
      data-task-id={task.id}
      onDragStart={e => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter') onOpen();
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open task ${task.title}`}
      className={classNames(
        'group cursor-grab active:cursor-grabbing rounded-xl border border-dark-200 bg-white p-3.5 shadow-card transition-all hover:shadow-soft hover:-translate-y-px',
        'dark:bg-dark-800 dark:border-dark-700',
        dragging && 'opacity-50 ring-2 ring-primary-500'
      )}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <p className="text-sm font-medium leading-snug text-dark-900 dark:text-dark-50">{task.title}</p>
      {task.description && (
        <p className="mt-1 text-[13px] leading-snug text-dark-500 dark:text-dark-400 line-clamp-2">{task.description}</p>
      )}

      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="rounded-md bg-dark-100 px-1.5 py-0.5 text-[11px] font-medium text-dark-600 dark:bg-dark-800 dark:text-dark-300"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="rounded-md bg-dark-100 px-1.5 py-0.5 text-[11px] text-dark-500 dark:bg-dark-800 dark:text-dark-400">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dark-500 dark:text-dark-400">
        <Badge variant="gray" dot dotColor={color}>
          {getPriorityLabel(task.priority)}
        </Badge>
        {task.dueDate && (
          <span className={classNames('inline-flex items-center gap-1', late && 'text-red-600 dark:text-red-400 font-medium')}>
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(task.dueDate, 'MMM d')}
          </span>
        )}
        {task.assignee && (
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {task.assignee}
          </span>
        )}
        {task.estimatedHours > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {task.estimatedHours}h
          </span>
        )}
      </div>
    </div>
  );
}
