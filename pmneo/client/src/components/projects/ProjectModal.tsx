import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@context/ProjectContext';
import { classNames } from '@utils/helpers';
import { Button } from '@components/ui/Button';
import { Input, Textarea } from '@components/ui/Input';
import { Modal, ConfirmDialog } from '@components/ui/Modal';

export const PROJECT_COLORS = [
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#65A30D',
  '#EA580C',
  '#4F46E5',
  '#0D9488',
  '#CA8A04',
];

export function ProjectModal() {
  const { projectModal, closeProjectModal, projects, createProject, updateProject, deleteProject, setCurrentProject } =
    useProject();
  const navigate = useNavigate();

  const editing = projects.find(p => p.id === projectModal?.projectId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectModal) return;
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setColor(editing?.color ?? PROJECT_COLORS[projects.length % PROJECT_COLORS.length]);
    setError(null);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectModal]);

  if (!projectModal) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give the project a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateProject(editing.id, { name: name.trim(), description: description.trim(), color });
      } else {
        const created = await createProject({ name: name.trim(), description: description.trim(), color });
        await setCurrentProject(created);
        navigate(`/project/${created.id}`);
      }
      closeProjectModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the project.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await deleteProject(editing.id);
      navigate('/');
      closeProjectModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the project.');
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <Modal
        isOpen
        onClose={closeProjectModal}
        title={editing ? 'Project settings' : 'New project'}
        description={editing ? 'Rename, recolor, or delete this project.' : 'One workspace, as many projects as you need.'}
        size="md"
      >
        <form onSubmit={save} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Website relaunch"
            autoFocus
            required
            maxLength={80}
          />
          <Textarea
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What is this project about? (optional)"
            rows={2}
          />
          <div>
            <span className="label">Color</span>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Use color ${c}`}
                  aria-pressed={color === c}
                  className={classNames(
                    'w-8 h-8 rounded-full transition-transform border-2',
                    color === c
                      ? 'border-dark-900 scale-110 dark:border-white'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2 hairline-t">
            {editing ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="!text-red-600 hover:!bg-red-50 dark:!text-red-400 dark:hover:!bg-red-950/40">
                Delete project
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={closeProjectModal} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editing ? 'Save changes' : 'Create project'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Delete project?"
        message={`"${editing?.name}" and all of its tasks will be permanently removed.`}
        loading={saving}
      />
    </>
  );
}
