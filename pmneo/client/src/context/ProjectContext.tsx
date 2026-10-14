import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Column, Person, Project, Task, TaskWithColumn } from '@types';
import { api } from '@utils/api';

export interface TaskModalState {
  /** undefined = create mode, set = edit mode */
  taskId?: string;
  projectId: string;
  columnId?: string;
  /** yyyy-MM-dd seed for the due-date field (calendar day click) */
  dueSeed?: string;
}

export interface ProjectModalState {
  /** undefined = create mode, set = edit mode */
  projectId?: string;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  columns: Column[];
  tasks: Task[];
  timelineTasks: TaskWithColumn[];
  /** every task across every project (dashboard / calendar / analytics / people) */
  allTasks: Task[];
  columnsByProject: Record<string, Column[]>;
  loading: boolean;
  error: string | null;

  /** global search text shared by top bar + dashboard */
  query: string;
  setQuery: (q: string) => void;

  taskModal: TaskModalState | null;
  openCreateTask: (opts?: { projectId?: string; columnId?: string; dueSeed?: string }) => void;
  openEditTask: (taskId: string, projectId: string) => void;
  closeTaskModal: () => void;

  projectModal: ProjectModalState | null;
  openCreateProject: () => void;
  openEditProject: (projectId: string) => void;
  closeProjectModal: () => void;

  fetchProjects: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => Promise<void>;

  fetchColumns: (projectId: string) => Promise<void>;
  createColumn: (projectId: string, data: Partial<Column>) => Promise<Column>;
  updateColumn: (id: string, data: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (columnIds: string[]) => Promise<void>;

  fetchTasks: (projectId: string) => Promise<void>;
  fetchAllTasks: () => Promise<void>;
  createTask: (projectId: string, data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (taskId: string, columnId: string, order: number) => Promise<void>;
  bulkUpdateTasks: (updates: Array<{ id: string; columnId?: string; order?: number }>) => Promise<void>;

  fetchTimeline: (projectId: string) => Promise<void>;
  refreshAll: () => Promise<void>;

  people: Person[];
  fetchPeople: () => Promise<void>;
  createPerson: (name: string) => Promise<Person>;
  updatePerson: (id: string, name: string) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;

  getTasksByColumn: (columnId: string) => Task[];
  getDoneColumnId: (projectId: string) => string | null;
  clearError: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
const CURRENT_KEY = 'pmneo-current-project';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(CURRENT_KEY);
    } catch {
      return null;
    }
  });
  const [columnsByProject, setColumnsByProject] = useState<Record<string, Column[]>>({});
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({});
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [timelineTasks, setTimelineTasks] = useState<TaskWithColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [taskModal, setTaskModal] = useState<TaskModalState | null>(null);
  const [projectModal, setProjectModal] = useState<ProjectModalState | null>(null);

  const currentProject = useMemo(
    () => projects.find(p => p.id === currentProjectId) ?? null,
    [projects, currentProjectId]
  );
  const columns = useMemo(
    () => (currentProject ? columnsByProject[currentProject.id] ?? [] : []),
    [columnsByProject, currentProject]
  );
  const tasks = useMemo(
    () => (currentProject ? tasksByProject[currentProject.id] ?? [] : []),
    [tasksByProject, currentProject]
  );

  const clearError = useCallback(() => setError(null), []);

  const fail = useCallback((err: unknown, fallback: string): never => {
    const message = err instanceof Error ? err.message : fallback;
    setError(message);
    throw err instanceof Error ? err : new Error(message);
  }, []);

  const setCurrentId = useCallback((id: string | null) => {
    setCurrentProjectId(id);
    try {
      if (id) window.localStorage.setItem(CURRENT_KEY, id);
      else window.localStorage.removeItem(CURRENT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // ---------- loaders ----------

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
      // drop a stale selection
      setCurrentProjectId(prev => {
        const stillThere = prev && data.some(p => p.id === prev);
        if (!stillThere && prev) {
          try {
            window.localStorage.removeItem(CURRENT_KEY);
          } catch {
            /* ignore */
          }
          return null;
        }
        return prev;
      });
    } catch (err) {
      fail(err, 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [fail]);

  const fetchColumns = useCallback(
    async (projectId: string) => {
      try {
        const data = await api.getColumns(projectId);
        setColumnsByProject(prev => ({ ...prev, [projectId]: data }));
      } catch (err) {
        fail(err, 'Failed to fetch columns');
      }
    },
    [fail]
  );

  const fetchTasks = useCallback(
    async (projectId: string) => {
      try {
        const data = await api.getTasks(projectId);
        setTasksByProject(prev => ({ ...prev, [projectId]: data }));
      } catch (err) {
        fail(err, 'Failed to fetch tasks');
      }
    },
    [fail]
  );

  const fetchAllTasks = useCallback(async () => {
    try {
      const data = await api.getAllTasks();
      setAllTasks(data);
      setTasksByProject(prev => {
        const next = { ...prev };
        const byProject: Record<string, Task[]> = {};
        data.forEach(t => {
          (byProject[t.projectId] = byProject[t.projectId] ?? []).push(t);
        });
        Object.entries(byProject).forEach(([pid, list]) => {
          next[pid] = list;
        });
        return next;
      });
    } catch (err) {
      fail(err, 'Failed to fetch tasks');
    }
  }, [fail]);

  const fetchTimeline = useCallback(
    async (projectId: string) => {
      try {
        const data = await api.getTimeline(projectId);
        setTimelineTasks(data);
      } catch (err) {
        fail(err, 'Failed to fetch timeline');
      }
    },
    [fail]
  );

  const fetchPeople = useCallback(async () => {
    try {
      const data = await api.getPeople();
      setPeople(data);
    } catch (err) {
      fail(err, 'Failed to fetch people');
    }
  }, [fail]);

  const createPerson = useCallback(
    async (name: string) => {
      try {
        const person = await api.createPerson(name);
        setPeople(prev => [...prev, person].sort((a, b) => a.name.localeCompare(b.name)));
        return person;
      } catch (err) {
        return fail(err, 'Failed to add person');
      }
    },
    [fail]
  );

  const updatePerson = useCallback(
    async (id: string, name: string) => {
      try {
        const updated = await api.updatePerson(id, name);
        setPeople(prev => prev.map(p => (p.id === id ? updated : p)).sort((a, b) => a.name.localeCompare(b.name)));
        // server cascades the rename onto tasks — refresh caches
        await fetchAllTasks();
      } catch (err) {
        fail(err, 'Failed to rename person');
      }
    },
    [fail, fetchAllTasks]
  );

  const deletePerson = useCallback(
    async (id: string) => {
      try {
        await api.deletePerson(id);
        setPeople(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        fail(err, 'Failed to remove person');
      }
    },
    [fail]
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
      const [tasks, persons] = await Promise.all([api.getAllTasks(), api.getPeople().catch(() => [] as Person[])]);
      setPeople(persons);
      setAllTasks(tasks);
      const byProject: Record<string, Task[]> = {};
      tasks.forEach(t => {
        (byProject[t.projectId] = byProject[t.projectId] ?? []).push(t);
      });
      setTasksByProject(byProject);
      // columns for every project (needed for done-detection + analytics)
      const cols = await Promise.all(data.map(p => api.getColumns(p.id).catch(() => [] as Column[])));
      const map: Record<string, Column[]> = {};
      data.forEach((p, i) => {
        map[p.id] = cols[i];
      });
      setColumnsByProject(map);
      // keep selection valid
      setCurrentProjectId(prev => {
        if (prev && data.some(p => p.id === prev)) return prev;
        try {
          window.localStorage.removeItem(CURRENT_KEY);
        } catch {
          /* ignore */
        }
        return null;
      });
    } catch (err) {
      fail(err, 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  }, [fail]);

  // ---------- projects ----------

  const createProject = useCallback(
    async (data: Partial<Project>) => {
      setLoading(true);
      try {
        const project = await api.createProject(data);
        setProjects(prev => [...prev, project]);
        setColumnsByProject(prev => ({ ...prev, [project.id]: [] }));
        setTasksByProject(prev => ({ ...prev, [project.id]: [] }));
        // pre-create default columns through the lazy endpoint
        await fetchColumns(project.id);
        return project;
      } catch (err) {
        return fail(err, 'Failed to create project');
      } finally {
        setLoading(false);
      }
    },
    [fail, fetchColumns]
  );

  const updateProject = useCallback(
    async (id: string, data: Partial<Project>) => {
      try {
        const updated = await api.updateProject(id, data);
        setProjects(prev => prev.map(p => (p.id === id ? updated : p)));
      } catch (err) {
        fail(err, 'Failed to update project');
      }
    },
    [fail]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      try {
        await api.deleteProject(id);
        setProjects(prev => prev.filter(p => p.id !== id));
        setColumnsByProject(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setTasksByProject(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setAllTasks(prev => prev.filter(t => t.projectId !== id));
        setCurrentProjectId(prev => {
          if (prev === id) {
            try {
              window.localStorage.removeItem(CURRENT_KEY);
            } catch {
              /* ignore */
            }
            return null;
          }
          return prev;
        });
        setTimelineTasks([]);
      } catch (err) {
        fail(err, 'Failed to delete project');
      }
    },
    [fail]
  );

  const setCurrentProject = useCallback(
    async (project: Project | null) => {
      setCurrentId(project ? project.id : null);
      if (project) {
        await Promise.all([fetchColumns(project.id), fetchTasks(project.id), fetchTimeline(project.id)]);
      } else {
        setTimelineTasks([]);
      }
    },
    [fetchColumns, fetchTasks, fetchTimeline, setCurrentId]
  );

  // ---------- columns ----------

  const createColumn = useCallback(
    async (projectId: string, data: Partial<Column>) => {
      try {
        const column = await api.createColumn(projectId, data);
        setColumnsByProject(prev => ({
          ...prev,
          [projectId]: [...(prev[projectId] ?? []), column].sort((a, b) => a.order - b.order),
        }));
        return column;
      } catch (err) {
        return fail(err, 'Failed to create column');
      }
    },
    [fail]
  );

  const updateColumn = useCallback(
    async (id: string, data: Partial<Column>) => {
      try {
        const updated = await api.updateColumn(id, data);
        setColumnsByProject(prev => {
          const next: Record<string, Column[]> = {};
          Object.entries(prev).forEach(([pid, list]) => {
            next[pid] = list.map(c => (c.id === id ? updated : c));
          });
          return next;
        });
      } catch (err) {
        fail(err, 'Failed to update column');
      }
    },
    [fail]
  );

  const deleteColumn = useCallback(
    async (id: string) => {
      try {
        await api.deleteColumn(id);
        setColumnsByProject(prev => {
          const next: Record<string, Column[]> = {};
          Object.entries(prev).forEach(([pid, list]) => {
            next[pid] = list.filter(c => c.id !== id);
          });
          return next;
        });
        const drop = (list: Task[]) => list.filter(t => t.columnId !== id);
        setAllTasks(prev => drop(prev));
        setTasksByProject(prev => {
          const next: Record<string, Task[]> = {};
          Object.entries(prev).forEach(([pid, list]) => {
            next[pid] = drop(list);
          });
          return next;
        });
      } catch (err) {
        fail(err, 'Failed to delete column');
      }
    },
    [fail]
  );

  const reorderColumns = useCallback(
    async (columnIds: string[]) => {
      try {
        await Promise.all(columnIds.map((id, order) => api.updateColumn(id, { order })));
        setColumnsByProject(prev => {
          const next: Record<string, Column[]> = {};
          Object.entries(prev).forEach(([pid, list]) => {
            next[pid] = list
              .map(c => {
                const order = columnIds.indexOf(c.id);
                return order === -1 ? c : { ...c, order };
              })
              .sort((a, b) => a.order - b.order);
          });
          return next;
        });
      } catch (err) {
        fail(err, 'Failed to reorder columns');
      }
    },
    [fail]
  );

  // ---------- tasks ----------

  const applyTaskToCaches = useCallback((task: Task) => {
    setAllTasks(prev => {
      const i = prev.findIndex(t => t.id === task.id);
      return i === -1 ? [...prev, task] : prev.map(t => (t.id === task.id ? task : t));
    });
    setTasksByProject(prev => ({
      ...prev,
      [task.projectId]: (() => {
        const list = prev[task.projectId] ?? [];
        const i = list.findIndex(t => t.id === task.id);
        return i === -1 ? [...list, task] : list.map(t => (t.id === task.id ? task : t));
      })(),
    }));
    setTimelineTasks(prev => {
      const inWindow = task.startDate || task.dueDate;
      const i = prev.findIndex(t => t.id === task.id);
      if (!inWindow) return i === -1 ? prev : prev.filter(t => t.id !== task.id);
      if (i === -1) return prev; // timeline refresh happens on project open; avoid stale column names
      return prev.map(t => (t.id === task.id ? { ...t, ...task } : t));
    });
  }, []);

  const createTask = useCallback(
    async (projectId: string, data: Partial<Task>) => {
      try {
        const task = await api.createTask(projectId, data);
        applyTaskToCaches(task);
        return task;
      } catch (err) {
        return fail(err, 'Failed to create task');
      }
    },
    [applyTaskToCaches, fail]
  );

  const updateTask = useCallback(
    async (id: string, data: Partial<Task>) => {
      try {
        const updated = await api.updateTask(id, data);
        applyTaskToCaches(updated);
      } catch (err) {
        fail(err, 'Failed to update task');
      }
    },
    [applyTaskToCaches, fail]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      try {
        await api.deleteTask(id);
        setAllTasks(prev => prev.filter(t => t.id !== id));
        setTasksByProject(prev => {
          const next: Record<string, Task[]> = {};
          Object.entries(prev).forEach(([pid, list]) => {
            next[pid] = list.filter(t => t.id !== id);
          });
          return next;
        });
        setTimelineTasks(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        fail(err, 'Failed to delete task');
      }
    },
    [fail]
  );

  const moveTask = useCallback(
    async (taskId: string, columnId: string, order: number) => {
      const patch = (list: Task[]) => list.map(t => (t.id === taskId ? { ...t, columnId, order } : t));
      setAllTasks(patch);
      setTasksByProject(prev => {
        const next: Record<string, Task[]> = {};
        Object.entries(prev).forEach(([pid, list]) => {
          next[pid] = patch(list);
        });
        return next;
      });
      try {
        await api.bulkUpdateTasks([{ id: taskId, columnId, order }]);
      } catch (err) {
        await fetchAllTasks();
        fail(err, 'Failed to move task');
      }
    },
    [fail, fetchAllTasks]
  );

  const bulkUpdateTasks = useCallback(
    async (updates: Array<{ id: string; columnId?: string; order?: number }>) => {
      const ids = new Set(updates.map(u => u.id));
      const patch = (list: Task[]) =>
        list.map(t => {
          const u = updates.find(x => x.id === t.id);
          if (!u) return t;
          return {
            ...t,
            ...(u.columnId !== undefined ? { columnId: u.columnId } : {}),
            ...(u.order !== undefined ? { order: u.order } : {}),
          };
        });
      const prevAll = allTasks;
      setAllTasks(patch(allTasks));
      setTasksByProject(prev => {
        const next: Record<string, Task[]> = {};
        Object.entries(prev).forEach(([pid, list]) => {
          next[pid] = patch(list);
        });
        return next;
      });
      try {
        await api.bulkUpdateTasks(updates);
      } catch (err) {
        setAllTasks(prevAll);
        await fetchAllTasks();
        fail(err, 'Failed to update tasks');
      }
    },
    [allTasks, fail, fetchAllTasks]
  );

  // ---------- modal shortcuts ----------

  const openCreateTask = useCallback(
    (opts?: { projectId?: string; columnId?: string; dueSeed?: string }) => {
      const pid = opts?.projectId ?? currentProjectId ?? projects[0]?.id;
      if (!pid) {
        setProjectModal({});
        return;
      }
      setTaskModal({ projectId: pid, columnId: opts?.columnId, dueSeed: opts?.dueSeed });
    },
    [currentProjectId, projects]
  );

  const openEditTask = useCallback((taskId: string, projectId: string) => {
    setTaskModal({ taskId, projectId });
  }, []);

  const closeTaskModal = useCallback(() => setTaskModal(null), []);
  const openCreateProject = useCallback(() => setProjectModal({}), []);
  const openEditProject = useCallback((projectId: string) => setProjectModal({ projectId }), []);
  const closeProjectModal = useCallback(() => setProjectModal(null), []);

  // ---------- selectors ----------

  const getTasksByColumn = useCallback(
    (columnId: string) => tasks.filter(t => t.columnId === columnId).sort((a, b) => a.order - b.order),
    [tasks]
  );

  const getDoneColumnId = useCallback(
    (projectId: string) => {
      const cols = [...(columnsByProject[projectId] ?? [])].sort((a, b) => a.order - b.order);
      if (cols.length === 0) return null;
      return cols.find(c => c.name.toLowerCase().includes('done'))?.id ?? cols[cols.length - 1].id;
    },
    [columnsByProject]
  );

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const value: ProjectContextType = {
    projects,
    currentProject,
    columns,
    tasks,
    timelineTasks,
    allTasks,
    columnsByProject,
    loading,
    error,
    query,
    setQuery,
    taskModal,
    openCreateTask,
    openEditTask,
    closeTaskModal,
    projectModal,
    openCreateProject,
    openEditProject,
    closeProjectModal,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    fetchColumns,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    fetchTasks,
    fetchAllTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    bulkUpdateTasks,
    fetchTimeline,
    refreshAll,
    people,
    fetchPeople,
    createPerson,
    updatePerson,
    deletePerson,
    getTasksByColumn,
    getDoneColumnId,
    clearError,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
