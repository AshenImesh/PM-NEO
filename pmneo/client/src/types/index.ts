export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  order: number;
  color: string;
}

export interface Task {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  dueDate: string | null;
  startDate: string | null;
  estimatedHours: number;
  actualHours: number;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithColumn extends Task {
  columnName: string;
  columnColor: string;
}

export interface Person {
  id: string;
  name: string;
  createdAt: string;
}

export type Priority = Task['priority'];

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#10B981',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};