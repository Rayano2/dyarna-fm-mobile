/**
 * BMS-TMS `TodoItemController`, served under `api/bms/todos` (BMS 3b415db)
 * so the prod gateway routes it like every other BMS call.
 *
 * Kept in its own dependency-free module so the dashboard's "My tasks" KPI can
 * import it (an allowed deep import, see eslint.config.mjs) without dragging
 * the todos screen's React Native components into node-tested code.
 */
export const TODOS_PATH = 'api/bms/todos';

/**
 * Same query the web runs: first 100 todos. The server sorts `priority` as a
 * string (HIGH, LOW, MEDIUM), so the screen re-sorts by rank client-side.
 */
export const TODOS_QUERY = { page: 0, size: 100, sort: 'priority,asc' } as const;
