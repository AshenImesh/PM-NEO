import { format, formatDistanceToNow, parseISO, isValid, differenceInDays, addDays, startOfDay, endOfDay } from 'date-fns';
import type { Column, Task } from '@types';

export function formatDate(date: string | Date | null | undefined, pattern = 'MMM d, yyyy'): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, pattern) : 'Invalid date';
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'MMM d, yyyy h:mm a');
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : 'Invalid date';
}

export function isOverdue(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) && d < new Date();
}

export function isDueSoon(date: string | Date | null | undefined, days = 3): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return false;
  const diff = differenceInDays(d, new Date());
  return diff >= 0 && diff <= days;
}

export function getDateRange(tasks: Array<{ startDate: string | null; dueDate: string | null }>): { start: Date; end: Date } | null {
  const dates = tasks
    .flatMap(t => [t.startDate, t.dueDate].filter(Boolean) as string[])
    .map(d => parseISO(d))
    .filter(isValid);
  
  if (dates.length === 0) return null;
  
  return {
    start: startOfDay(new Date(Math.min(...dates.map(d => d.getTime())))),
    end: endOfDay(new Date(Math.max(...dates.map(d => d.getTime()))))
  };
}

export function generateTimeSlots(start: Date, end: Date, slotMinutes = 30): Date[] {
  const slots: Date[] = [];
  const current = new Date(start);
  current.setMinutes(0, 0, 0);
  
  while (current <= end) {
    slots.push(new Date(current));
    current.setMinutes(current.getMinutes() + slotMinutes);
  }
  
  return slots;
}

export function daysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getPriorityColor(priority: 'low' | 'medium' | 'high' | 'urgent'): string {
  const colors = {
    low: '#10B981',
    medium: '#3B82F6',
    high: '#F59E0B',
    urgent: '#EF4444',
  };
  return colors[priority];
}

export function getPriorityLabel(priority: 'low' | 'medium' | 'high' | 'urgent'): string {
  const labels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  };
  return labels[priority];
}

/** Convert an ISO string to yyyy-MM-dd for <input type="date">. */
export function toDateInputValue(date: string | null | undefined): string {
  if (!date) return '';
  const d = parseISO(date);
  return isValid(d) ? format(d, 'yyyy-MM-dd') : '';
}

/** Convert a yyyy-MM-dd input value to an ISO string (start of day), or null. */
export function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function toTodayInputValue(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** The "done" column is the last column by order whose name includes "done",
 *  falling back to the last column. Returns its id or null. */
export function getDoneColumnId(columns: Column[]): string | null {
  if (columns.length === 0) return null;
  const sorted = [...columns].sort((a, b) => a.order - b.order);
  const named = [...sorted].reverse().find(c => c.name.toLowerCase().includes('done'));
  return (named ?? sorted[sorted.length - 1]).id;
}

export function isTaskDone(task: Task, columns: Column[]): boolean {
  const doneId = getDoneColumnId(columns);
  return doneId != null && task.columnId === doneId;
}

/** Completion % for a project based on tasks sitting in the done column. */
export function projectProgress(tasks: Task[], columns: Column[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter(t => isTaskDone(t, columns)).length;
  return Math.round((done / tasks.length) * 100);
}

export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}