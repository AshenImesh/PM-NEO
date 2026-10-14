import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, FolderKanban, Inbox, Plus } from 'lucide-react';
import { useProject } from '@context/ProjectContext';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';
import { EmptyState, ProgressBar } from '@components/ui/Badge';
import {
  classNames,
  formatDate,
  formatRelativeTime,
  getPriorityColor,
  greetingForHour,
  isDueSoon,
  isOverdue,
  isTaskDone,
  projectProgress,
} from '@utils/helpers';

export function Dashboard() {
  const {
    projects,
    allTasks,
    columnsByProject,
    setCurrentProject,
    openCreateProject,
    openCreateTask,
    openEditTask,
    query,
  } = useProject();
  const navigate = useNavigate();

  const q = query.trim().toLowerCase();

  const stats = useMemo(() => {
    const open = allTasks.filter(t => !isTaskDone(t, columnsByProject[t.projectId] ?? []));
    const overdue = open.filter(t => isOverdue(t.dueDate));
    const week = open.filter(t => t.dueDate && !isOverdue(t.dueDate) && isDueSoon(t.dueDate, 7));
    return { total: allTasks.length, open: open.length, overdue: overdue.length, week: week.length };
  }, [allTasks, columnsByProject]);

  const visibleProjects = useMemo(() => {
    const list = q ? projects.filter(p => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)) : projects;
    return [...list].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [projects, q]);

  const upNext = useMemo(() => {
    const open = allTasks.filter(t => {
      if (isTaskDone(t, columnsByProject[t.projectId] ?? [])) return false;
      if (!t.dueDate) return false;
      if (q && !`${t.title} ${t.assignee} ${(t.tags ?? []).join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return open.sort((a, b) => +new Date(a.dueDate!) - +new Date(b.dueDate!)).slice(0, 7);
  }, [allTasks, columnsByProject, q]);

  const recent = useMemo(() => {
    const list = q
      ? allTasks.filter(t => `${t.title} ${t.description} ${t.assignee}`.toLowerCase().includes(q))
      : allTasks;
    return [...list].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 6);
  }, [allTasks, q]);

  const projectById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  const openProject = (id: string) => {
    const p = projects.find(x => x.id === id);
    if (p) setCurrentProject(p);
    navigate(`/project/${id}`);
  };

  return (
    <div className="page">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">
            {greetingForHour(new Date().getHours())}
            {projects.length > 0 && (
              <span className="text-dark-400 dark:text-dark-500 font-medium"> — {projects.length} project{projects.length === 1 ? '' : 's'} in motion</span>
            )}
          </h1>
          <p className="page-subtitle">Everything your group is working on, in one calm place.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openCreateProject}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
          <Button onClick={() => openCreateTask()} disabled={projects.length === 0}>
            <Plus className="h-4 w-4" />
            New task
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="surface-soft">
          <EmptyState
            icon={<FolderKanban className="h-6 w-6" />}
            title="Start your first project"
            hint="Projects hold boards, timelines and calendars. Create one, add a few tasks, and drag them across columns."
            action={
              <Button onClick={openCreateProject} size="lg">
                <Plus className="h-4 w-4" />
                Create project
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* overview strip (not tiles: one calm bar) */}
          <div className="surface px-2 py-1 flex flex-wrap items-center divide-x divide-dark-200 dark:divide-dark-800">
            <StripStat label="Open tasks" value={stats.open} />
            <StripStat label="Due this week" value={stats.week} />
            <StripStat label="Overdue" value={stats.overdue} alert={stats.overdue > 0} />
            <StripStat label="Total tracked" value={stats.total} />
            <div className="px-5 py-3 ml-auto hidden md:block">
              <Link to="/calendar" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400 inline-flex items-center gap-1">
                Open schedule <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-5 items-start">
            {/* projects */}
            <section className="lg:col-span-3 surface-soft overflow-hidden">
              <div className="card-header flex items-center justify-between">
                <h2 className="font-semibold text-dark-900 dark:text-white">
                  Projects{q ? ` matching “${query.trim()}”` : ''}
                </h2>
                <Button variant="ghost" size="sm" onClick={openCreateProject}>
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </div>
              <ul className="divide-y divide-dark-200 dark:divide-dark-800">
                {visibleProjects.map(p => {
                  const list = allTasks.filter(t => t.projectId === p.id);
                  const cols = columnsByProject[p.id] ?? [];
                  const done = list.filter(t => isTaskDone(t, cols)).length;
                  const pct = projectProgress(list, cols);
                  const overdue = list.filter(t => !isTaskDone(t, cols) && isOverdue(t.dueDate)).length;
                  return (
                    <li key={p.id}>
                      <button onClick={() => openProject(p.id)} className="w-full text-left px-5 py-4 hover:bg-dark-50 dark:hover:bg-dark-800/60 transition-colors">
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: p.color }}>
                            {p.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-dark-900 dark:text-white truncate">{p.name}</span>
                              {overdue > 0 && <Badge variant="danger">{overdue} overdue</Badge>}
                            </span>
                            <span className="block text-[13px] text-dark-500 dark:text-dark-400 truncate">
                              {p.description || `${list.length} tasks · updated ${formatRelativeTime(p.updatedAt)}`}
                            </span>
                          </span>
                          <span className="hidden sm:flex flex-col items-end gap-1.5 w-36 shrink-0">
                            <span className="text-[11px] text-dark-400 dark:text-dark-500">{done}/{list.length} done</span>
                            <ProgressBar value={pct} className="w-full" />
                          </span>
                          <ArrowRight className="h-4 w-4 text-dark-300 dark:text-dark-600 shrink-0" />
                        </span>
                      </button>
                    </li>
                  );
                })}
                {visibleProjects.length === 0 && (
                  <li className="px-5 py-8 text-sm text-dark-500 dark:text-dark-400">No projects match your search.</li>
                )}
              </ul>
            </section>

            {/* right rail */}
            <div className="lg:col-span-2 space-y-5">
              <section className="surface-soft overflow-hidden">
                <div className="card-header flex items-center justify-between">
                  <h2 className="font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-dark-400" />
                    Up next
                  </h2>
                  <Link to="/calendar" className="text-[13px] font-medium text-primary-600 hover:underline dark:text-primary-400">
                    Schedule
                  </Link>
                </div>
                {upNext.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-dark-500 dark:text-dark-400">
                    Nothing scheduled. Open a project, add due dates, and they will line up here.
                  </p>
                ) : (
                  <ul className="divide-y divide-dark-200 dark:divide-dark-800">
                    {upNext.map(t => {
                      const p = projectById.get(t.projectId);
                      const late = isOverdue(t.dueDate);
                      return (
                        <li key={t.id}>
                          <button onClick={() => openEditTask(t.id, t.projectId)} className="w-full text-left px-5 py-3 hover:bg-dark-50 dark:hover:bg-dark-800/60 transition-colors">
                            <span className="flex items-start gap-2.5">
                              <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getPriorityColor(t.priority) }} />
                              <span className="flex-1 min-w-0">
                                <span className="block truncate text-sm font-medium text-dark-900 dark:text-dark-100">{t.title}</span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-dark-500 dark:text-dark-400">
                                  {p && (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                                      {p.name}
                                    </span>
                                  )}
                                  <span className={classNames(late && 'text-red-600 dark:text-red-400 font-medium')}>
                                    {formatDate(t.dueDate, 'EEE, MMM d')}
                                    {late ? ' · overdue' : ''}
                                  </span>
                                  {t.assignee && <span>· {t.assignee}</span>}
                                </span>
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="surface-soft overflow-hidden">
                <div className="card-header">
                  <h2 className="font-semibold text-dark-900 dark:text-white">Recently updated</h2>
                </div>
                {recent.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-dark-500 dark:text-dark-400 flex items-center gap-2">
                    <Inbox className="h-4 w-4" /> No activity yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-dark-200 dark:divide-dark-800">
                    {recent.map(t => {
                      const p = projectById.get(t.projectId);
                      return (
                        <li key={t.id}>
                          <button onClick={() => openEditTask(t.id, t.projectId)} className="w-full text-left px-5 py-3 hover:bg-dark-50 dark:hover:bg-dark-800/60 transition-colors">
                            <span className="block truncate text-sm font-medium text-dark-900 dark:text-dark-100">{t.title}</span>
                            <span className="text-xs text-dark-500 dark:text-dark-400">
                              {p?.name ?? 'Project'} · {formatRelativeTime(t.updatedAt)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StripStat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="px-5 py-3 min-w-[130px]">
      <p className={classNames('text-2xl font-bold tracking-tight', alert ? 'text-red-600 dark:text-red-400' : 'text-dark-900 dark:text-white')}>
        {value}
      </p>
      <p className="text-[11px] font-medium uppercase tracking-wider text-dark-400 dark:text-dark-500">{label}</p>
    </div>
  );
}
