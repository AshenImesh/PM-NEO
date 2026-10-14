import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useProject } from '@context/ProjectContext';
import { Avatar, EmptyState } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { ConfirmDialog } from '@components/ui/Modal';
import { classNames, formatDate, getPriorityColor, isOverdue, isTaskDone } from '@utils/helpers';
import type { Task } from '@types';

/**
 * People registry — register names once, pick them when assigning tasks.
 * No accounts, no invites. Detail view groups a person's tasks by project.
 */
export function PeoplePage() {
  const {
    people,
    allTasks,
    projects,
    columnsByProject,
    createPerson,
    updatePerson,
    deletePerson,
    openEditTask,
    openCreateTask,
  } = useProject();

  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const registeredNames = useMemo(() => new Set(people.map(p => p.name.toLowerCase())), [people]);

  const unregistered = useMemo(() => {
    const seen = new Map<string, string>();
    allTasks.forEach(t => {
      const name = t.assignee?.trim();
      if (name && !registeredNames.has(name.toLowerCase()) && !seen.has(name.toLowerCase())) {
        seen.set(name.toLowerCase(), name);
      }
    });
    return [...seen.values()].sort();
  }, [allTasks, registeredNames]);

  const stats = useMemo(() => {
    const map = new Map<string, { open: number; done: number; overdue: number; projectIds: Set<string>; tasks: Task[] }>();
    people.forEach(p => map.set(p.id, { open: 0, done: 0, overdue: 0, projectIds: new Set(), tasks: [] }));
    allTasks.forEach(t => {
      const owner = people.find(p => p.name === t.assignee);
      if (!owner) return;
      const s = map.get(owner.id)!;
      s.tasks.push(t);
      s.projectIds.add(t.projectId);
      if (isTaskDone(t, columnsByProject[t.projectId] ?? [])) s.done++;
      else {
        s.open++;
        if (isOverdue(t.dueDate)) s.overdue++;
      }
    });
    return map;
  }, [people, allTasks, columnsByProject]);

  const filtered = people.filter(p => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const selected = people.find(p => p.id === selectedId) ?? null;
  const projectById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  const grouped = useMemo(() => {
    if (!selected) return [];
    const s = stats.get(selected.id);
    if (!s) return [];
    const groups = new Map<string, Task[]>();
    s.tasks.forEach(t => {
      if (!groups.has(t.projectId)) groups.set(t.projectId, []);
      groups.get(t.projectId)!.push(t);
    });
    return [...groups.entries()]
      .map(([pid, list]) => ({
        project: projectById.get(pid),
        projectId: pid,
        tasks: [...list].sort((a, b) => {
          const ad = a.dueDate ? +new Date(a.dueDate) : Infinity;
          const bd = b.dueDate ? +new Date(b.dueDate) : Infinity;
          return ad - bd;
        }),
      }))
      .sort((a, b) => (a.project?.name ?? '').localeCompare(b.project?.name ?? ''));
  }, [selected, stats, projectById]);

  const addPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || adding) return;
    setAdding(true);
    setFormError(null);
    try {
      const created = await createPerson(newName.trim());
      setNewName('');
      setShowAdd(false);
      setSelectedId(created.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add person.');
    } finally {
      setAdding(false);
    }
  };

  const registerName = async (name: string) => {
    try {
      const created = await createPerson(name);
      setSelectedId(created.id);
    } catch {
      /* already registered — ignore */
    }
  };

  const commitRename = async () => {
    if (!selected) return;
    const next = renameValue.trim();
    if (!next || next === selected.name) {
      setRenaming(false);
      return;
    }
    try {
      await updatePerson(selected.id, next);
      setRenaming(false);
      setRenameError(null);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Could not rename.');
    }
  };

  return (
    <div className="page">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-subtitle">Register your group once — then just pick names when assigning tasks.</p>
        </div>
        <span className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find someone…" className="input pl-9 !w-52" aria-label="Find someone" />
        </div>
        <Button size="sm" onClick={() => { setShowAdd(v => !v); setFormError(null); }}>
          {showAdd ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showAdd ? 'Close' : 'Add person'}
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={addPerson} className="surface px-4 py-3.5 flex flex-wrap items-end gap-3 animate-in">
          <div className="flex-1 min-w-[220px]">
            <Input
              label="Person's name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Sam Rivera"
              autoFocus
              maxLength={60}
              error={formError ?? undefined}
            />
          </div>
          <Button type="submit" loading={adding} disabled={!newName.trim()}>
            <Check className="h-4 w-4" /> Register
          </Button>
        </form>
      )}

      {people.length === 0 && unregistered.length === 0 ? (
        <div className="surface-soft">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Nobody registered yet"
            hint="Add your friends here once. Afterwards every task editor shows them in a pick-list — no more retyping names."
            action={<Button onClick={() => setShowAdd(true)}><UserPlus className="h-4 w-4" /> Add the first person</Button>}
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5 items-start">
          {/* registry list */}
          <ul className="lg:col-span-2 surface-soft overflow-hidden divide-y divide-dark-200 dark:divide-dark-800">
            {filtered.map(p => {
              const s = stats.get(p.id);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setSelectedId(id => (id === p.id ? null : p.id))}
                    className={classNames(
                      'w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors',
                      selectedId === p.id ? 'bg-primary-50 dark:bg-primary-400/15 dark:ring-1 dark:ring-inset dark:ring-primary-300/25' : 'hover:bg-dark-50 dark:hover:bg-dark-800/60'
                    )}
                  >
                    <Avatar name={p.name} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-semibold text-dark-900 dark:text-white">{p.name}</span>
                      <span className="block text-xs text-dark-500 dark:text-dark-400">
                        {s?.open ?? 0} open · {s?.done ?? 0} done · {s?.projectIds.size ?? 0} project{(s?.projectIds.size ?? 0) === 1 ? '' : 's'}
                      </span>
                    </span>
                    {(s?.overdue ?? 0) > 0 && (
                      <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-[11px] font-semibold px-2 py-0.5">
                        {s!.overdue} late
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="px-4 py-6 text-sm text-dark-500 dark:text-dark-400">Nobody matches.</li>}
          </ul>

          {/* detail */}
          <section className="lg:col-span-3 surface-soft overflow-hidden">
            {!selected ? (
              <p className="px-5 py-8 text-sm text-dark-500 dark:text-dark-400">Select someone to see their work, grouped by project.</p>
            ) : (
              <>
                <div className="card-header flex flex-wrap items-center gap-3">
                  <Avatar name={selected.name} size="lg" />
                  <div className="flex-1 min-w-[180px]">
                    {renaming ? (
                      <form
                        onSubmit={e => { e.preventDefault(); commitRename(); }}
                        className="flex gap-1.5 items-center"
                      >
                        <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus maxLength={60} aria-label="Person name" error={renameError ?? undefined} />
                        <Button type="submit" size="sm">Save</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setRenaming(false)} className="px-2" aria-label="Cancel rename">
                          <X className="h-4 w-4" />
                        </Button>
                      </form>
                    ) : (
                      <>
                        <h2 className="font-bold text-lg text-dark-900 dark:text-white">{selected.name}</h2>
                        <p className="text-xs text-dark-500 dark:text-dark-400">
                          {stats.get(selected.id)?.open ?? 0} open · {stats.get(selected.id)?.done ?? 0} done across {stats.get(selected.id)?.projectIds.size ?? 0} projects
                        </p>
                      </>
                    )}
                  </div>
                  {!renaming && (
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => { setRenameValue(selected.name); setRenameError(null); setRenaming(true); }} className="px-2.5" aria-label={`Rename ${selected.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="px-2.5 !text-red-600 hover:!bg-red-50 dark:!text-red-400 dark:hover:!bg-red-950/40" aria-label={`Remove ${selected.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {grouped.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-dark-500 dark:text-dark-400">
                    Nothing assigned yet. Pick {selected.name} as Owner on any task and it lands here.
                  </p>
                ) : (
                  <div className="divide-y divide-dark-200 dark:divide-dark-800">
                    {grouped.map(g => {
                      const open = g.tasks.filter(t => !isTaskDone(t, columnsByProject[t.projectId] ?? [])).length;
                      return (
                        <div key={g.projectId} className="px-5 py-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.project?.color ?? '#64748B' }} />
                            <span className="text-sm font-semibold text-dark-900 dark:text-white">{g.project?.name ?? 'Deleted project'}</span>
                            <span className="text-[11px] text-dark-400 dark:text-dark-500">{open} open · {g.tasks.length} total</span>
                          </div>
                          <ul className="space-y-1.5">
                            {g.tasks.map(t => {
                              const done = isTaskDone(t, columnsByProject[t.projectId] ?? []);
                              const late = !done && isOverdue(t.dueDate);
                              return (
                                <li key={t.id}>
                                  <button
                                    onClick={() => openEditTask(t.id, t.projectId)}
                                    className="w-full text-left rounded-xl border border-dark-200 dark:border-dark-700 px-3 py-2 hover:border-primary-300 dark:hover:border-primary-700 transition-colors flex items-center gap-2"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getPriorityColor(t.priority) }} />
                                    <span className={classNames('flex-1 min-w-0 truncate text-sm', done ? 'line-through text-dark-400 dark:text-dark-500' : 'text-dark-800 dark:text-dark-100')}>
                                      {t.title}
                                    </span>
                                    {t.dueDate && (
                                      <span className={classNames('text-[11px] shrink-0', late ? 'font-semibold text-red-600 dark:text-red-400' : 'text-dark-400 dark:text-dark-500')}>
                                        {formatDate(t.dueDate, 'MMM d')}
                                      </span>
                                    )}
                                    {done && <span className="text-[11px] font-semibold text-green-600 dark:text-green-400 shrink-0">done</span>}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {/* unregistered names discovered in tasks */}
      {unregistered.length > 0 && (
        <section className="surface px-4 py-3.5">
          <p className="text-sm font-semibold text-dark-900 dark:text-white">Names found in tasks but not registered</p>
          <p className="text-[13px] text-dark-500 dark:text-dark-400 mt-0.5">Register them to manage them here and offer them in every task editor.</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {unregistered.map(name => (
              <span key={name} className="inline-flex items-center gap-1.5 rounded-full border border-dark-200 dark:border-dark-700 pl-1 pr-1.5 py-0.5 text-[13px]">
                <Avatar name={name} size="xs" />
                <span className="font-medium text-dark-700 dark:text-dark-200">{name}</span>
                <button
                  onClick={() => registerName(name)}
                  className="rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 text-[11px] font-semibold px-2 py-0.5 hover:bg-primary-200 dark:hover:bg-primary-900"
                >
                  Register
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (selected) deletePerson(selected.id);
          setSelectedId(null);
          setConfirmDelete(false);
        }}
        title={`Remove ${selected?.name}?`}
        message="Their tasks keep the name as plain text — it just won't be offered in pick-lists anymore."
      />
    </div>
  );
}
