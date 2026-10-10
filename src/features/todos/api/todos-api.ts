import { bmsClient } from '@/shared/api/clients';
import { asBoolean, asString, extractArray } from '@/shared/api/coerce';
import { safeMapList } from '@/shared/api/safe-map';
import { normalizeLocalDateTime } from '../lib/local-date-time';
import { TODOS_PATH, TODOS_QUERY } from './todos-path';

export const TODO_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type TodoPriority = (typeof TODO_PRIORITIES)[number];

/** One BMS `TodoItemResponse`, the fields the screen uses. */
export interface Todo {
  todoId: number;
  title: string;
  description: string;
  isCompleted: boolean;
  priority: TodoPriority;
  /** Local wall-clock `yyyy-MM-ddTHH:mm:ss` (zone-less `LocalDateTime`), or null. */
  dueDate: string | null;
}

/** Body of POST / PUT. `dueDate` is local wall-clock, see lib/local-date-time. */
export interface TodoInput {
  title: string;
  description: string;
  priority: TodoPriority;
  dueDate: string | null;
}

function asPriority(value: unknown): TodoPriority {
  const upper = asString(value).toUpperCase();
  // The server defaults a missing priority to MEDIUM; do the same for unknowns.
  return (TODO_PRIORITIES as readonly string[]).includes(upper)
    ? (upper as TodoPriority)
    : 'MEDIUM';
}

/** Throws without a numeric `todoId`: a row that can't be toggled or edited is dropped. */
export function mapTodo(raw: unknown): Todo {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const todoId = obj.todoId;
  if (typeof todoId !== 'number' || !Number.isFinite(todoId)) {
    throw new TypeError('todo without a numeric todoId');
  }
  return {
    todoId,
    title: asString(obj.title),
    description: asString(obj.description),
    // Boxed Boolean on the server: null counts as active.
    isCompleted: asBoolean(obj.isCompleted),
    priority: asPriority(obj.priority),
    dueDate: normalizeLocalDateTime(obj.dueDate),
  };
}

export function mapTodoList(raw: unknown): Todo[] {
  return safeMapList(extractArray(raw, ['content']), mapTodo, { feature: 'todos', entity: 'todo' });
}

/** The JSON body POST and PUT send. An empty description is sent as "" so an edit can clear it. */
export function toTodoBody(input: TodoInput): Record<string, unknown> {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    priority: input.priority,
    // BMS PUT ignores null fields, so a null here never clears an existing due date.
    dueDate: input.dueDate,
  };
}

function todoPath(id: number): string {
  return `${TODOS_PATH}/${encodeURIComponent(String(id))}`;
}

export async function listTodos(): Promise<Todo[]> {
  const res = await bmsClient.get(TODOS_PATH, { searchParams: TODOS_QUERY }).json<unknown>();
  return mapTodoList(res);
}

export async function createTodo(input: TodoInput): Promise<void> {
  await bmsClient.post(TODOS_PATH, { json: toTodoBody(input) });
}

export async function updateTodo(id: number, input: TodoInput): Promise<void> {
  await bmsClient.put(todoPath(id), { json: toTodoBody(input) });
}

export async function toggleTodo(id: number): Promise<void> {
  await bmsClient.patch(`${todoPath(id)}/toggle`);
}

export async function deleteTodo(id: number): Promise<void> {
  await bmsClient.delete(todoPath(id));
}
