import { bmsClient } from '@/shared/api/clients';
import { asBoolean, asString, asStringOrUndef, extractArray } from '@/shared/api/coerce';
import { safeMapList } from '@/shared/api/safe-map';
import { toUtcIso } from '@/shared/lib/to-utc-iso';
import type { AppNotification, NotificationMetadata, NotificationPage } from '@/types/notification';

/**
 * The notification endpoints live in the BMS-TMS service (package
 * `admin/notification`), so they go over `bmsClient` — NOT `communityClient`,
 * whose base URL is a different host in `.env.local`. `bmsClient` and
 * `tmsClient` resolve to the same origin in every env; `bms` is used because
 * the controller sits outside the `tms` package.
 *
 * The PREFIX is load-bearing, not cosmetic. In production every service sits
 * behind one Caddy gateway (`api.dyarna.sa`) that routes by path prefix, and
 * `/api/v1/*` is Community Layer's namespace — so the original
 * `api/v1/notifications` was dispatched to the wrong service entirely, no
 * matter which client sent it. BMS-TMS is reachable only under `api/bms/*` /
 * `api/tms/*`, which is what every other bms/tms call in the app uses.
 *
 * Every notification URL is built from this one constant, so if the route
 * moves again it moves in exactly one place.
 */
export const NOTIFICATIONS_BASE_PATH = 'api/bms/notifications';

/**
 * The unread-count path, exported so it exists exactly once. The transport
 * layer exempts this specific endpoint from the forced-logout-on-401 rule
 * (see `shared/api/interceptors/error.ts`), and `interceptors.test.ts`
 * asserts the two agree — so renaming this route fails a test instead of
 * silently un-exempting the badge.
 */
export const NOTIFICATIONS_UNREAD_COUNT_PATH = `${NOTIFICATIONS_BASE_PATH}/unread-count`;

/** Server default is 20 and it caps the requested size; match it. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

const METADATA_KEYS = [
  'ticketNumber',
  'oldStatus',
  'newStatus',
  'residentName',
  'buildingName',
  'buildingCode',
  'unitNumber',
  'requestId',
] as const satisfies readonly (keyof NotificationMetadata)[];

/** Metadata is `Map<String, Object>`: a ticket number can arrive as either a
 *  JSON string or a number depending on the caller. Both become a string. */
function metadataValue(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

export function mapMetadata(raw: unknown): NotificationMetadata {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const out: NotificationMetadata = {};
  for (const key of METADATA_KEYS) {
    const value = metadataValue(obj, key);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function mapNotification(raw: unknown): AppNotification {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    id: asString(obj.id),
    type: asString(obj.type),
    serverTitle: asString(obj.title),
    serverBody: asString(obj.body),
    isRead: asBoolean(obj.isRead),
    createdAt: toUtcIso(asStringOrUndef(obj.createdAt)),
    ticketId: typeof obj.ticketId === 'number' ? obj.ticketId : undefined,
    metadata: mapMetadata(obj.metadata),
  };
}

/**
 * Spring's `Page` wrapper exposes `last`; fall back to `totalPages`, then to
 * "the server filled the page" so pagination still terminates if the wrapper
 * shape changes. Counted against the RAW item count, not the mapped one — a
 * row dropped by `safeMapList` must not end the list early.
 */
function resolveHasMore(
  obj: Record<string, unknown>,
  page: number,
  received: number,
  requestedSize: number,
): boolean {
  if (typeof obj.last === 'boolean') return !obj.last;
  if (typeof obj.totalPages === 'number') return page + 1 < obj.totalPages;
  return received > 0 && received >= requestedSize;
}

export function mapNotificationPage(
  res: unknown,
  requestedPage: number,
  requestedSize: number,
): NotificationPage {
  const items = extractArray(res, ['content', 'data', 'notifications']);
  const notifications = safeMapList(items, mapNotification, {
    feature: 'notifications',
    entity: 'notification',
  });
  const obj = (res && typeof res === 'object' ? res : {}) as Record<string, unknown>;
  const page = typeof obj.number === 'number' ? obj.number : requestedPage;
  return {
    notifications,
    page,
    hasMore: resolveHasMore(obj, page, items.length, requestedSize),
  };
}

/** `GET api/bms/notifications?page=&size=` — server orders by createdAt DESC. */
export async function listNotifications(page: number): Promise<NotificationPage> {
  const res = await bmsClient
    .get(NOTIFICATIONS_BASE_PATH, { searchParams: { page, size: NOTIFICATIONS_PAGE_SIZE } })
    .json<unknown>();
  return mapNotificationPage(res, page, NOTIFICATIONS_PAGE_SIZE);
}

/** `GET api/bms/notifications/unread-count` → `{ unreadCount: number }`. */
export function readUnreadCount(res: unknown): number {
  const obj = (res ?? {}) as Record<string, unknown>;
  const count = obj.unreadCount;
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return 0;
  return Math.trunc(count);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await bmsClient.get(NOTIFICATIONS_UNREAD_COUNT_PATH).json<unknown>();
  return readUnreadCount(res);
}

/** `PATCH api/bms/notifications/{id}/read`. Response body is ignored — the
 *  cache was already flipped optimistically. */
export async function markNotificationRead(id: string): Promise<void> {
  await bmsClient.patch(`${NOTIFICATIONS_BASE_PATH}/${encodeURIComponent(id)}/read`);
}

/** `PATCH api/bms/notifications/read-all`. */
export async function markAllNotificationsRead(): Promise<void> {
  await bmsClient.patch(`${NOTIFICATIONS_BASE_PATH}/read-all`);
}
