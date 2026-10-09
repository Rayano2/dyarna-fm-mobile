import { tmsClient } from '@/shared/api/clients';
import { ApiError } from '@/shared/api/errors';
import type { FmTicketDetail } from '../types';
import { mapTicketDetail } from './mappers';
import { ticketPaths } from './paths';

/** bms-tms `TICKET_NOT_FOUND` business code. Sent with HTTP 400 (BusinessValidationException). */
export const TICKET_NOT_FOUND_CODE = 'TMS_404_01';

/**
 * A missing ticket, or one owned by another company, is "not found": either a
 * real 404 or the bms-tms business code `TMS_404_01` (which arrives as a 400).
 */
export function isTicketNotFoundError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === 404 || error.code === TICKET_NOT_FOUND_CODE;
}

export async function getTicket(ticketNumber: string): Promise<FmTicketDetail> {
  const raw = await tmsClient.get(ticketPaths.companyDetail(ticketNumber)).json<unknown>();
  return mapTicketDetail(raw);
}
