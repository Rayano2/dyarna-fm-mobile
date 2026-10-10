import type { Todo, TodoPriority } from '../api/todos-api';
import { getDueStatus } from './due-status';
import { parseLocalDateTime } from './local-date-time';

const PRIORITY_RANK: Record<TodoPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function dueTime(todo: Todo): number | undefined {
  return parseLocalDateTime(todo.dueDate)?.getTime();
}

/** Web parity: priority (HIGH, MEDIUM, LOW), then due date ascending, undated last. */
export function compareTodos(a: Todo, b: Todo): number {
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;
  const da = dueTime(a);
  const db = dueTime(b);
  if (da !== undefined && db !== undefined) return da - db;
  if (da !== undefined) return -1;
  if (db !== undefined) return 1;
  return 0;
}

export function sortTodos(todos: readonly Todo[]): Todo[] {
  // eslint-disable-next-line unicorn/no-array-sort -- toSorted() isn't on iOS/JSC pre-Safari 16; the array is a local copy
  return [...todos].sort(compareTodos);
}

/** "Needs attention": an active todo that is overdue, due today or tomorrow, or HIGH. */
export function isUrgentTodo(todo: Todo, now: Date = new Date()): boolean {
  if (todo.isCompleted) return false;
  if (todo.priority === 'HIGH') return true;
  const status = getDueStatus(todo.dueDate, now);
  return status === 'overdue' || status === 'today' || status === 'tomorrow';
}

export interface TodoSections {
  /** Active + urgent, sorted. Shown only on the Active tab. */
  urgent: Todo[];
  /** Active and not urgent, sorted. */
  active: Todo[];
  /** Completed, sorted. */
  completed: Todo[];
}

/** Splits the list into the screen's sections; urgent todos are NOT repeated in `active`. */
export function groupTodos(todos: readonly Todo[], now: Date = new Date()): TodoSections {
  const sections: TodoSections = { urgent: [], active: [], completed: [] };
  for (const todo of sortTodos(todos)) {
    if (todo.isCompleted) sections.completed.push(todo);
    else if (isUrgentTodo(todo, now)) sections.urgent.push(todo);
    else sections.active.push(todo);
  }
  return sections;
}
