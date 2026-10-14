import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CalendarDays, KanbanSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { useProject } from '@context/ProjectContext';
import { classNames, isTaskDone } from '@utils/helpers';
import { Button } from '@components/ui/Button';
import { Dropdown } from '@components/ui/Badge';
import { EmptyState, ProgressBar, SegmentedControl } from '@components/ui/Badge';
import { KanbanBoard } from '@components/kanban/KanbanBoard';
import { TimelineView } from '@components/timeline/TimelineView';
import { projectProgress } from '@utils/helpers';
import { ConfirmDialog } from '@components/ui/Modal';

type View = 'board' | 'timeline';

export function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    projects,
    currentProject,
    columnsByProject,
    allTasks,
    setCurrentProject,
    openCreateTask,
    openEditProject,
    deleteProject,
  } = useProject();
  const [view, setView] = useState<View>('board');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const project = projects.find(p => p.id === projectId);

  useEffect(() => {
    // (re)select when the URL changes OR when projects finish loading
    // (covers refresh / direct link while the workspace is still loading)
    if (projectId && project && currentProject?.id !== project.id) {
      setCurrentProject(project);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, project, currentProject?.id]);

  if (!projectId) return null;

  if (!project) {
    return (
      <div className="page">
        <div className="surface-soft">
          <EmptyState
            icon={<AlertCircle className="h-6 w-6" />}
            title="Project not found"
            hint="It may have been deleted."
            action={<Button onClick={() => navigate('/')}>Back to overview</Button>}
          />
        </div>
      </div>
    );
  }

  const list = allTasks.filter(t => t.projectId === project.id);
  const cols = columnsByProject[project.id] ?? [];
  const done = list.filter(t => isTaskDone(t, cols)).length;
  const pct = projectProgress(list, cols);

  return (
    <div className="page !max-w-none">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ backgroundColor: project.color }}>
          {project.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="page-title truncate">{project.name}</h1>
          <p className="page-subtitle truncate">
            {project.description || 'No description yet.'} · {done}/{list.length} done
          </p>
        </div>
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: 'board', label: 'Board' },
            { value: 'timeline', label: 'Timeline' },
          ]}
        />
        <Button size="sm" onClick={() => openCreateTask({ projectId: project.id })}>
          <Plus className="h-4 w-4" /> Task
        </Button>
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm" className="px-2.5" aria-label="Project options">
              <Pencil className="h-4 w-4" />
            </Button>
          }
          items={[
            { label: 'Edit project', icon: <Pencil className="h-4 w-4" />, onClick: () => openEditProject(project.id) },
            { label: 'Open schedule', icon: <CalendarDays className="h-4 w-4" />, onClick: () => navigate('/calendar') },
            { label: 'Delete project', icon: <Trash2 className="h-4 w-4" />, onClick: () => setConfirmDelete(true), danger: true },
          ]}
        />
      </div>

      {/* progress hairline */}
      <div className="surface px-4 py-3 flex items-center gap-3">
        <ProgressBar value={pct} className="flex-1" />
        <span className="text-xs font-semibold text-dark-500 dark:text-dark-400 w-12 text-right">{pct}%</span>
        <span className={classNames('hidden sm:flex items-center gap-1.5 text-xs text-dark-400 dark:text-dark-500')}>
          {view === 'board' ? <KanbanSquare className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
          {view === 'board' ? `${cols.length} columns` : 'Scheduled capacity'}
        </span>
      </div>

      <div className="min-h-0 flex flex-col" style={{ minHeight: 480 }}>
        {view === 'board' ? <KanbanBoard /> : <TimelineView />}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteProject(project.id);
          navigate('/');
        }}
        title="Delete project?"
        message={`"${project.name}" and all of its tasks will be permanently removed.`}
      />
    </div>
  );
}
