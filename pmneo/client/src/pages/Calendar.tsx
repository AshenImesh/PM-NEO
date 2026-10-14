import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useProject } from '@context/ProjectContext';
import { classNames, formatDate, getPriorityColor, isOverdue, isTaskDone } from '@utils/helpers';
import { Button } from '@components/ui/Button';
import { EmptyState } from '@components/ui/Badge';
import { Modal } from '@components/ui/Modal';

export function CalendarPage() {
  const { projects, allTasks, columnsByProject, openCreateTask, openEditTask, openCreateProject } = useProject();
  const [cursor, setCursor] = useState(new Date());
  const [filter, setFilter] = useState<string>('all');
  const [day, setDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  const scheduled = useMemo(
    () =>
      allTasks.filter(t => {
        if (!t.dueDate) return false;
        if (filter !== 'all' && t.projectId !== filter) return false;
        if (isTaskDone(t, columnsByProject[t.projectId] ?? [])) return false;
        return true;
      }),
    [allTasks, columnsByProject, filter]
  );

  const forDay = (d: Date) => scheduled.filter(t => isSameDay(parseISO(t.dueDate!), d)).sort((a, b) => +new Date(a.dueDate!) - +new Date(b.dueDate!));
  const dayTasks = day ? forDay(day) : [];
  const projectById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  if (projects.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Schedule</h1>
        <p className="page-subtitle">Every due date across every project.</p>
        <div className="surface-soft mt-2">
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="No projects yet"
            hint="Create a project and add tasks with due dates to fill this calendar."
            action={
              <Button onClick={openCreateProject}>
                <Plus className="h-4 w-4" /> Create project
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page !max-w-none">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="page-subtitle">{scheduled.length} upcoming due date{scheduled.length === 1 ? '' : 's'}</p>
        </div>
        <span className="flex-1" />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="input !w-auto"
          aria-label="Filter by project"
        >
          <option value="all">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>
          Today
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setCursor(c => subMonths(c, 1))} className="px-2" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold min-w-[140px] text-center text-dark-800 dark:text-dark-100">
          {format(cursor, 'MMMM yyyy')}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setCursor(c => addMonths(c, 1))} className="px-2" aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="surface overflow-hidden">
        <div className="grid grid-cols-7 hairline-b bg-dark-50/60 dark:bg-dark-900">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-dark-400 dark:text-dark-500">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map(d => {
            const list = forDay(d);
            const today = isSameDay(d, new Date());
            const outside = !isSameMonth(d, cursor);
            return (
              <button
                key={d.toISOString()}
                onClick={() => setDay(d)}
                className={classNames(
                  'min-h-[104px] border-b border-r border-dark-100 dark:border-dark-800/70 p-1.5 text-left align-top transition-colors hover:bg-dark-50 dark:hover:bg-dark-800/50 [&:nth-child(7n)]:border-r-0',
                  outside && 'bg-dark-50/50 dark:bg-dark-900/40',
                  today && 'bg-primary-50/60 dark:bg-primary-950/20'
                )}
              >
                <span
                  className={classNames(
                    'inline-flex w-7 h-7 items-center justify-center rounded-full text-[13px] font-semibold',
                    today
                      ? 'bg-primary-600 text-white'
                      : outside
                        ? 'text-dark-300 dark:text-dark-600'
                        : 'text-dark-700 dark:text-dark-200'
                  )}
                >
                  {format(d, 'd')}
                </span>
                <span className="mt-1 space-y-1 block">
                  {list.slice(0, 3).map(t => {
                    const p = projectById.get(t.projectId);
                    return (
                      <span
                        key={t.id}
                        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white truncate"
                        style={{ backgroundColor: p?.color ?? getPriorityColor(t.priority) }}
                        title={`${t.title}${p ? ` · ${p.name}` : ''}`}
                      >
                        <span className="truncate">{t.title}</span>
                      </span>
                    );
                  })}
                  {list.length > 3 && (
                    <span className="block text-[11px] text-dark-400 dark:text-dark-500 px-1">+{list.length - 3} more</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={day !== null}
        onClose={() => setDay(null)}
        title={day ? format(day, 'EEEE, MMMM d') : ''}
        description={dayTasks.length ? `${dayTasks.length} due` : 'Nothing due — add one.'}
        size="md"
      >
        {day && (
          <div className="space-y-2">
            {dayTasks.map(t => {
              const p = projectById.get(t.projectId);
              const late = isOverdue(t.dueDate);
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setDay(null);
                    openEditTask(t.id, t.projectId);
                  }}
                  className="w-full text-left rounded-xl border border-dark-200 dark:border-dark-700 px-3.5 py-3 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getPriorityColor(t.priority) }} />
                    <span className="flex-1 min-w-0 truncate text-sm font-medium text-dark-900 dark:text-dark-100">{t.title}</span>
                    {late && <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">overdue</span>}
                  </span>
                  <span className="mt-0.5 block text-xs text-dark-500 dark:text-dark-400">
                    {p?.name}
                    {t.assignee ? ` · ${t.assignee}` : ''} · due {formatDate(t.dueDate, 'MMM d')}
                  </span>
                </button>
              );
            })}
            {dayTasks.length === 0 && (
              <p className="text-sm text-dark-500 dark:text-dark-400">No tasks due on this day.</p>
            )}
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => {
                  const seed = day ? format(day, 'yyyy-MM-dd') : undefined;
                  const pid = filter !== 'all' ? filter : projects[0]?.id;
                  setDay(null);
                  openCreateTask({ projectId: pid, dueSeed: seed });
                }}
              >
                <Plus className="h-4 w-4" /> Add task for this day
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
