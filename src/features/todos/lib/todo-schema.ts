import { z } from 'zod';
import { TODO_PRIORITIES, type Todo } from '../api/todos-api';

/** `todo_items.title` is VARCHAR(255). */
export const TITLE_MAX = 255;

export const todoSchema = z.object({
  title: z.string().trim().min(1, { error: 'fm.todos.titleRequired' }).max(TITLE_MAX),
  description: z.string(),
  priority: z.enum(TODO_PRIORITIES),
  /** Local wall-clock `yyyy-MM-ddTHH:mm:ss`, or null for no due date. */
  dueDate: z.string().nullable(),
});

export type TodoFormInput = z.input<typeof todoSchema>;
export type TodoFormValues = z.output<typeof todoSchema>;

export const EMPTY_TODO: TodoFormInput = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  dueDate: null,
};

export function todoToForm(todo: Todo): TodoFormInput {
  return {
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    dueDate: todo.dueDate,
  };
}
