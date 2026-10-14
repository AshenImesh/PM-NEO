import { useRef, useState } from 'react';
import { Check, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Column, Task } from '@types';
import { classNames } from '@utils/helpers';
import { useProject } from '@context/ProjectContext';
import { TaskCard } from './TaskCard';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Dropdown } from '@components/ui/Badge';
import { ConfirmDialog } from '@components/ui/Modal';

export interface DropInfo {
  columnId: string;
  index: number;
}

export function KanbanColumn({
  column,
  tasks,
  draggedId,
  dropInfo,
  onCardDragStart,
  onCardDragEnd,
  onDragOverList,
  onDropList,
  onOpenTask,
}: {
  column: Column;
  tasks: Task[];
  draggedId: string | null;
  dropInfo: DropInfo | null;
  onCardDragStart: (e: React.DragEvent, task: Task) => void;
  onCardDragEnd: () => void;
  onDragOverList: (e: React.DragEvent, columnId: string) => void;
  onDropList: (e: React.DragEvent, columnId: string) => void;
  onOpenTask: (task: Task) => void;
}) {
  const { updateColumn, deleteColumn, openCreateTask } = useProject();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(column.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const isOver = dropInfo?.columnId === column.id;
  const showIndicatorAt = (i: number) => isOver && dropInfo.index === i;

  const commitRename = async () => {
    const next = name.trim();
    setRenaming(false);
    if (next && next !== column.name) await updateColumn(column.id, { name: next });
    else setName(column.name);
  };

  return (
    <section
      aria-label={`${column.name} column`}
      className={classNames(
        'flex w-full flex-col rounded-2xl border border-dark-200 bg-dark-50/70',
        'dark:bg-dark-900 dark:border-dark-800',
        isOver && 'ring-2 ring-primary-500/70'
      )}
    >
      <header className="flex items-center gap-2 px-3.5 pt-3.5 pb-3">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
        {renaming ? (
          <span className="flex flex-1 items-center gap-1 min-w-0">
            <Input value={name} onChange={e => setName(e.target.value)} autoFocus maxLength={40} className="!py-1" aria-label="Column name" />
            <button onClick={commitRename} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40" aria-label="Save column name">
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setName(column.name);
                setRenaming(false);
              }}
              className="p-1.5 rounded-lg text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800"
              aria-label="Cancel rename"
            >
              <X className="h-4 w-4" />
            </button>
          </span>
        ) : (
          <>
            <h3 className="flex-1 min-w-0 truncate text-sm font-semibold text-dark-800 dark:text-dark-100">{column.name}</h3>
            <span className="rounded-full bg-dark-200/60 px-2 py-0.5 text-[11px] font-semibold text-dark-500 dark:bg-dark-800 dark:text-dark-400">
              {tasks.length}
            </span>
            <Dropdown
              trigger={
                <button className="p-1.5 rounded-lg text-dark-400 hover:text-dark-700 hover:bg-dark-200/60 dark:hover:bg-dark-800 dark:hover:text-dark-200" aria-label={`Options for ${column.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
              items={[
                { label: 'Rename column', icon: <Pencil className="h-4 w-4" />, onClick: () => { setName(column.name); setRenaming(true); } },
                { label: 'Add task here', icon: <Plus className="h-4 w-4" />, onClick: () => openCreateTask({ projectId: column.projectId, columnId: column.id }) },
                { label: 'Delete column', icon: <Trash2 className="h-4 w-4" />, onClick: () => setConfirmDelete(true), danger: true },
              ]}
            />
          </>
        )}
      </header>

      <div
        ref={listRef}
        onDragOver={e => onDragOverList(e, column.id)}
        onDrop={e => onDropList(e, column.id)}
        className="min-h-[90px] max-h-[52vh] overflow-y-auto px-3 pb-3 space-y-2.5"
      >
        {tasks.map((t, i) => (
          <div key={t.id}>
            {showIndicatorAt(i) && <div className="h-0.5 rounded-full bg-primary-500 mb-2.5" />}
            <TaskCard
              task={t}
              dragging={draggedId === t.id}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
              onOpen={() => onOpenTask(t)}
            />
          </div>
        ))}
        {showIndicatorAt(tasks.length) && <div className="h-0.5 rounded-full bg-primary-500" />}
        {tasks.length === 0 && !isOver && (
          <p className="rounded-xl border border-dashed border-dark-300 dark:border-dark-700 px-3 py-6 text-center text-xs text-dark-400 dark:text-dark-500">
            Drop tasks here
          </p>
        )}
        <button
          onClick={() => openCreateTask({ projectId: column.projectId, columnId: column.id })}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-dark-400 hover:text-dark-700 hover:bg-white dark:text-dark-500 dark:hover:text-dark-200 dark:hover:bg-dark-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add task
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteColumn(column.id);
          setConfirmDelete(false);
        }}
        title={`Delete “${column.name}”?`}
        message={tasks.length > 0 ? `${tasks.length} task${tasks.length === 1 ? '' : 's'} in this column will also be deleted.` : 'This column will be removed.'}
      />
    </section>
  );
}

// re-exported so board can share the drag math type
export type { DropInfo as ColumnDropInfo };
