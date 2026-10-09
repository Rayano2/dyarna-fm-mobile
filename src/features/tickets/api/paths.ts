/**
 * bms-tms ticket routes, relative to `ENV.TMS_BASE_URL` (tmsClient).
 *
 * Two identifiers, never interchangeable:
 * - `{ticketNumber}` (e.g. EL-000001): `TicketController` detail, status, assign.
 * - `{ticketId}` (numeric Long): `TicketCommentController` and
 *   `TicketAttachmentController`. Spring rejects a ticket number there with a
 *   400, so these routes take the numeric id from the detail response. (The FM
 *   web passes the number to them; that is a web bug, not the contract.)
 */
const TICKETS = 'api/tms/tickets';

const enc = (v: string): string => encodeURIComponent(v);

export const ticketPaths = {
  list: TICKETS,
  companyDetail: (ticketNumber: string): string => `${TICKETS}/company/${enc(ticketNumber)}`,
  status: (ticketNumber: string): string => `${TICKETS}/${enc(ticketNumber)}/status`,
  assign: (ticketNumber: string): string => `${TICKETS}/${enc(ticketNumber)}/assign`,
  comments: (ticketId: number): string => `${TICKETS}/${ticketId}/comments`,
  companyAttachments: (ticketId: number): string => `${TICKETS}/${ticketId}/attachments/company`,
} as const;

/** BMS route (bmsClient): projects with their buildings for the company rep. */
export const PROJECTS_BUILDINGS_FILTER_PATH = 'api/bms/company-reps/projects-buildings-filter';
