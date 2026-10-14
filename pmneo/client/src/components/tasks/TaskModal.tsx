import { useEffect, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { useProject } from '@context/ProjectContext';
import { fromDateInputValue, toDateInputValue } from '@utils/helpers';
import type { Priority } from '@types';
import { Button } from '@components/ui/Button';
import { Input, Textarea } from '@components/ui/Input';
import { Select } from '@components/ui/Select';
import { Modal, ConfirmDialog } from '@components/ui/Modal';
import { PersonPicker } from '@components/people/PersonPicker';

const PRIORITIES: Array<{ value: Priority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function TaskModal() {
  const {
    taskModal,
    closeTaskModal,
    projects,
    columnsByProject,
    allTasks,
    createTask,
    updateTask,
    deleteTask,
    fetchColumns,
  } = useProject();

  const editing = allTasks.find(t => t.id === taskModal?.taskId);
  const [projectId, setProjectId] = useState('');
  const [columnId, setColumnId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assignee, setAssignee] = useState('');
  const [due, setDue] = useState('');
  const [start, setStart] = useState('');
  const [hours, setHours] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskModal) return;
    const pid = editing?.projectId ?? taskModal.projectId;
    setProjectId(pid);
    setColumnId(editing?.columnId ?? taskModal.columnId ?? '');
    setTitle(editing?.title ?? '');
    setDescription(editing?.description ?? '');
    setPriority(editing?.priority ?? 'medium');
    setAssignee(editing?.assignee ?? '');
    setDue(editing ? toDateInputValue(editing.dueDate) : taskModal.dueSeed ?? '');
    setStart(editing ? toDateInputValue(editing.startDate) : '');
    setHours(editing?.estimatedHours ? String(editing.estimatedHours) : '');
    setTags(editing ? (editing.tags ?? []).join(', ') : '');
    setError(null);
    setConfirmDelete(false);
    if (pid) fetchColumns(pid).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskModal]);

  useEffect(() => {
    if (projectId) fetchColumns(projectId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // if the modal's project vanished (deleted elsewhere) fall back to the first one
  useEffect(() => {
    if (taskModal && projectId && projects.length > 0 && !projects.some(p => p.id === projectId)) {
      setProjectId(projects[0].id);
      setColumnId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskModal, projectId, projects]);

  if (!taskModal) return null;

  const cols = [...(columnsByProject[projectId] ?? [])].sort((a, b) => a.order - b.order);
  const effectiveColumn = columnId || cols[0]?.id || '';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Give the task a title.');
      return;
    }
    if (!projectId || !projects.some(p => p.id === projectId)) {
      setError('Pick a project first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        assignee: assignee.trim(),
        dueDate: fromDateInputValue(due),
        startDate: fromDateInputValue(start),
        estimatedHours: hours === '' ? 0 : Math.max(0, Number(hours) || 0),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        columnId: effectiveColumn || undefined,
      };
      if (editing) await updateTask(editing.id, payload);
      else await createTask(projectId, payload);
      closeTaskModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the task.');
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await createTask(editing.projectId, {
        title: `${editing.title} (copy)`,
        description: editing.description,
        priority: editing.priority,
        assignee: editing.assignee,
        dueDate: editing.dueDate,
        startDate: editing.startDate,
        estimatedHours: editing.estimatedHours,
        tags: editing.tags,
        columnId: editing.columnId,
      });
      closeTaskModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not duplicate the task.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await deleteTask(editing.id);
      closeTaskModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the task.');
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <Modal
        isOpen
        onClose={closeTaskModal}
        title={editing ? 'Edit task' : 'New task'}
        description={editing ? 'Changes save instantly for everyone.' : 'Anyone with access can edit it later.'}
        size="lg"
      >
        {projects.length === 0 ? (
          <p className="text-sm text-dark-500 dark:text-dark-400">
            Create a project first, then add tasks to it.
          </p>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Project"
                value={projectId}
                onChange={e => {
                  setProjectId(e.target.value);
                  setColumnId('');
                }}
                options={projects.map(p => ({ value: p.id, label: p.name }))}
                required
              />
              <Select
                label="Column"
                value={effectiveColumn}
                onChange={e => setColumnId(e.target.value)}
                options={cols.map(c => ({ value: c.id, label: c.name }))}
                placeholder={cols.length ? undefined : 'No columns yet'}
              />
            </div>

            <Input
              label="Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs doing?"
              autoFocus
              required
              maxLength={140}
            />

            <Textarea
              label="Details"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add context, links, acceptance criteria…"
              rows={3}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Priority"
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                options={PRIORITIES}
              />
              <PersonPicker value={assignee} onChange={setAssignee} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Start" type="date" value={start} onChange={e => setStart(e.target.value)} />
              <Input label="Due" type="date" value={due} onChange={e => setDue(e.target.value)} />
              <Input
                label="Estimate (h)"
                type="number"
                min="0"
                step="0.5"
                value={hours}
                onChange={e => setHours(e.target.value)}
                placeholder="0"
              />
            </div>

            <Input
              label="Tags"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="design, frontend"
              hint="Comma-separated."
            />

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 hairline-t">
              <div className="flex gap-2">
                {editing && (
                  <>
                    <Button type="button" variant="ghost" size="sm" onClick={duplicate} disabled={saving}>
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(true)}
                      disabled={saving}
                      className="!text-red-600 hover:!bg-red-50 dark:!text-red-400 dark:hover:!bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={closeTaskModal} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  {editing ? 'Save changes' : 'Create task'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Delete task?"
        message={`"${editing?.title}" will be permanently removed.`}
        loading={saving}
      />
    </>
  );
}
