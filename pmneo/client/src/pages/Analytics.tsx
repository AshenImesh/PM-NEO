import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BarChart3, CheckCircle2, Inbox, ListTodo, Sparkles, Users } from 'lucide-react';
import { eachWeekOfInterval, endOfWeek, format, isWithinInterval, startOfWeek, subDays, subWeeks } from 'date-fns';
import { useProject } from '@context/ProjectContext';
import { Button } from '@components/ui/Button';
import { Avatar, Badge, EmptyState, SegmentedControl } from '@components/ui/Badge';
import {
  classNames,
  formatDate,
  formatRelativeTime,
  getPriorityColor,
  isDueSoon,
  isOverdue,
  isTaskDone,
  projectProgress,
} from '@utils/helpers';

type Range = '7' | '30' | '90' | 'all';

type Health = 'on-track' | 'at-risk' | 'off-track';

const HEALTH_META: Record<Health, { label: string; badge: 'success' | 'warning' | 'danger' }> = {
  'on-track': { label: 'On track', badge: 'success' },
  'at-risk': { label: 'At risk', badge: 'warning' },
  'off-track': { label: 'Off track', badge: 'danger' },
};

export function AnalyticsPage() {
  const { projects, allTasks, columnsByProject, people, openEditTask, openCreateProject } = useProject();
  const [range, setRange] = useState<Range>('30');

  const since = range === 'all' ? null : subDays(new Date(), Number(range));
  const inRange = useMemo(
    () => allTasks.filter(t => !since || new Date(t.createdAt) >= since),
    [allTasks, since]
  );

  const isDone = (t: (typeof allTasks)[number]) => isTaskDone(t, columnsByProject[t.projectId] ?? []);
  const doneCount = inRange.filter(isDone).length;
  const pct = inRange.length ? Math.round((doneCount / inRange.length) * 100) : 0;

  const overdue = useMemo(
    () =>
      allTasks
        .filter(t => !isDone(t) && isOverdue(t.dueDate))
        .sort((a, b) => +new Date(a.dueDate!) - +new Date(b.dueDate!)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTasks, columnsByProject]
  );
  const dueWeek = useMemo(
    () => allTasks.filter(t => !isDone(t) && t.dueDate && !isOverdue(t.dueDate) && isDueSoon(t.dueDate, 7)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTasks, columnsByProject]
  );

  // ---- per-project health (the core of this page) ----
  const projectRows = useMemo(
    () =>
      projects.map(p => {
        const cols = columnsByProject[p.id] ?? [];
        const list = allTasks.filter(t => t.projectId === p.id);
        const done = list.filter(t => isTaskDone(t, cols)).length;
        const open = list.length - done;
        const late = list.filter(t => !isTaskDone(t, cols) && isOverdue(t.dueDate)).length;
        const soon = list.filter(t => !isTaskDone(t, cols) && t.dueDate && !isOverdue(t.dueDate) && isDueSoon(t.dueDate, 7)).length;
        const owners = new Set(list.map(t => t.assignee.trim()).filter(Boolean)).size;
        const progress = projectProgress(list, cols);
        const health: Health = late > 0 ? 'off-track' : soon > 0 ? 'at-risk' : 'on-track';
        return { project: p, total: list.length, done, open, late, soon, owners, progress, health };
      }),
    [projects, allTasks, columnsByProject]
  );

  // ---- throughput: created vs finished per week, last 6 weeks ----
  const throughput = useMemo(() => {
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    const start = startOfWeek(subWeeks(new Date(), 5), { weekStartsOn: 1 });
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const inWeek = (d: string) => {
        const dt = new Date(d);
        return isWithinInterval(dt, { start: weekStart, end: weekEnd });
      };
      return {
        label: format(weekStart, 'MMM d'),
        created: allTasks.filter(t => inWeek(t.createdAt)).length,
        finished: allTasks.filter(t => isDone(t) && inWeek(t.updatedAt)).length,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks, columnsByProject]);
  const throughputMax = Math.max(1, ...throughput.flatMap(w => [w.created, w.finished]));

  // ---- workload by person (registered first, then unregistered names) ----
  const workload = useMemo(() => {
    const rows: Array<{ name: string; registered: boolean; open: number; done: number; overdue: number }> = [];
    const byName = new Map<string, { open: number; done: number; overdue: number }>();
    allTasks.forEach(t => {
      const name = t.assignee?.trim();
      if (!name) return;
      if (!byName.has(name)) byName.set(name, { open: 0, done: 0, overdue: 0 });
      const r = byName.get(name)!;
      if (isDone(t)) r.done++;
      else {
        r.open++;
        if (isOverdue(t.dueDate)) r.overdue++;
      }
    });
    const registered = new Set(people.map(p => p.name.toLowerCase()));
    [...byName.entries()]
      .sort((a, b) => b[1].open + b[1].done - (a[1].open + a[1].done))
      .forEach(([name, r]) => rows.push({ name, registered: registered.has(name.toLowerCase()), ...r }));
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks, columnsByProject, people]);

  const priorityMix = useMemo(() => {
    const order = ['urgent', 'high', 'medium', 'low'] as const;
    const max = Math.max(1, ...order.map(pr => inRange.filter(t => t.priority === pr).length));
    return order.map(pr => ({ pr, count: inRange.filter(t => t.priority === pr).length, max }));
  }, [inRange]);

  const recent = useMemo(
    () => [...allTasks].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 8),
    [allTasks]
  );
  const projectById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  const insight = useMemo(() => {
    if (allTasks.length === 0) return null;
    const bits: string[] = [];
    if (overdue.length > 0) bits.push(`${overdue.length} overdue`);
    else bits.push('nothing overdue');
    if (dueWeek > 0) bits.push(`${dueWeek} due this week`);
    bits.push(`${pct}% complete overall`);
    const worst = projectRows.filter(r => r.health === 'off-track');
    if (worst.length > 0) bits.push(`needs attention: ${worst.slice(0, 2).map(r => r.project.name).join(', ')}${worst.length > 2 ? ` +${worst.length - 2} more` : ''}`);
    return bits.join(' · ');
  }, [allTasks.length, overdue.length, dueWeek, pct, projectRows]);

  if (projects.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Real numbers from your actual work — no samples.</p>
        <div className="surface-soft mt-2">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title="Nothing to measure yet"
            hint="Create a project and add tasks. Health, throughput and workload charts will appear here."
            action={<Button onClick={openCreateProject}>Create project</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Every number below is computed live from your {allTasks.length} tasks.</p>
        </div>
        <span className="flex-1" />
        <SegmentedControl
          value={range}
          onChange={setRange}
          options={[
            { value: '7', label: '7d' },
            { value: '30', label: '30d' },
            { value: '90', label: '90d' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>

      {insight && (
        <div className="surface px-4 py-3 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 mt-0.5 text-primary-500 shrink-0" />
          <p className="text-sm text-dark-700 dark:text-dark-200">
            <span className="font-semibold">Right now: </span>
            {insight}.
          </p>
        </div>
      )}

      {/* KPI strip — wraps, never scrolls sideways */}
      <div className="surface overflow-hidden grid grid-cols-2 md:grid-cols-4 gap-px bg-dark-200 dark:bg-dark-800 !p-0 !border-0">
        <Kpi icon={<ListTodo className="h-4 w-4" />} label={`Created · ${range === 'all' ? 'all time' : `last ${range}d`}`} value={inRange.length} />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={doneCount} />
        <Kpi icon={<BarChart3 className="h-4 w-4" />} label="Completion" value={`${pct}%`} />
        <Kpi icon={<AlertCircle className="h-4 w-4" />} label="Overdue now" value={overdue.length} alert={overdue.length > 0} />
      </div>

      {/* project health — the main event */}
      <section className="surface-soft overflow-hidden">
        <div className="card-header">
          <h2 className="font-semibold text-dark-900 dark:text-white">Project health</h2>
          <p className="text-[13px] text-dark-500 dark:text-dark-400 mt-0.5">Progress, volume and staffing per project.</p>
        </div>
        <ul className="divide-y divide-dark-200 dark:divide-dark-800">
          {projectRows.map(({ project, total, done, open, late, soon, owners, progress, health }) => (
            <li key={project.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                <Link to={`/project/${project.id}`} className="font-semibold text-[15px] text-dark-900 dark:text-white hover:underline truncate min-w-0 flex-1">
                  {project.name}
                </Link>
                <Badge variant={HEALTH_META[health].badge}>{HEALTH_META[health].label}</Badge>
              </div>
              <div className="mt-2.5 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-dark-100 dark:bg-dark-800 overflow-hidden min-w-0">
                  <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs font-bold text-dark-700 dark:text-dark-200 w-10 text-right shrink-0 tabular-nums">{progress}%</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-dark-500 dark:text-dark-400">
                <span><strong className="text-dark-800 dark:text-dark-100 tabular-nums">{total}</strong> tasks</span>
                <span><strong className="text-dark-800 dark:text-dark-100 tabular-nums">{open}</strong> open</span>
                <span><strong className="text-dark-800 dark:text-dark-100 tabular-nums">{done}</strong> done</span>
                <span className={classNames(late > 0 && 'text-red-600 dark:text-red-400 font-medium')}>
                  <strong className="tabular-nums">{late}</strong> overdue
                </span>
                <span><strong className="text-dark-800 dark:text-dark-100 tabular-nums">{soon}</strong> due soon</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /><strong className="text-dark-800 dark:text-dark-100 tabular-nums">{owners}</strong> people</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* throughput */}
      <section className="surface-soft overflow-hidden">
        <div className="card-header">
          <h2 className="font-semibold text-dark-900 dark:text-white">Throughput — last 6 weeks</h2>
          <p className="text-[13px] text-dark-500 dark:text-dark-400 mt-0.5">Created vs. finished per week. “Finished” counts by last update.</p>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-end gap-3 sm:gap-5 h-44">
            {throughput.map(w => (
              <div key={w.label} className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="flex items-end justify-center gap-1 h-full w-full">
                  <div className="flex flex-col justify-end h-full" title={`${w.created} created`}>
                    <div className="w-4 sm:w-7 rounded-t-md bg-primary-200 dark:bg-primary-900 transition-all" style={{ height: `${Math.max((w.created / throughputMax) * 100, w.created ? 4 : 0)}%` }} />
                  </div>
                  <div className="flex flex-col justify-end h-full" title={`${w.finished} finished`}>
                    <div className="w-4 sm:w-7 rounded-t-md bg-primary-600 transition-all" style={{ height: `${Math.max((w.finished / throughputMax) * 100, w.finished ? 4 : 0)}%` }} />
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] text-dark-400 dark:text-dark-500 truncate">{w.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-5 mt-3 text-xs text-dark-500 dark:text-dark-400">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-primary-200 dark:bg-primary-900" /> Created</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-primary-600" /> Finished</span>
          </div>
        </div>
      </section>

      {/* workload by person */}
      <section className="surface-soft overflow-hidden">
        <div className="card-header flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-dark-900 dark:text-white">Workload by person</h2>
            <p className="text-[13px] text-dark-500 dark:text-dark-400 mt-0.5">Who is carrying what — open vs. done.</p>
          </div>
          <Link to="/people" className="text-[13px] font-medium text-primary-600 hover:underline dark:text-primary-400 shrink-0">
            Manage people
          </Link>
        </div>
        {workload.length === 0 ? (
          <p className="px-5 py-6 text-sm text-dark-500 dark:text-dark-400">Nobody owns anything yet — pick an Owner on any task.</p>
        ) : (
          <ul className="divide-y divide-dark-200 dark:divide-dark-800">
            {workload.map(w => (
              <li key={w.name} className="px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={w.name} size="sm" />
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-dark-900 dark:text-dark-100">{w.name}</span>
                  {!w.registered && <Badge variant="warning">unregistered</Badge>}
                  {w.overdue > 0 && <Badge variant="danger">{w.overdue} late</Badge>}
                  <span className="text-xs text-dark-500 dark:text-dark-400 tabular-nums shrink-0">{w.open} open · {w.done} done</span>
                </div>
                <div className="mt-2 ml-11 flex h-2 rounded-full overflow-hidden bg-dark-100 dark:bg-dark-800" title={`${w.done} done · ${w.open} open`}>
                  {w.done > 0 && <div className="bg-green-500 h-full" style={{ flexGrow: w.done, flexBasis: 0 }} />}
                  {w.open > 0 && <div className="bg-dark-300 dark:bg-dark-600 h-full" style={{ flexGrow: w.open, flexBasis: 0 }} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* priority mix */}
      <section className="surface-soft overflow-hidden">
        <div className="card-header">
          <h2 className="font-semibold text-dark-900 dark:text-white">Priority mix</h2>
        </div>
        <ul className="px-5 py-4 space-y-3.5">
          {priorityMix.map(({ pr, count, max }) => (
            <li key={pr}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium capitalize text-dark-800 dark:text-dark-100">{pr}</span>
                <span className="text-dark-500 dark:text-dark-400 text-xs tabular-nums">{count} tasks</span>
              </div>
              <div className="h-2 rounded-full bg-dark-100 dark:bg-dark-800 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(count / max) * 100}%`, backgroundColor: getPriorityColor(pr) }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* needs attention */}
      <section className="surface-soft overflow-hidden">
        <div className="card-header">
          <h2 className="font-semibold text-dark-900 dark:text-white">Needs attention</h2>
        </div>
        {overdue.length === 0 ? (
          <p className="px-5 py-6 text-sm text-dark-500 dark:text-dark-400">Nothing overdue. Everything is on track.</p>
        ) : (
          <ul className="divide-y divide-dark-200 dark:divide-dark-800 max-h-[320px] overflow-y-auto">
            {overdue.slice(0, 12).map(t => (
              <li key={t.id}>
                <button onClick={() => openEditTask(t.id, t.projectId)} className="w-full text-left px-5 py-3 hover:bg-dark-50 dark:hover:bg-dark-800/60">
                  <span className="block truncate text-sm font-medium text-dark-900 dark:text-dark-100">{t.title}</span>
                  <span className="text-xs text-dark-500 dark:text-dark-400">
                    {projectById.get(t.projectId)?.name} · due {formatDate(t.dueDate, 'MMM d')}
                    {t.assignee ? ` · ${t.assignee}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* recent activity */}
      <section className="surface-soft overflow-hidden">
        <div className="card-header">
          <h2 className="font-semibold text-dark-900 dark:text-white">Recent activity</h2>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-6 text-sm text-dark-500 dark:text-dark-400 flex items-center gap-2">
            <Inbox className="h-4 w-4" /> No activity yet.
          </div>
        ) : (
          <ul className="divide-y divide-dark-200 dark:divide-dark-800">
            {recent.map(t => (
              <li key={t.id}>
                <button onClick={() => openEditTask(t.id, t.projectId)} className="w-full text-left px-5 py-3 hover:bg-dark-50 dark:hover:bg-dark-800/60">
                  <span className="block truncate text-sm font-medium text-dark-900 dark:text-dark-100">{t.title}</span>
                  <span className="text-xs text-dark-500 dark:text-dark-400">
                    {projectById.get(t.projectId)?.name} · {formatRelativeTime(t.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: React.ReactNode; alert?: boolean }) {
  return (
    <div className="bg-white dark:bg-dark-900 px-5 py-4 min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-dark-400 dark:text-dark-500 truncate">
        {icon}
        <span className="truncate">{label}</span>
      </p>
      <p className={classNames('mt-0.5 text-2xl font-bold tracking-tight tabular-nums', alert ? 'text-red-600 dark:text-red-400' : 'text-dark-900 dark:text-white')}>
        {value}
      </p>
    </div>
  );
}
