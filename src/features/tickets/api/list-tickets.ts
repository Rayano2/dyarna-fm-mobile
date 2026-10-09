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
export function buildListSearchParams(
  filters: TicketListFilters,
  page: number,
  size: number = TICKETS_PAGE_SIZE,
): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (filters.status !== 'ALL') params.set('status', filters.status);
  params.set('sort', `${filters.sortField},${filters.sortDir}`);
  const ticketNo = filters.ticketNo.trim();
  if (ticketNo) params.set('ticketNo', ticketNo);
  if (filters.projectId !== null) params.set('projectId', String(filters.projectId));
  if (filters.buildingCode) params.set('buildingCode', filters.buildingCode);
  return params;
}

export async function listTickets(filters: TicketListFilters, page: number): Promise<TicketsPage> {
  const raw = await tmsClient
    .get(ticketPaths.list, { searchParams: buildListSearchParams(filters, page) })
    .json<unknown>();
  return mapTicketsPage(raw, page);
}
