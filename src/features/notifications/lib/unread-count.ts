import type { AppNotification, NotificationPage } from '@/types/notification';

/** The shape TanStack Query stores for the notifications infinite query.
 *  Declared locally so these reducers stay pure and unit-testable without a
 *  QueryClient. */
export interface NotificationPagesData {
  pages: NotificationPage[];
  pageParams: unknown[];
}

/**
 * Optimistic badge decrement. Clamped at zero because the cached count can
 * legitimately lag the list (the count is refetched on focus, the list is
 * not), and a negative badge is worse than a stale one.
 */
export function decrementUnreadCount(current: number | undefined): number {
  if (typeof current !== 'number' || !Number.isFinite(current)) return 0;
  return Math.max(0, Math.trunc(current) - 1);
}

function flip(notification: AppNotification): AppNotification {
  return { ...notification, isRead: true };
}

/**
 * Flip one row to read across every loaded page.
 *
 * Returns the SAME reference when nothing changed (row absent, or already
 * read). Callers use that identity check to decide whether the unread count
 * should drop: re-tapping an already-read row must not decrement the badge.
 */
export function markReadInPages(
  data: NotificationPagesData | undefined,
  id: string,
): NotificationPagesData | undefined {
  if (!data) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    if (!page.notifications.some((n) => n.id === id && !n.isRead)) return page;
    changed = true;
    return {
      ...page,
      notifications: page.notifications.map((n) => (n.id === id && !n.isRead ? flip(n) : n)),
    };
  });
  return changed ? { ...data, pages } : data;
}

/** Flip every loaded row to read. Same identity contract as `markReadInPages`. */
export function markAllReadInPages(
  data: NotificationPagesData | undefined,
): NotificationPagesData | undefined {
  if (!data) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    if (!page.notifications.some((n) => !n.isRead)) return page;
    changed = true;
    return { ...page, notifications: page.notifications.map((n) => (n.isRead ? n : flip(n))) };
  });
  return changed ? { ...data, pages } : data;
}

/** Unread rows currently loaded. Only used by tests and diagnostics — the
 *  badge is server-backed, not derived from the loaded pages (later pages
 *  may hold unread rows that were never fetched). */
export function countUnreadInPages(data: NotificationPagesData | undefined): number {
  if (!data) return 0;
  return data.pages.reduce(
    (total, page) => total + page.notifications.filter((n) => !n.isRead).length,
    0,
  );
}
