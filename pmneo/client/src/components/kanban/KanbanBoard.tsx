import { useMemo, useState } from 'react';
import { KanbanSquare, Plus } from 'lucide-react';
import { useProject } from '@context/ProjectContext';
import type { Task } from '@types';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Modal } from '@components/ui/Modal';
import { EmptyState } from '@components/ui/Badge';
import { KanbanColumn } from './KanbanColumn';
import type { DropInfo } from './KanbanColumn';

export function KanbanBoard() {
  const {
    currentProject,
    columns,
    tasks,
    getTasksByColumn,
    createColumn,
    bulkUpdateTasks,
    openCreateTask,
    openEditTask,
    query,
  } = useProject();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropInfo, setDropInfo] = useState<DropInfo | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [addingColumn, setAddingColumn] = useState(false);

  const q = query.trim().toLowerCase();
  const visibleTasks = useMemo(() => {
    if (!q) return tasks;
    return tasks.filter(t =>
      `${t.title} ${t.description} ${t.assignee} ${(t.tags ?? []).join(' ')}`.toLowerCase().includes(q)
    );
  }, [tasks, q]);
  const visibleByColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    const ids = new Set(columns.map(c => c.id));
    columns.forEach(c => {
      map.set(
        c.id,
        visibleTasks.filter(t => t.columnId === c.id).sort((a, b) => a.order - b.order)
      );
    });
    // safety net: tasks pointing at a missing column land in the first column
    // instead of vanishing from the board
    const orphans = visibleTasks.filter(t => !ids.has(t.columnId));
    if (orphans.length > 0 && columns.length > 0) {
      const first = columns[0].id;
      map.set(first, [...(map.get(first) ?? []), ...orphans].sort((a, b) => a.order - b.order));
    }
    return map;
  }, [columns, visibleTasks]);

  if (!currentProject) return null;

  const onCardDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    setDraggedId(task.id);
  };
  const onCardDragEnd = () => {
    setDraggedId(null);
    setDropInfo(null);
  };

  /** figure out the insertion index from pointer Y within the column list */
  const onDragOverList = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const list = (e.currentTarget as HTMLElement).querySelectorAll('[data-task-id]');
    let index = list.length;
    for (let i = 0; i < list.length; i++) {
      const rect = (list[i] as HTMLElement).getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        index = i;
        break;
      }
    }
    // account for the dragged card still occupying a slot in its own column
    const colTasks = visibleByColumn.get(columnId) ?? [];
    const draggedIdx = colTasks.findIndex(t => t.id === draggedId);
    if (draggedIdx !== -1 && draggedIdx < index) index -= 1;
    setDropInfo(prev => (prev && prev.columnId === columnId && prev.index === index ? prev : { columnId, index }));
  };

  const onDropList = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    setDropInfo(null);
    setDraggedId(null);
    if (!id) return;

    const moving = tasks.find(t => t.id === id);
    if (!moving) return;
    const target = [...(visibleByColumn.get(columnId) ?? [])];
    // insertion index recomputed at drop time (same math as hover)
    const list = (e.currentTarget as HTMLElement).querySelectorAll('[data-task-id]');
    let index = list.length;
    for (let i = 0; i < list.length; i++) {
      const rect = (list[i] as HTMLElement).getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        index = i;
        break;
      }
    }

    if (moving.columnId === columnId) {
      const ordered = tasks.filter(t => t.columnId === columnId).sort((a, b) => a.order - b.order);
      const from = ordered.findIndex(t => t.id === id);
      if (from === -1) return;
      const without = ordered.filter(t => t.id !== id);
      // index was computed with the dragged card still in the list; adjust:
      const insertAt = Math.max(0, Math.min(from < index ? index - 1 : index, without.length));
      without.splice(insertAt, 0, moving);
      await bulkUpdateTasks(without.map((t, order) => ({ id: t.id, order })));
    } else {
      const source = tasks.filter(t => t.columnId === moving.columnId).sort((a, b) => a.order - b.order).filter(t => t.id !== id);
      const insertAt = Math.max(0, Math.min(index, target.filter(t => t.id !== id).length));
      const dest = target.filter(t => t.id !== id);
      dest.splice(insertAt, 0, { ...moving, columnId });
      await bulkUpdateTasks([
        ...source.map((t, order) => ({ id: t.id, order })),
        ...dest.map((t, order) =>
          t.id === id ? { id: t.id, columnId, order } : { id: t.id, order }
        ),
      ]);
    }
  };

  const addColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim() || !currentProject) return;
    setAddingColumn(true);
    try {
      await createColumn(currentProject.id, { name: newColumnName.trim() });
      setNewColumnName('');
      setShowAddColumn(false);
    } finally {
      setAddingColumn(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[13px] text-dark-500 dark:text-dark-400">
          {tasks.length} task{tasks.length === 1 ? '' : 's'} · drag cards between columns or click to edit
          {q && <> · filtered by “{query.trim()}”</>}
        </span>
        <span className="flex-1" />
        <Button variant="secondary" size="sm" onClick={() => setShowAddColumn(true)}>
          <Plus className="h-4 w-4" />
          Column
        </Button>
        <Button size="sm" onClick={() => openCreateTask({ projectId: currentProject.id })}>
          <Plus className="h-4 w-4" />
          Task
        </Button>
      </div>

      {columns.length === 0 ? (
        <div className="surface-soft">
          <EmptyState
            icon={<KanbanSquare className="h-6 w-6" />}
            title="No columns yet"
            hint="Columns are your workflow stages — e.g. Todo, Doing, Done."
            action={
              <Button onClick={() => setShowAddColumn(true)}>
                <Plus className="h-4 w-4" /> Add column
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 pb-3 flex-1 md:grid-cols-2 xl:grid-cols-3 items-start">
          {columns.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={visibleByColumn.get(col.id) ?? getTasksByColumn(col.id)}
              draggedId={draggedId}
              dropInfo={dropInfo}
              onCardDragStart={onCardDragStart}
              onCardDragEnd={onCardDragEnd}
              onDragOverList={onDragOverList}
              onDropList={onDropList}
              onOpenTask={t => openEditTask(t.id, t.projectId)}
            />
          ))}
          <button
            onClick={() => setShowAddColumn(true)}
            className="w-full rounded-2xl border border-dashed border-dark-300 dark:border-dark-700 px-4 py-5 text-sm font-medium text-dark-400 hover:text-dark-700 hover:border-primary-400 hover:bg-primary-50/50 dark:text-dark-500 dark:hover:text-dark-200 dark:hover:bg-primary-950/30 transition-colors"
          >
            <Plus className="h-5 w-5 mx-auto mb-1" />
            Add column
          </button>
        </div>
      )}

      <Modal isOpen={showAddColumn} onClose={() => setShowAddColumn(false)} title="Add column" size="sm">
        <form onSubmit={addColumn} className="space-y-4">
          <Input
            label="Column name"
            value={newColumnName}
            onChange={e => setNewColumnName(e.target.value)}
            placeholder="e.g. In review"
            autoFocus
            required
            maxLength={40}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowAddColumn(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={addingColumn}>
              Add column
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
