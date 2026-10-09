import { Skeleton } from '@/shared/ui';

/** Loading placeholder row for the notification inbox. Mirrors
 *  `TicketRowSkeleton`'s role, sized to a NotificationCard (glyph + 2-line
 *  title + 2-line body + footer ≈ 84px) so the list doesn't jump when the
 *  real rows land. */
export function NotificationRowSkeleton() {
  return <Skeleton height={84} radius={12} />;
}
