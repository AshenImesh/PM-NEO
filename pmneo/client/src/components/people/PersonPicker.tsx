import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, UserRound, X } from 'lucide-react';
import { useProject } from '@context/ProjectContext';
import { classNames } from '@utils/helpers';
import { useClickOutside } from '@hooks/useDragAndDrop';
import { Avatar } from '@components/ui/Badge';

/**
 * Owner picker: choose from registered people, or add someone new inline.
 * Value is the person's display name (matches task.assignee).
 */
export function PersonPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const { people, createPerson } = useProject();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => {
    setOpen(false);
    setAdding(false);
    setError(null);
  });

  useEffect(() => {
    if (open) setFilter('');
  }, [open ]);

  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return people;
    return people.filter(p => p.name.toLowerCase().includes(q));
  }, [people, filter]);

  const exactExists = useMemo(
    () => people.some(p => p.name.toLowerCase() === (adding ? newName : filter).trim().toLowerCase()),
    [people, adding, newName, filter]
  );

  const addNew = async (raw: string) => {
    const name = raw.trim();
    if (!name || saving) return;
    setSaving(true);
    setError(null);
    try {
      const person = await createPerson(name);
      onChange(person.name);
      setOpen(false);
      setAdding(false);
      setNewName('');
      setFilter('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add person.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="w-full">
      <span className="label">Owner</span>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={classNames(
            'input flex items-center gap-2 text-left',
            !value && 'text-dark-400 dark:text-dark-500'
          )}
        >
          {value ? (
            <>
              <Avatar name={value} size="xs" />
              <span className="flex-1 truncate">{value}</span>
            </>
          ) : (
            <>
              <UserRound className="h-4 w-4 shrink-0" />
              <span className="flex-1">Unassigned</span>
            </>
          )}
          <ChevronDown className={classNames('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-2 rounded-xl border border-dark-300 dark:border-dark-700 text-dark-400 hover:text-red-600 dark:hover:text-red-400"
            aria-label="Clear owner"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="mt-1.5 w-full rounded-xl border border-dark-200 bg-white shadow-card overflow-hidden dark:bg-dark-800 dark:border-dark-700 animate-in">
          <div className="p-2 hairline-b">
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search people…"
              autoFocus
              className="input !py-1.5"
              aria-label="Search people"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1" role="listbox">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-dark-50 dark:hover:bg-dark-800"
              >
                <span className="w-6 h-6 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center text-dark-400">
                  <UserRound className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1 text-left text-dark-600 dark:text-dark-300">Unassigned</span>
                {!value && <Check className="h-4 w-4 text-primary-600" />}
              </button>
            </li>
            {matches.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === p.name}
                  onClick={() => {
                    onChange(p.name);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-dark-50 dark:hover:bg-dark-800"
                >
                  <Avatar name={p.name} size="xs" />
                  <span className="flex-1 text-left truncate text-dark-800 dark:text-dark-100">{p.name}</span>
                  {value === p.name && <Check className="h-4 w-4 text-primary-600" />}
                </button>
              </li>
            ))}
            {matches.length === 0 && !adding && (
              <li className="px-3 py-2 text-sm text-dark-400 dark:text-dark-500">No match — add them below.</li>
            )}
          </ul>
          <div className="p-2 hairline-t bg-dark-50/60 dark:bg-dark-900">
            {adding ? (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  addNew(newName);
                }}
                className="flex gap-1.5"
              >
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="New person's name"
                  autoFocus
                  maxLength={60}
                  className="input !py-1.5"
                  aria-label="New person's name"
                />
                <button type="submit" disabled={saving || !newName.trim() || exactExists} className="btn btn-primary btn-sm whitespace-nowrap">
                  Add
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAdding(true);
                  setNewName(filter);
                  setError(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <Plus className="h-4 w-4" />
                Add someone new{filter.trim() ? ` (“${filter.trim()}”)` : ''}
              </button>
            )}
            {(error || (adding && exactExists)) && (
              <p className="px-2 pt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                {error ?? 'That name is already registered — pick it from the list.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
