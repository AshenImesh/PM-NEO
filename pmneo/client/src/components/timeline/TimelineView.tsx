import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, GanttChartSquare, Plus } from 'lucide-react';
import {
  addMonths,
  addWeeks,
  differenceInDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { useProject } from '@context/ProjectContext';
import type { TaskWithColumn } from '@types';
import { classNames, formatDate, getPriorityColor, isDueSoon, isOverdue } from '@utils/helpers';
import { Button } from '@components/ui/Button';
import { Badge, EmptyState, SegmentedControl } from '@components/ui/Badge';

type View = 'week' | 'month';

export function TimelineView() {
  const { currentProject, tasks, timelineTasks, openEditTask, openCreateTask } = useProject();
  const [view, setView] = useState<View>('week');
  const [cursor, setCursor] = useState(new Date());

  const { start, end, days } = useMemo(() => {
    if (view === 'week') {
      const s = startOfWeek(cursor, { weekStartsOn: 1 });
      const e = endOfWeek(cursor, { weekStartsOn: 1 });
      return { start: s, end: e, days: eachDayOfInterval({ start: s, end: e }) };
    }
    const s = startOfMonth(cursor);
    const e = endOfMonth(cursor);
    return { start: s, end: e, days: eachDayOfInterval({ start: s, end: e }) };
  }, [view, cursor]);

  const scheduled = useMemo(() => {
    const inRange = (t: TaskWithColumn) => {
      const s = t.startDate ? parseISO(t.startDate) : t.dueDate ? parseISO(t.dueDate) : null;
      const e = t.dueDate ? parseISO(t.dueDate) : s;
      if (!s || !e || !isValid(s) || !isValid(e)) return false;
      return e >= start && s <= end;
    };
    // timeline endpoint returns scheduled tasks; fall back to local tasks so fresh edits show instantly
    const local = tasks
      .filter(t => t.startDate || t.dueDate)
      .map(t => ({ ...t, columnName: '', columnColor: '#6B7280' }) as TaskWithColumn);
    const merged = new Map<string, TaskWithColumn>();
    local.forEach(t => merged.set(t.id, t));
    timelineTasks.forEach(t => merged.set(t.id, t));
    return [...merged.values()].filter(inRange).sort((a, b) => {
      const ad = a.startDate ?? a.dueDate ?? '';
      const bd = b.startDate ?? b.dueDate ?? '';
      return ad < bd ? -1 : ad > bd ? 1 : 0;
    });
  }, [tasks, timelineTasks, start, end]);

  const unscheduled = useMemo(
    () => tasks.filter(t => !t.startDate && !t.dueDate).sort((a, b) => a.order - b.order),
    [tasks]
  );

  if (!currentProject) return null;

  const go = (dir: -1 | 1) =>
    setCursor(c => (view === 'week' ? (dir === 1 ? addWeeks(c, 1) : subWeeks(c, 1)) : dir === 1 ? addMonths(c, 1) : subMonths(c, 1)));

  const bar = (t: TaskWithColumn) => {
    const total = Math.max(1, differenceInDays(end, start) + 1);
    const s = t.startDate ? parseISO(t.startDate) : parseISO(t.dueDate!);
    const e = t.dueDate ? parseISO(t.dueDate) : s;
    const from = Math.max(0, differenceInDays(s, start));
    const to = Math.min(total - 1, differenceInDays(e, start));
    const left = (from / total) * 100;
    const width = Math.max(((to - from + 1) / total) * 100, total > 20 ? 3 : 6);
    return { left: `${left}%`, width: `${width}%` };
  };

  const todayOffset = (() => {
    const now = new Date();
    if (now < start || now > end) return null;
    const total = Math.max(1, differenceInDays(end, start) + 1);
    return `${(differenceInDays(now, start) / total) * 100}%`;
  })();

  const label =
    view === 'week' ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}` : format(cursor, 'MMMM yyyy');

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SegmentedControl value={view} onChange={setView} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
        <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>
          Today
        </Button>
        <Button variant="ghost" size="sm" onClick={() => go(-1)} aria-label="Previous period" className="px-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-dark-800 dark:text-dark-100 min-w-[190px] text-center">{label}</span>
        <Button variant="ghost" size="sm" onClick={() => go(1)} aria-label="Next period" className="px-2">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="flex-1" />
        <span className="text-[13px] text-dark-500 dark:text-dark-400">{scheduled.length} scheduled</span>
        <Button size="sm" onClick={() => openCreateTask({ projectId: currentProject.id })}>
          <Plus className="h-4 w-4" /> Task
        </Button>
      </div>

      <div className="surface overflow-hidden flex-1 min-h-0 flex flex-col">
        {scheduled.length === 0 && unscheduled.length === 0 ? (
          <EmptyState
            icon={<GanttChartSquare className="h-6 w-6" />}
            title="Nothing on the timeline yet"
            hint="Give tasks a start or due date and they will appear here as bars."
            action={<Button onClick={() => openCreateTask({ projectId: currentProject.id })}><Plus className="h-4 w-4" /> Add task</Button>}
          />
        ) : (
          <div className="flex flex-1 min-h-0">
            {/* rows */}
            <div className="w-[240px] sm:w-[280px] shrink-0 border-r border-dark-200 dark:border-dark-800 flex flex-col min-h-0">
              <div className="px-4 py-2.5 hairline-b">
                <span className="section-title">Scheduled</span>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {scheduled.map(t => (
                  <button
                    key={t.id}
                    onClick={() => openEditTask(t.id, t.projectId)}
                    className="w-full text-left px-4 h-[52px] flex flex-col justify-center gap-0.5 hover:bg-dark-50 dark:hover:bg-dark-800/60 border-b border-dark-100 dark:border-dark-800/60"
                  >
                    <span className="truncate text-[13px] font-medium text-dark-900 dark:text-dark-100">{t.title}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-dark-500 dark:text-dark-400">
                      {t.dueDate && (
                        <span className={classNames(isOverdue(t.dueDate) && 'text-red-600 dark:text-red-400 font-medium', !isOverdue(t.dueDate) && isDueSoon(t.dueDate) && 'text-amber-600 dark:text-amber-400')}>
                          {formatDate(t.dueDate, 'MMM d')}
                        </span>
                      )}
                      <Badge variant="gray" dot dotColor={getPriorityColor(t.priority)}>{t.priority}</Badge>
                    </span>
                  </button>
                ))}
                {scheduled.length === 0 && (
                  <p className="px-4 py-6 text-[13px] text-dark-500 dark:text-dark-400">No tasks fall in this period.</p>
                )}
              </div>
            </div>

            {/* grid */}
            <div className="flex-1 overflow-auto min-h-0 relative">
              <div className="flex sticky top-0 z-10 bg-white dark:bg-dark-900 border-b border-dark-200 dark:border-dark-800 min-w-max">
                {days.map(d => (
                  <div
                    key={d.toISOString()}
                    className={classNames(
                      'flex flex-col items-center justify-center py-2 border-r border-dark-100 dark:border-dark-800 text-[11px] font-medium',
                      view === 'week' ? 'min-w-[120px] flex-1' : 'min-w-[44px] flex-1',
                      isSameDay(d, new Date()) && 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300'
                    )}
                  >
                    <span>{view === 'week' ? format(d, 'EEE d') : format(d, 'd')}</span>
                    {view === 'week' && <span className="text-[10px] opacity-70">{format(d, 'MMM')}</span>}
                  </div>
                ))}
              </div>
              <div className="relative min-w-max" style={{ height: Math.max(scheduled.length * 52, 120) }}>
                {/* day gridlines */}
                <div className="absolute inset-0 flex">
                  {days.map(d => (
                    <div
                      key={d.toISOString()}
                      className={classNames(
                        'border-r border-dark-100 dark:border-dark-800/70 h-full',
                        view === 'week' ? 'min-w-[120px] flex-1' : 'min-w-[44px] flex-1',
                        isSameDay(d, new Date()) && 'bg-primary-50/50 dark:bg-primary-950/20'
                      )}
                    />
                  ))}
                </div>
                {todayOffset && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: todayOffset }}>
                    <div className="w-2 h-2 rounded-full bg-red-500 -translate-x-[3px]" />
                  </div>
                )}
                {scheduled.map((t, i) => {
                  const pos = bar(t);
                  const late = t.dueDate ? isOverdue(t.dueDate) : false;
                  return (
                    <button
                      key={t.id}
                      onClick={() => openEditTask(t.id, t.projectId)}
                      className="absolute h-7 rounded-lg text-left px-2 flex items-center gap-1.5 shadow-sm hover:shadow-md hover:brightness-105 transition-all"
                      style={{ top: i * 52 + 12, left: pos.left, width: pos.width, backgroundColor: getPriorityColor(t.priority), opacity: late ? 0.85 : 1 }}
                      title={`${t.title}${t.dueDate ? ` — due ${formatDate(t.dueDate)}` : ''}`}
                    >
                      <span className="truncate text-[11px] font-semibold text-white">{t.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {unscheduled.length > 0 && (
        <div className="surface mt-4 px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] text-dark-500 dark:text-dark-400">
            <CalendarDays className="h-4 w-4" />
            <span>
              <strong className="font-semibold text-dark-800 dark:text-dark-100">{unscheduled.length} unscheduled</strong>
              {' '}— click one to add dates:
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unscheduled.slice(0, 12).map(t => (
              <button
                key={t.id}
                onClick={() => openEditTask(t.id, t.projectId)}
                className="rounded-full border border-dark-200 dark:border-dark-700 px-2.5 py-1 text-xs font-medium text-dark-600 hover:border-primary-400 hover:text-primary-700 dark:text-dark-300 dark:hover:text-primary-300 transition-colors max-w-[220px] truncate"
              >
                {t.title}
              </button>
            ))}
            {unscheduled.length > 12 && (
              <span className="text-xs text-dark-400 dark:text-dark-500 self-center">+{unscheduled.length - 12} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
