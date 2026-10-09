import type { Icons } from '@/shared/ui';
import {
  FM_REQUESTS,
  FM_TICKETS,
  fmTicketDestination,
  type FmDestination,
} from '@/shared/lib/fm-routes';
import type {
  AppNotification,
  KnownNotificationType,
  NotificationMetadata,
} from '@/types/notification';

/**
 * Ported from dyarna-rn `features/notifications/lib/notification-meta.ts`.
 * FM changes: ticket/UserPlus/Bell glyphs, an "urgent" flag for escalations
 * and SLA warnings, and destinations resolved to FM routes (ticket by
 * `ticketId`, else the Tickets tab; resident links go to Requests).
 */

/**
 * Minimal shape of i18next's `t`, plus an interpolation bag. `options` is
 * REQUIRED (pass `{}`): i18next's overloads are not assignable to a signature
 * whose options accept `undefined` under `exactOptionalPropertyTypes`.
 */
export type NotificationTranslator = (key: string, options: Record<string, unknown>) => string;

export type NotificationIconName = keyof typeof Icons;

interface NotificationTypeMeta {
  /** Glyph NAME, resolved via `Icons[name]` at the call site so this module
   *  stays free of React Native imports. */
  icon: NotificationIconName;
  /** Metadata keys the localized copy interpolates. When one is missing the
   *  row falls back to the server copy rather than render a raw `{{x}}`. */
  requiredMetadata: readonly (keyof NotificationMetadata)[];
}

const NOTIFICATION_META: Record<KnownNotificationType, NotificationTypeMeta> = {
  TICKET_CREATED: { icon: 'Ticket', requiredMetadata: ['ticketNumber'] },
  TICKET_ASSIGNED: { icon: 'Ticket', requiredMetadata: ['ticketNumber'] },
  TICKET_COMMENT_ADDED: { icon: 'Ticket', requiredMetadata: ['ticketNumber'] },
  TICKET_STATUS_CHANGED: {
    icon: 'Ticket',
    requiredMetadata: ['ticketNumber', 'oldStatus', 'newStatus'],
  },
  TICKET_REOPENED: { icon: 'Ticket', requiredMetadata: ['ticketNumber'] },
  TICKET_RESOLVED: { icon: 'Ticket', requiredMetadata: ['ticketNumber'] },
  TICKET_CLOSED: { icon: 'Ticket', requiredMetadata: ['ticketNumber'] },
  TICKET_ESCALATED: { icon: 'Ticket', requiredMetadata: ['ticketNumber'] },
  TICKET_DUE_SOON: { icon: 'Ticket', requiredMetadata: ['ticketNumber'] },
  RESIDENT_LINK_REQUEST_CREATED: {
    icon: 'UserPlus',
    requiredMetadata: ['residentName', 'unitNumber', 'buildingName'],
  },
};

const URGENT_TYPES: ReadonlySet<string> = new Set(['TICKET_ESCALATED', 'TICKET_DUE_SOON']);

export function notificationTypeMeta(type: string): NotificationTypeMeta | undefined {
  return (NOTIFICATION_META as Record<string, NotificationTypeMeta | undefined>)[type];
}

export function isKnownNotificationType(type: string): type is KnownNotificationType {
  return notificationTypeMeta(type) !== undefined;
}

/** Any ticket-family type, including ones the client doesn't know yet. */
export function isTicketNotification(type: string): boolean {
  return type.startsWith('TICKET_');
}

/** Unknown types still get a row: a generic bell beats a blank slot. */
export function notificationIconName(type: string): NotificationIconName {
  if (isTicketNotification(type)) return 'Ticket';
  return notificationTypeMeta(type)?.icon ?? 'Bell';
}

/** Escalations and SLA warnings render their glyph in the error colour. */
export function isUrgentNotification(type: string): boolean {
  return URGENT_TYPES.has(type);
}

export function hasRequiredMetadata(type: string, metadata: NotificationMetadata): boolean {
  const meta = notificationTypeMeta(type);
  if (!meta) return false;
  return meta.requiredMetadata.every((key) => metadata[key] !== undefined);
}

/** Where tapping the row goes, or null when there is nowhere to send the user. */
export function notificationDestination(notification: AppNotification): FmDestination | null {
  if (isTicketNotification(notification.type)) {
    return notification.ticketId === undefined
      ? FM_TICKETS
      : fmTicketDestination(notification.ticketId);
  }
  if (notification.type === 'RESIDENT_LINK_REQUEST_CREATED') return FM_REQUESTS;
  return null;
}

/** What a tap does: flip the read flag (only when unread) and where to go. */
export interface NotificationPressAction {
  markRead: boolean;
  destination: FmDestination | null;
}

export function notificationPressAction(notification: AppNotification): NotificationPressAction {
  return {
    markRead: !notification.isRead,
    destination: notificationDestination(notification),
  };
}

/** `725` -> `#725`; non-numeric identifiers pass through. */
export function formatTicketNumber(value: string): string {
  if (!value) return '';
  if (/^\d/.test(value)) return `#${value}`;
  return value;
}

/** Raw status codes are translated so an Arabic body doesn't read IN_PROGRESS. */
function localizedStatus(code: string, t: NotificationTranslator): string {
  const key = `notifications.status.${code}`;
  const translated = t(key, {});
  return translated === key ? code : translated;
}

function interpolationValues(
  metadata: NotificationMetadata,
  t: NotificationTranslator,
): Record<string, string> {
  const values: Record<string, string> = {};
  if (metadata.ticketNumber !== undefined) {
    values.ticketNumber = formatTicketNumber(metadata.ticketNumber);
  }
  if (metadata.oldStatus !== undefined) values.oldStatus = localizedStatus(metadata.oldStatus, t);
  if (metadata.newStatus !== undefined) values.newStatus = localizedStatus(metadata.newStatus, t);
  if (metadata.residentName !== undefined) values.residentName = metadata.residentName;
  if (metadata.unitNumber !== undefined) values.unitNumber = metadata.unitNumber;
  if (metadata.buildingName !== undefined) values.buildingName = metadata.buildingName;
  return values;
}

/** True when the client owns the copy; false means render the server's English. */
export function usesLocalizedCopy(notification: AppNotification): boolean {
  return (
    isKnownNotificationType(notification.type) &&
    hasRequiredMetadata(notification.type, notification.metadata)
  );
}

export function notificationTitle(
  notification: AppNotification,
  t: NotificationTranslator,
): string {
  if (!usesLocalizedCopy(notification)) return notification.serverTitle;
  return t(`notifications.types.${notification.type}.title`, {});
}

export function notificationBody(notification: AppNotification, t: NotificationTranslator): string {
  if (!usesLocalizedCopy(notification)) return notification.serverBody;
  return t(
    `notifications.types.${notification.type}.body`,
    interpolationValues(notification.metadata, t),
  );
}
