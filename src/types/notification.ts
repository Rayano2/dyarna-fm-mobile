/**
 * In-app notification inbox (BMS-TMS `api/bms/notifications`).
 *
 * Two server-side realities shape this model:
 *
 * 1. `title` / `body` come off `NotificationType.java` as HARDCODED ENGLISH
 *    templates. They are kept here as `serverTitle` / `serverBody` and are
 *    only rendered when `type` is one the client doesn't know — otherwise
 *    the copy is built client-side from `type` + `metadata` so an Arabic UI
 *    never shows an English row. See `lib/notification-meta.ts`.
 * 2. `createdAt` is a Java `LocalDateTime`, serialised WITHOUT an offset.
 *    The API mapper appends `Z` before it reaches this type, so `createdAt`
 *    here is always safe to hand to `new Date()`. See `toUtcIso`.
 */

/** Every `NotificationType` the backend enum can emit today. */
export const KNOWN_NOTIFICATION_TYPES = [
  'TICKET_CREATED',
  'TICKET_ASSIGNED',
  'TICKET_STATUS_CHANGED',
  'TICKET_COMMENT_ADDED',
  'TICKET_RESOLVED',
  'TICKET_CLOSED',
  'TICKET_REOPENED',
  'TICKET_ESCALATED',
  'TICKET_DUE_SOON',
  'RESIDENT_LINK_REQUEST_CREATED',
] as const;

export type KnownNotificationType = (typeof KNOWN_NOTIFICATION_TYPES)[number];

/**
 * Free-form `Map<String, Object>` on the wire. Only the keys the backend
 * actually writes are modelled: ticket events put `ticketNumber` (+
 * `oldStatus`/`newStatus` on a status change), and the resident-link
 * listener puts `requestId`/`residentName`/`buildingName`/`buildingCode`/
 * `unitNumber`. Everything is coerced to a string — the client only ever
 * interpolates these into copy.
 */
export interface NotificationMetadata {
  ticketNumber?: string;
  oldStatus?: string;
  newStatus?: string;
  residentName?: string;
  buildingName?: string;
  buildingCode?: string;
  unitNumber?: string;
  requestId?: string;
}

export interface AppNotification {
  id: string;
  /** Raw server type — deliberately NOT narrowed to `KnownNotificationType`
   *  so a type added to the backend later still maps instead of throwing. */
  type: string;
  /** Server-rendered English title. Fallback copy only. */
  serverTitle: string;
  /** Server-rendered English body. Fallback copy only. */
  serverBody: string;
  isRead: boolean;
  /** ISO-8601 carrying an offset (normalised by the mapper), or undefined. */
  createdAt: string | undefined;
  ticketId: number | undefined;
  metadata: NotificationMetadata;
}

/** One page of the Spring `Page<NotificationResponse>` response. */
export interface NotificationPage {
  notifications: AppNotification[];
  /** Zero-based page index this batch came from. */
  page: number;
  hasMore: boolean;
}
