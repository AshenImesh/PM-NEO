import type { Project, Column, Task, TaskWithColumn, Priority, Person } from '@types';

// API base: relative '/api' by default (local Vite proxy + same-origin
// Vercel functions). Only set VITE_API_URL for a custom backend origin.
const RAW_BASE = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL || '/api';
const API_BASE = RAW_BASE.replace(/\/$/, '');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    // Try JSON error body first; otherwise show status + a snippet so a
    // misconfigured deploy (e.g. missing API function) is diagnosable.
    const error = await response
      .json()
      .catch(async () => ({ error: `Request failed (${response.status} on ${endpoint})` }));
    throw new Error(error.error || `Request failed (${response.status} on ${endpoint})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  // Projects
  getProjects: () => request<Project[]>('/projects'),
  createProject: (data: Partial<Project>) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),

  // Columns
  getColumns: (projectId: string) => request<Column[]>(`/projects/${projectId}/columns`),
  createColumn: (projectId: string, data: Partial<Column>) =>
    request<Column>(`/projects/${projectId}/columns`, { method: 'POST', body: JSON.stringify(data) }),
  updateColumn: (id: string, data: Partial<Column>) =>
    request<Column>(`/columns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteColumn: (id: string) => request<void>(`/columns/${id}`, { method: 'DELETE' }),

  // Tasks
  getAllTasks: () => request<Task[]>('/tasks'),
  getTasks: (projectId: string) => request<Task[]>(`/projects/${projectId}/tasks`),
  createTask: (projectId: string, data: Partial<Task>) =>
    request<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
  bulkUpdateTasks: (updates: Array<{ id: string; columnId?: string; order?: number }>) =>
    request<{ success: boolean }>('/tasks/bulk', { method: 'PUT', body: JSON.stringify({ updates }) }),

  // Timeline
  getTimeline: (projectId: string) => request<TaskWithColumn[]>(`/projects/${projectId}/timeline`),

  // People registry
  getPeople: () => request<Person[]>('/people'),
  createPerson: (name: string) => request<Person>('/people', { method: 'POST', body: JSON.stringify({ name }) }),
  updatePerson: (id: string, name: string) => request<Person>(`/people/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deletePerson: (id: string) => request<void>(`/people/${id}`, { method: 'DELETE' }),
};

export type { Project, Column, Task, TaskWithColumn, Priority, Person };
