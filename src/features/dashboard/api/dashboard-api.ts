import { bmsClient } from '@/shared/api/clients';
import {
  asBoolean,
  asIntLoose,
  asString,
  asStringOrUndef,
  extractArray,
} from '@/shared/api/coerce';
import { safeMapList } from '@/shared/api/safe-map';
import { toUtcIso } from '@/shared/lib/to-utc-iso';

/**
 * BMS-TMS `CompanyRepresentativeController` (`api/bms/company-reps`) ->
 * `GET /dashboardInfo`, returning `DashboardInfoResponse`.
 */
export const DASHBOARD_INFO_PATH = 'api/bms/company-reps/dashboardInfo';

/**
 * BMS-TMS `TodoItemController` is mapped at the ROOT (`/todos`), with no `api/`
 * prefix. FM web reaches it through its own proxy (`/api/todos` -> `/todos`).
 */
export const TODOS_PATH = 'todos';

/** Same query the web dashboard runs: first 100 todos, by priority. */
const TODOS_QUERY = { page: 0, size: 100, sort: 'priority,asc' } as const;

/** One `topOpenTickets` row (BMS `TicketResponse`, the fields the card shows). */
export interface DashboardTicket {
  ticketId: number;
  tktNumber: string;
  statusCode: string;
  priorityCode: string;
  title: string;
  description: string;
  buildingName: string;
  /** ISO-8601 with an offset (LocalDateTime normalised to UTC), or undefined. */
  createdAt: string | undefined;
  categoryNameAr: string;
  categoryNameEn: string;
  assignedTo: string;
}

export interface DashboardInfo {
  openMaintenanceTicketsCount: number;
  pendingResidentRequestsCount: number;
  activeUnitsCount: number;
  topOpenTickets: DashboardTicket[];
}

function count(value: unknown): number {
  return Math.max(0, asIntLoose(value));
}

/** Throws without a numeric `ticketId`: a row that can't be opened is dropped. */
export function mapDashboardTicket(raw: unknown): DashboardTicket {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const ticketId = obj.ticketId;
  if (typeof ticketId !== 'number' || !Number.isFinite(ticketId)) {
    throw new TypeError('dashboard ticket without a numeric ticketId');
  }
  return {
    ticketId,
    tktNumber: asString(obj.tktNumber),
    statusCode: asString(obj.statusCode),
    priorityCode: asString(obj.priorityCode),
    title: asString(obj.title),
    description: asString(obj.description),
    buildingName: asString(obj.buildingName),
    createdAt: toUtcIso(asStringOrUndef(obj.createdAt)),
    categoryNameAr: asString(obj.categoryNameAr),
    categoryNameEn: asString(obj.categoryNameEn),
    assignedTo: asString(obj.assignedTo),
  };
}

export function mapDashboardInfo(raw: unknown): DashboardInfo {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    openMaintenanceTicketsCount: count(obj.openMaintenanceTicketsCount),
    pendingResidentRequestsCount: count(obj.pendingResidentRequestsCount),
    activeUnitsCount: count(obj.activeUnitsCount),
    topOpenTickets: safeMapList(extractArray(obj.topOpenTickets, []), mapDashboardTicket, {
      feature: 'dashboard',
      entity: 'ticket',
    }),
  };
}

/** Todos not yet completed. `isCompleted` is a boxed Boolean: null counts as active. */
export function countActiveTodos(raw: unknown): number {
  return extractArray(raw, ['content']).filter((item) => {
    const obj = (item ?? {}) as Record<string, unknown>;
    return !asBoolean(obj.isCompleted);
  }).length;
}

export async function getDashboardInfo(): Promise<DashboardInfo> {
  const res = await bmsClient.get(DASHBOARD_INFO_PATH).json<unknown>();
  return mapDashboardInfo(res);
}

export async function getActiveTodoCount(): Promise<number> {
  const res = await bmsClient.get(TODOS_PATH, { searchParams: TODOS_QUERY }).json<unknown>();
  return countActiveTodos(res);
}
