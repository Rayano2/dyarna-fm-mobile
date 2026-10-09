import { tmsClient } from '@/shared/api/clients';
import type { TicketComment } from '../types';
import { mapComments } from './mappers';
import { ticketPaths } from './paths';

/** `GET api/tms/tickets/{ticketId}/comments` (numeric id). Returns a bare list today; `content` is tolerated. */
export async function listTicketComments(ticketId: number): Promise<TicketComment[]> {
  const raw = await tmsClient.get(ticketPaths.comments(ticketId)).json<unknown>();
  return mapComments(raw);
}
