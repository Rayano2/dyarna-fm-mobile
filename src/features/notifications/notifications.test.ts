import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MutationObserver, QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import type { AppNotification } from '@/types/notification';
import { mapNotification } from './api/notifications-api';
import { markAllReadMutationOptions } from './hooks/useMarkAllNotificationsRead';
import { markReadMutationOptions } from './hooks/useMarkNotificationRead';
import { notificationIconName, notificationPressAction } from './lib/notification-meta';
import { countUnreadInPages, type NotificationPagesData } from './lib/unread-count';

const BASE = 'https://bms.test.local/api/bms/notifications';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    type: 'TICKET_ASSIGNED',
    serverTitle: 'Ticket Assigned',
    serverBody: 'Ticket #725 has been assigned',
    isRead: false,
    createdAt: '2026-08-21T09:15:00Z',
    ticketId: 42,
    metadata: { ticketNumber: '725' },
    ...overrides,
  };
}

function seed(client: QueryClient, rows: AppNotification[], count: number): void {
  const data: NotificationPagesData = {
    pages: [{ notifications: rows, page: 0, hasMore: false }],
    pageParams: [0],
  };
  client.setQueryData(queryKeys.bms.notificationsList, data);
  client.setQueryData(queryKeys.bms.notificationsUnreadCount, count);
}

function pages(client: QueryClient): NotificationPagesData | undefined {
  return client.getQueryData<NotificationPagesData>(queryKeys.bms.notificationsList);
}

function newClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
}

describe('notification tap -> mark read + route', () => {
  it('unread ticket with ticketId: marks read and opens that ticket', () => {
    expect(notificationPressAction(makeNotification())).toEqual({
      markRead: true,
      destination: { href: '/tickets?id=42', method: 'navigate' },
    });
  });

  it('ticket without ticketId opens the Tickets tab', () => {
    expect(notificationPressAction(makeNotification({ ticketId: undefined })).destination).toEqual({
      href: '/tickets',
      method: 'navigate',
    });
  });

  it('resident link request opens Requests; unknown types go nowhere', () => {
    const resident = makeNotification({
      type: 'RESIDENT_LINK_REQUEST_CREATED',
      ticketId: undefined,
    });
    expect(notificationPressAction(resident).destination).toEqual({
      href: '/requests',
      method: 'navigate',
    });
    expect(notificationPressAction(makeNotification({ type: 'SOMETHING_NEW' })).destination).toBe(
      null,
    );
  });

  it('an already-read row does not mark read again but still navigates', () => {
    const action = notificationPressAction(makeNotification({ isRead: true }));
    expect(action.markRead).toBe(false);
    expect(action.destination?.href).toBe('/tickets?id=42');
  });

  it('picks the spec glyphs', () => {
    expect(notificationIconName('TICKET_ESCALATED')).toBe('Ticket');
    expect(notificationIconName('TICKET_FUTURE_TYPE')).toBe('Ticket');
    expect(notificationIconName('RESIDENT_LINK_REQUEST_CREATED')).toBe('UserPlus');
    expect(notificationIconName('OTHER')).toBe('Bell');
  });

  it('mark read PATCHes {id}/read and flips the row + count optimistically', async () => {
    const client = newClient();
    seed(client, [makeNotification(), makeNotification({ id: 'n2' })], 2);
    let patched = '';
    server.use(
      http.patch(`${BASE}/:id/read`, ({ params }) => {
        patched = String(params.id);
        return HttpResponse.json({});
      }),
    );

    await new MutationObserver(client, markReadMutationOptions(client)).mutate('n1');

    expect(patched).toBe('n1');
    expect(pages(client)?.pages[0]?.notifications.map((n) => n.isRead)).toEqual([true, false]);
    expect(client.getQueryData(queryKeys.bms.notificationsUnreadCount)).toBe(1);
  });

  it('mark read failure rolls back the row and the count', async () => {
    const client = newClient();
    seed(client, [makeNotification()], 5);
    server.use(http.patch(`${BASE}/:id/read`, () => HttpResponse.json({}, { status: 500 })));

    const observer = new MutationObserver(client, markReadMutationOptions(client));
    await expect(observer.mutate('n1')).rejects.toBeDefined();

    expect(pages(client)?.pages[0]?.notifications[0]?.isRead).toBe(false);
    expect(client.getQueryData(queryKeys.bms.notificationsUnreadCount)).toBe(5);
  });
});

describe('mark all read', () => {
  it('flips every row and zeroes the count optimistically, then keeps it on success', async () => {
    const client = newClient();
    seed(client, [makeNotification(), makeNotification({ id: 'n2' })], 2);
    let calls = 0;
    server.use(
      http.patch(`${BASE}/read-all`, () => {
        calls += 1;
        return HttpResponse.json({ updated: 2 });
      }),
    );

    await new MutationObserver(client, markAllReadMutationOptions(client)).mutate();

    expect(calls).toBe(1);
    expect(countUnreadInPages(pages(client))).toBe(0);
    expect(client.getQueryData(queryKeys.bms.notificationsUnreadCount)).toBe(0);
  });

  it('rolls back rows and count when the server fails', async () => {
    const client = newClient();
    const rows = [makeNotification(), makeNotification({ id: 'n2', isRead: true })];
    seed(client, rows, 120);
    // Captured while the request is in flight (asserting inside the handler
    // would be swallowed: msw turns a throw into a 500).
    let inFlight: { unreadRows: number; count: unknown } | null = null;
    server.use(
      http.patch(`${BASE}/read-all`, () => {
        inFlight = {
          unreadRows: countUnreadInPages(pages(client)),
          count: client.getQueryData(queryKeys.bms.notificationsUnreadCount),
        };
        return HttpResponse.json({ message: 'boom' }, { status: 500 });
      }),
    );

    const observer = new MutationObserver(client, markAllReadMutationOptions(client));
    await expect(observer.mutate()).rejects.toBeDefined();

    expect(inFlight).toEqual({ unreadRows: 0, count: 0 });
    expect(pages(client)?.pages[0]?.notifications.map((n) => n.isRead)).toEqual([false, true]);
    expect(client.getQueryData(queryKeys.bms.notificationsUnreadCount)).toBe(120);
  });
});

describe('mapNotification', () => {
  it('normalises the offsetless LocalDateTime and keeps ticketId', () => {
    expect(
      mapNotification({
        id: 'u1',
        ticketId: 9,
        title: 'T',
        body: 'B',
        type: 'TICKET_CREATED',
        isRead: false,
        createdAt: '2026-08-21T09:15:00',
        metadata: { ticketNumber: 725 },
      }),
    ).toEqual({
      id: 'u1',
      type: 'TICKET_CREATED',
      serverTitle: 'T',
      serverBody: 'B',
      isRead: false,
      createdAt: '2026-08-21T09:15:00Z',
      ticketId: 9,
      metadata: { ticketNumber: '725' },
    });
  });
});
