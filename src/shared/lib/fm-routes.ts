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
 * One ticket. The Tickets tab reads `?id=` (BMS `ticketId`). If the tickets
 * feature moves to a `tickets/[number]` route, this is the only place to change.
 */
export function fmTicketDestination(ticketId: number): FmDestination {
  return { href: `/tickets?id=${encodeURIComponent(String(ticketId))}`, method: 'navigate' };
}
