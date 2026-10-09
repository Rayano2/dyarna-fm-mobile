import { tmsClient } from '@/shared/api/clients';
import { ticketPaths } from './paths';

/**
 * `PATCH api/tms/tickets/{ticketNumber}/assign?userId=`. Self-assign only (as
 * the web). The backend moves an OPEN ticket to IN_PROGRESS on assignment.
 */
export async function assignTicket(ticketNumber: string, userId: string): Promise<void> {
  await tmsClient.patch(ticketPaths.assign(ticketNumber), { searchParams: { userId } });
}
