/**
 * Where an FM screen sends the user, as data rather than a router call so the
 * mapping stays pure and unit-testable.
 *
 * Tickets and Requests are TABS: `navigate` switches to the existing tab
 * instead of stacking a second copy. Everything reached from More is pushed.
 */
export interface FmDestination {
  href: string;
  method: 'navigate' | 'push';
}

export const FM_TICKETS: FmDestination = { href: '/tickets', method: 'navigate' };
export const FM_REQUESTS: FmDestination = { href: '/requests', method: 'navigate' };
export const FM_PROPERTIES: FmDestination = { href: '/properties', method: 'push' };
export const FM_TODOS: FmDestination = { href: '/todos', method: 'push' };

/**
 * One ticket, by its NUMBER (`tktNumber` / notification `metadata.ticketNumber`):
 * pushes the `tickets/[number]` detail. Without a number, the Tickets tab.
 */
export function fmTicketDestination(ticketNumber?: string): FmDestination {
  const number = ticketNumber?.trim();
  if (!number) return FM_TICKETS;
  return { href: `/tickets/${encodeURIComponent(number)}`, method: 'push' };
}
