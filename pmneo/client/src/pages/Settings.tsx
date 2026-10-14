import { useRef, useState } from 'react';
import { Download, FolderKanban, Moon, Paintbrush, Sun, Trash2, Upload } from 'lucide-react';
import { useProject } from '@context/ProjectContext';
import { useTheme } from '@context/ThemeContext';
import { api } from '@utils/api';
import { classNames } from '@utils/helpers';
import { Button } from '@components/ui/Button';
import { SegmentedControl } from '@components/ui/Badge';
import { ConfirmDialog } from '@components/ui/Modal';

type Tab = 'appearance' | 'projects' | 'data' | 'about';

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('appearance');

  return (
    <div className="page !max-w-4xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Workspace preferences — no accounts, no sign-in.</p>
      </div>

      <div className="surface overflow-hidden">
        <div className="flex gap-1 px-3 pt-3 hairline-b overflow-x-auto" role="tablist">
          {(
            [
              { id: 'appearance', label: 'Appearance' },
              { id: 'projects', label: 'Projects' },
              { id: 'data', label: 'Data' },
              { id: 'about', label: 'About' },
            ] as Array<{ id: Tab; label: string }>
          ).map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={classNames(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                tab === t.id
                  ? 'border-primary-600 text-primary-700 dark:text-primary-300'
                  : 'border-transparent text-dark-500 hover:text-dark-800 dark:text-dark-400 dark:hover:text-dark-100'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-5 sm:p-6">
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'projects' && <ProjectsTab />}
          {tab === 'data' && <DataTab />}
          {tab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-5">
      <div className="surface-inset p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/60 flex items-center justify-center text-primary-600 dark:text-primary-300">
          {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <p className="font-medium text-dark-900 dark:text-white">Theme</p>
          <p className="text-sm text-dark-500 dark:text-dark-400">Applies instantly across every screen.</p>
        </div>
        <SegmentedControl
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </div>
      <div className="surface-inset p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center text-violet-600 dark:text-violet-300">
          <Paintbrush className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-dark-900 dark:text-white">Project colors</p>
          <p className="text-sm text-dark-500 dark:text-dark-400">Pick a color when creating or editing a project — it marks the project everywhere.</p>
        </div>
      </div>
    </div>
  );
}

function ProjectsTab() {
  const { projects, allTasks, openCreateProject, openEditProject } = useProject();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-dark-500 dark:text-dark-400">{projects.length} project{projects.length === 1 ? '' : 's'}</p>
        <Button size="sm" onClick={openCreateProject}>New project</Button>
      </div>
      {projects.length === 0 && <p className="text-sm text-dark-500 dark:text-dark-400">No projects yet.</p>}
      <ul className="space-y-2">
        {projects.map(p => {
          const count = allTasks.filter(t => t.projectId === p.id).length;
          return (
            <li key={p.id} className="surface-inset px-4 py-3 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: p.color }}>
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm font-semibold text-dark-900 dark:text-white">{p.name}</span>
                <span className="block text-xs text-dark-500 dark:text-dark-400">{count} task{count === 1 ? '' : 's'}</span>
              </span>
              <Button variant="secondary" size="sm" onClick={() => openEditProject(p.id)}>
                Edit
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DataTab() {
  const { projects, columnsByProject, allTasks, people, refreshAll, deleteProject } = useProject();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const download = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAll = () => {
    const payload = {
      app: 'pmneo',
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
      columns: Object.values(columnsByProject).flat(),
      tasks: allTasks,
      people,
    };
    download(`pmneo-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
    setMessage(`Exported ${projects.length} projects, ${allTasks.length} tasks and ${people.length} people.`);
  };

  const importFile = async (file: File) => {
    setBusy(true);
    setMessage(null);
    try {
      const parsed = JSON.parse(await file.text());
      const inProjects = parsed.projects ?? [];
      const inColumns = parsed.columns ?? [];
      const inTasks = parsed.tasks ?? [];
      const inPeople = parsed.people ?? [];
      if (!Array.isArray(inProjects) || !Array.isArray(inTasks)) throw new Error('Not a PMNEO backup file.');

      let importedPeople = 0;
      if (Array.isArray(inPeople)) {
        for (const person of inPeople) {
          const name = String(person?.name ?? '').trim();
          if (!name) continue;
          try {
            await api.createPerson(name);
            importedPeople++;
          } catch {
            /* duplicate — skip */
          }
        }
      }

      let imported = 0;
      for (const p of inProjects) {
        if (!p?.name) continue;
        const created = await api.createProject({ name: String(p.name), description: String(p.description ?? ''), color: p.color });
        const colMap = new Map<string, string>();
        const cols = inColumns.filter((c: { projectId?: string }) => c.projectId === p.id);
        for (const [i, c] of cols.entries()) {
          if (!c?.name) continue;
          const nc = await api.createColumn(created.id, { name: String(c.name), color: c.color, order: c.order ?? i });
          if (c.id) colMap.set(c.id, nc.id);
        }
        const firstCol = (await api.getColumns(created.id).catch(() => []))[0];
        for (const t of inTasks.filter((t: { projectId?: string }) => t.projectId === p.id)) {
          if (!t?.title) continue;
          await api.createTask(created.id, {
            title: String(t.title),
            description: String(t.description ?? ''),
            priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority) ? t.priority : 'medium',
            assignee: String(t.assignee ?? ''),
            dueDate: t.dueDate ?? null,
            startDate: t.startDate ?? null,
            estimatedHours: Number(t.estimatedHours) || 0,
            tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
            columnId: (t.columnId && colMap.get(t.columnId)) || firstCol?.id,
            order: Number(t.order) || 0,
          });
          imported++;
        }
      }
      await refreshAll();
      setMessage(`Imported ${imported} tasks${importedPeople ? ` and ${importedPeople} people` : ''}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const resetAll = async () => {
    setBusy(true);
    try {
      for (const p of projects) await deleteProject(p.id);
      for (const person of people) {
        try {
          await api.deletePerson(person.id);
        } catch {
          /* ignore */
        }
      }
      await refreshAll();
      setMessage('Workspace cleared. Fresh start.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setBusy(false);
      setConfirmReset(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="surface-inset p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <p className="font-medium text-dark-900 dark:text-white">Backup</p>
          <p className="text-sm text-dark-500 dark:text-dark-400">Download everything as one JSON file.</p>
        </div>
        <Button variant="secondary" onClick={exportAll} disabled={busy}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      <div className="surface-inset p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <p className="font-medium text-dark-900 dark:text-white">Restore</p>
          <p className="text-sm text-dark-500 dark:text-dark-400">Import a PMNEO backup. Projects are recreated with fresh IDs.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) importFile(f);
          }}
        />
        <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={busy}>
          <Upload className="h-4 w-4" /> Import
        </Button>
      </div>

      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20 p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <Trash2 className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-medium text-dark-900 dark:text-white">Start over</span>
            <span className="block text-sm text-dark-500 dark:text-dark-400">Delete every project and task.</span>
          </span>
        </div>
        <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)} disabled={busy || projects.length === 0}>
          Clear workspace
        </Button>
      </div>

      {message && <p className="text-sm text-dark-600 dark:text-dark-300" role="status">{message}</p>}

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetAll}
        title="Clear everything?"
        message="All projects and tasks will be permanently deleted."
        loading={busy}
      />
    </div>
  );
}

function AboutTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-600 to-violet-500 flex items-center justify-center">
          <FolderKanban className="h-5 w-5 text-white" />
        </span>
        <div>
          <p className="font-bold text-dark-900 dark:text-white">PMNEO</p>
          <p className="text-sm text-dark-500 dark:text-dark-400">Local-first project workspace for small groups.</p>
        </div>
      </div>
      <ul className="text-sm text-dark-600 dark:text-dark-300 space-y-1.5 list-disc pl-5">
        <li>No accounts — open the URL and everyone can edit.</li>
        <li>Data lives in <code className="rounded bg-dark-100 dark:bg-dark-800 px-1">server/data.json</code> on this machine.</li>
        <li>Boards, timelines, calendars and analytics all read the same tasks.</li>
      </ul>
    </div>
  );
}
