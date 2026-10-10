import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MutationObserver, QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import {
  createTodo,
  deleteTodo,
  listTodos,
  mapTodo,
  mapTodoList,
  toggleTodo,
  updateTodo,
  type Todo,
} from './api/todos-api';
import { toggleTodoOptions } from './hooks/useTodos';
import { getDueStatus } from './lib/due-status';
import {
  formatLocalDateTime,
  normalizeLocalDateTime,
  parseLocalDateTime,
} from './lib/local-date-time';
import { compareTodos, groupTodos, isUrgentTodo, sortTodos } from './lib/todo-order';
import { applyPick, firstPickerStep, nextPickerStep } from './lib/todo-picker';
import { todoSchema } from './lib/todo-schema';

const TODOS = 'https://bms.test.local/api/bms/todos';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Wednesday 14 Oct 2026, 10:00 local. */
const NOW = new Date(2026, 9, 14, 10, 0, 0);

function todo(over: Partial<Todo> & { todoId: number }): Todo {
  return {
    title: `t${over.todoId}`,
    description: '',
    isCompleted: false,
    priority: 'MEDIUM',
    dueDate: null,
    ...over,
  };
}

describe('local date-time serialisation', () => {
  it('formats a Date as local wall-clock yyyy-MM-ddTHH:mm:ss, with no zone', () => {
    expect(formatLocalDateTime(new Date(2026, 0, 5, 7, 3, 9))).toBe('2026-01-05T07:03:09');
  });

  it('parses a zone-less LocalDateTime as that local time', () => {
    const d = parseLocalDateTime('2026-10-14T23:30:00');
    expect(d && [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual(
      [2026, 9, 14, 23, 30],
    );
  });

  it('accepts minutes-only and fractional seconds', () => {
    expect(formatLocalDateTime(parseLocalDateTime('2026-10-14T08:15')!)).toBe(
      '2026-10-14T08:15:00',
    );
    expect(normalizeLocalDateTime('2026-10-14T08:15:42.123456')).toBe('2026-10-14T08:15:42');
  });

  it('rejects empty, malformed, offset-bearing and rolled-over values', () => {
    expect(parseLocalDateTime(null)).toBeUndefined();
    expect(parseLocalDateTime('')).toBeUndefined();
    expect(parseLocalDateTime('soon')).toBeUndefined();
    expect(parseLocalDateTime('2026-10-14T08:15:00Z')).toBeUndefined();
    expect(parseLocalDateTime('2026-02-31T08:00:00')).toBeUndefined();
    expect(normalizeLocalDateTime(42)).toBeNull();
  });

  it('round-trips', () => {
    expect(formatLocalDateTime(parseLocalDateTime('2026-12-31T23:59:59')!)).toBe(
      '2026-12-31T23:59:59',
    );
  });
});

describe('getDueStatus', () => {
  it('is null without a due date', () => {
    expect(getDueStatus(null, NOW)).toBeNull();
    expect(getDueStatus('garbage', NOW)).toBeNull();
  });

  it('counts earlier today as today, not overdue (web parity)', () => {
    expect(getDueStatus('2026-10-14T08:00:00', NOW)).toBe('today');
    expect(getDueStatus('2026-10-14T23:59:00', NOW)).toBe('today');
  });

  it('is overdue before today', () => {
    expect(getDueStatus('2026-10-13T23:59:00', NOW)).toBe('overdue');
  });

  it('is tomorrow on the next local calendar day', () => {
    expect(getDueStatus('2026-10-15T00:00:00', NOW)).toBe('tomorrow');
    expect(getDueStatus('2026-10-15T23:00:00', NOW)).toBe('tomorrow');
  });

  it('is soon within 48h, normal after', () => {
    expect(getDueStatus('2026-10-16T09:00:00', NOW)).toBe('soon');
    expect(getDueStatus('2026-10-16T11:00:00', NOW)).toBe('normal');
  });
});

describe('getDueStatus across time zones', () => {
  const original = process.env.TZ;
  afterEach(() => {
    // Assigning undefined would set the string "undefined" (read as UTC).
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  it.each(['Asia/Riyadh', 'America/Los_Angeles', 'Pacific/Kiritimati'])(
    'reads a late-evening due date on its own local day in %s',
    (zone) => {
      process.env.TZ = zone;
      const now = new Date(2026, 9, 14, 21, 0);
      // A UTC parse would land this on the 14th or 15th depending on the zone;
      // local parsing keeps it on the 14th everywhere.
      expect(getDueStatus('2026-10-14T23:30:00', now)).toBe('today');
      expect(getDueStatus('2026-10-15T00:30:00', now)).toBe('tomorrow');
      expect(formatLocalDateTime(parseLocalDateTime('2026-10-14T23:30:00')!)).toBe(
        '2026-10-14T23:30:00',
      );
    },
  );

  it('runs in the requested offset', () => {
    process.env.TZ = 'Asia/Riyadh';
    expect(new Date(2026, 9, 14).getTimezoneOffset()).toBe(-180);
  });
});

describe('sort and urgency', () => {
  it('sorts by priority HIGH, MEDIUM, LOW, then due date ascending, undated last', () => {
    const list = [
      todo({ todoId: 1, priority: 'LOW', dueDate: '2026-10-14T09:00:00' }),
      todo({ todoId: 2, priority: 'MEDIUM' }),
      todo({ todoId: 3, priority: 'MEDIUM', dueDate: '2026-10-20T09:00:00' }),
      todo({ todoId: 4, priority: 'HIGH' }),
      todo({ todoId: 5, priority: 'MEDIUM', dueDate: '2026-10-18T09:00:00' }),
    ];
    expect(sortTodos(list).map((x) => x.todoId)).toEqual([4, 5, 3, 2, 1]);
    expect(compareTodos(todo({ todoId: 6 }), todo({ todoId: 7 }))).toBe(0);
  });

  it('flags overdue, today, tomorrow and HIGH as urgent; not soon/normal/undated', () => {
    expect(isUrgentTodo(todo({ todoId: 1, dueDate: '2026-10-10T09:00:00' }), NOW)).toBe(true);
    expect(isUrgentTodo(todo({ todoId: 2, dueDate: '2026-10-14T18:00:00' }), NOW)).toBe(true);
    expect(isUrgentTodo(todo({ todoId: 3, dueDate: '2026-10-15T18:00:00' }), NOW)).toBe(true);
    expect(isUrgentTodo(todo({ todoId: 4, priority: 'HIGH' }), NOW)).toBe(true);
    expect(isUrgentTodo(todo({ todoId: 5, dueDate: '2026-10-16T09:00:00' }), NOW)).toBe(false);
    expect(isUrgentTodo(todo({ todoId: 6, dueDate: '2026-11-01T09:00:00' }), NOW)).toBe(false);
    expect(isUrgentTodo(todo({ todoId: 7 }), NOW)).toBe(false);
  });

  it('never flags a completed todo', () => {
    expect(
      isUrgentTodo(
        todo({ todoId: 1, priority: 'HIGH', isCompleted: true, dueDate: '2026-10-01T09:00:00' }),
        NOW,
      ),
    ).toBe(false);
  });

  it('groups urgent out of the main active list and keeps each group sorted', () => {
    const sections = groupTodos(
      [
        todo({ todoId: 1, priority: 'LOW' }),
        todo({ todoId: 2, priority: 'LOW', dueDate: '2026-10-13T09:00:00' }),
        todo({ todoId: 3, priority: 'HIGH' }),
        todo({ todoId: 4, priority: 'MEDIUM' }),
        todo({ todoId: 5, isCompleted: true }),
      ],
      NOW,
    );
    expect(sections.urgent.map((x) => x.todoId)).toEqual([3, 2]);
    expect(sections.active.map((x) => x.todoId)).toEqual([4, 1]);
    expect(sections.completed.map((x) => x.todoId)).toEqual([5]);
  });
});

describe('mappers', () => {
  it('maps TodoItemResponse, normalising priority, isCompleted and dueDate', () => {
    expect(
      mapTodo({
        todoId: 9,
        userId: 'u-1',
        title: 'Call plumber',
        description: null,
        isCompleted: null,
        priority: 'high',
        dueDate: '2026-10-14T16:00',
        createdAt: '2026-10-01T09:00:00',
      }),
    ).toEqual({
      todoId: 9,
      title: 'Call plumber',
      description: '',
      isCompleted: false,
      priority: 'HIGH',
      dueDate: '2026-10-14T16:00:00',
    });
  });

  it('defaults an unknown priority to MEDIUM and a bad dueDate to null', () => {
    const t = mapTodo({ todoId: 1, priority: 'URGENT', dueDate: 'tomorrow', isCompleted: true });
    expect(t.priority).toBe('MEDIUM');
    expect(t.dueDate).toBeNull();
    expect(t.isCompleted).toBe(true);
  });

  it('drops rows without a numeric todoId and unwraps the Page envelope', () => {
    expect(() => mapTodo({ title: 'x' })).toThrow();
    const list = mapTodoList({ content: [{ todoId: 1 }, { todoId: '2' }, null], totalElements: 3 });
    expect(list.map((x) => x.todoId)).toEqual([1]);
  });
});

describe('todos api', () => {
  const INPUT = {
    title: '  Inspect lift  ',
    description: '',
    priority: 'HIGH' as const,
    dueDate: '2026-10-14T23:30:00',
  };

  it('lists the first 100 todos by priority', async () => {
    let url: URL | null = null;
    server.use(
      http.get(TODOS, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json({ content: [{ todoId: 1, title: 'a', priority: 'LOW' }] });
      }),
    );
    const list = await listTodos();
    expect(list.map((x) => x.todoId)).toEqual([1]);
    expect(url!.searchParams.get('page')).toBe('0');
    expect(url!.searchParams.get('size')).toBe('100');
    expect(url!.searchParams.get('sort')).toBe('priority,asc');
  });

  it('POSTs the local wall-clock dueDate unchanged (no UTC conversion)', async () => {
    let body: unknown = null;
    server.use(
      http.post(TODOS, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ todoId: 1 });
      }),
    );
    await createTodo(INPUT);
    expect(body).toEqual({
      title: 'Inspect lift',
      description: '',
      priority: 'HIGH',
      dueDate: '2026-10-14T23:30:00',
    });
  });

  it('PUTs to /{id}', async () => {
    let body: unknown = null;
    server.use(
      http.put(`${TODOS}/7`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ todoId: 7 });
      }),
    );
    await updateTodo(7, { ...INPUT, dueDate: null });
    expect(body).toMatchObject({ title: 'Inspect lift', dueDate: null });
  });

  it('PATCHes /{id}/toggle and DELETEs /{id}', async () => {
    const hits: string[] = [];
    server.use(
      http.patch(`${TODOS}/7/toggle`, () => {
        hits.push('toggle');
        return HttpResponse.json({ todoId: 7, isCompleted: true });
      }),
      http.delete(`${TODOS}/7`, () => {
        hits.push('delete');
        return new HttpResponse(null, { status: 200 });
      }),
    );
    await toggleTodo(7);
    await deleteTodo(7);
    expect(hits).toEqual(['toggle', 'delete']);
  });
});

function setup(): QueryClient {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData<Todo[]>(queryKeys.bms.todosList, [
    todo({ todoId: 1 }),
    todo({ todoId: 2, isCompleted: true }),
  ]);
  qc.setQueryData(queryKeys.bms.todosActive, 1);
  return qc;
}

describe('optimistic toggle', () => {
  it('flips the row immediately and invalidates every todo query, incl. the dashboard KPI', async () => {
    const qc = setup();
    let seenWhileInFlight: boolean | undefined;
    server.use(
      http.patch(`${TODOS}/1/toggle`, () => {
        // The cache is already flipped while the request is still in flight.
        seenWhileInFlight = qc.getQueryData<Todo[]>(queryKeys.bms.todosList)?.[0]?.isCompleted;
        return HttpResponse.json({ todoId: 1 });
      }),
    );
    await new MutationObserver(qc, toggleTodoOptions(qc)).mutate(1);
    expect(seenWhileInFlight).toBe(true);
    expect(qc.getQueryState(queryKeys.bms.todosList)?.isInvalidated).toBe(true);
    expect(qc.getQueryState(queryKeys.bms.todosActive)?.isInvalidated).toBe(true);
  });

  it('rolls back only the failed todo and reports the error', async () => {
    const qc = setup();
    server.use(
      http.patch(`${TODOS}/1/toggle`, () => {
        // Another row changes while this request is in flight (a rapid toggle).
        qc.setQueryData<Todo[]>(queryKeys.bms.todosList, (list) =>
          list?.map((x) => (x.todoId === 2 ? { ...x, isCompleted: false } : x)),
        );
        return HttpResponse.json({ message: 'nope' }, { status: 500 });
      }),
    );
    const failures: Error[] = [];
    const observer = new MutationObserver(
      qc,
      toggleTodoOptions(qc, (error) => failures.push(error)),
    );
    await expect(observer.mutate(1)).rejects.toBeTruthy();
    // Todo 1 is back to active; todo 2 keeps its newer state (a snapshot
    // restore would have reverted it to completed).
    expect(qc.getQueryData<Todo[]>(queryKeys.bms.todosList)?.map((x) => x.isCompleted)).toEqual([
      false,
      false,
    ]);
    expect(failures).toHaveLength(1);
  });

  it('keeps a second, successful toggle of the same todo when the first fails', async () => {
    const qc = setup();
    let calls = 0;
    server.use(
      http.patch(`${TODOS}/1/toggle`, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ message: 'nope' }, { status: 500 })
          : HttpResponse.json({ todoId: 1 });
      }),
    );
    const observer = new MutationObserver(qc, toggleTodoOptions(qc));
    const first = observer.mutate(1).catch(() => {});
    const second = new MutationObserver(qc, toggleTodoOptions(qc)).mutate(1);
    await Promise.all([first, second]);
    // Server toggled once (the second call), so the row ends completed.
    expect(qc.getQueryData<Todo[]>(queryKeys.bms.todosList)?.[0]?.isCompleted).toBe(true);
  });
});

describe('due-date picker steps', () => {
  it('opens one combined dialog on iOS and the day dialog elsewhere', () => {
    expect(firstPickerStep('ios')).toBe('datetime');
    expect(firstPickerStep('android')).toBe('date');
  });

  it('chains date -> time and ends after time or datetime', () => {
    expect(nextPickerStep('date')).toBe('time');
    expect(nextPickerStep('time')).toBeUndefined();
    expect(nextPickerStep('datetime')).toBeUndefined();
  });

  const CURRENT = new Date(2026, 9, 14, 9, 30, 45);
  const PICKED = new Date(2026, 9, 20, 17, 5, 12);

  it('takes only the day from the date dialog', () => {
    expect(formatLocalDateTime(applyPick('date', CURRENT, PICKED))).toBe('2026-10-20T09:30:00');
  });

  it('takes only the time from the time dialog', () => {
    expect(formatLocalDateTime(applyPick('time', CURRENT, PICKED))).toBe('2026-10-14T17:05:00');
  });

  it('takes both from the combined iOS dialog, dropping seconds', () => {
    expect(formatLocalDateTime(applyPick('datetime', CURRENT, PICKED))).toBe('2026-10-20T17:05:00');
  });

  it('does not mutate its inputs', () => {
    const current = new Date(CURRENT);
    applyPick('date', current, PICKED);
    expect(current.getTime()).toBe(CURRENT.getTime());
  });
});

describe('todo form schema', () => {
  it('requires a non-blank title', () => {
    const res = todoSchema.safeParse({
      title: '   ',
      description: '',
      priority: 'MEDIUM',
      dueDate: null,
    });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]?.message).toBe('fm.todos.titleRequired');
  });

  it('accepts a minimal todo', () => {
    expect(
      todoSchema.safeParse({ title: 'x', description: '', priority: 'LOW', dueDate: null }).success,
    ).toBe(true);
  });
});
