import { tmsClient } from '@/shared/api/clients';
import type { TicketListFilters, TicketsPage } from '../types';
import { mapTicketsPage } from './mappers';
import { ticketPaths } from './paths';

export const TICKETS_PAGE_SIZE = 15;

/**
 * `GET api/tms/tickets`. The company comes from the JWT principal
 * (`TicketController.getAllTickets` -> `jwtUtil.getUserIdFromJwtToken()`), so
 * no `companyId` is sent: the endpoint has no such parameter.
 */
/**
 * A plain record, never a `URLSearchParams`: React Native's URLSearchParams
 * polyfill can't be copy-constructed, so ky silently dropped every param when
 * handed an instance (FM #110 item 4 -- filters were ignored on device).
 */
export function buildListSearchParams(
  filters: TicketListFilters,
  page: number,
  size: number = TICKETS_PAGE_SIZE,
): Record<string, string | number> {
  const params: Record<string, string | number> = { page, size };
  if (filters.status !== 'ALL') params.status = filters.status;
  params.sort = `${filters.sortField},${filters.sortDir}`;
  const ticketNo = filters.ticketNo.trim();
  if (ticketNo) params.ticketNo = ticketNo;
  if (filters.projectId !== null) params.projectId = filters.projectId;
  if (filters.buildingCode) params.buildingCode = filters.buildingCode;
  return params;
}

export async function listTickets(filters: TicketListFilters, page: number): Promise<TicketsPage> {
  const raw = await tmsClient
    .get(ticketPaths.list, { searchParams: buildListSearchParams(filters, page) })
    .json<unknown>();
  return mapTicketsPage(raw, page);
}
