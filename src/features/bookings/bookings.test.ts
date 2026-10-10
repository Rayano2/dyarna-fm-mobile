import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  listAllBookings,
  listBookings,
  toBooking,
  updateBookingStatus,
  type Booking,
} from './api/bookings-api';
import { groupAgenda } from './lib/agenda';
import { durationMinutes, fromParam, toParam, weekDays, weekFetchRange } from './lib/booking-dates';
import { rejectReasonError } from './lib/booking-meta';

const URL_BOOKINGS = 'https://community.test.local/api/v1/facilities/bookings';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function booking(id: string, status: string, start: Date): Booking {
  return toBooking({
    id,
    status,
    facilityName: 'Gym',
    startTime: start.toISOString(),
    endTime: new Date(start.getTime() + 90 * 60_000).toISOString(),
  })!;
}

describe('from/to ISO formatting', () => {
  it('sends from as the local midnight starting the day and to as the one ending it', () => {
    // 23:30 local on 14 Oct is still "the 14th".
    expect(fromParam(new Date(2026, 9, 14, 23, 30))).toBe(new Date(2026, 9, 14).toISOString());
    // `to` is exclusive on the server, so "to 14 Oct" must end at 15 Oct 00:00 local.
    expect(toParam(new Date(2026, 9, 14, 8))).toBe(new Date(2026, 9, 15).toISOString());
    // Month rollover.
    expect(toParam(new Date(2026, 9, 31))).toBe(new Date(2026, 10, 1).toISOString());
  });

  it('sends from/to as instants on the wire', async () => {
    let url: URL | null = null;
    server.use(
      http.get(URL_BOOKINGS, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json({ content: [], number: 0, last: true });
      }),
    );
    await listBookings(
      {
        projectId: '7',
        status: 'PENDING',
        from: fromParam(new Date(2026, 9, 1)),
        to: toParam(new Date(2026, 9, 8)),
      },
      0,
    );
    expect(url!.searchParams.get('from')).toBe(new Date(2026, 9, 1).toISOString());
    expect(url!.searchParams.get('to')).toBe(new Date(2026, 9, 9).toISOString());
    expect(url!.searchParams.get('status')).toBe('PENDING');
    expect(url!.searchParams.get('size')).toBe('20');
    expect(url!.searchParams.has('buildingId')).toBe(false);
  });

  it('fetches the week from its first local midnight to the one after its last day', () => {
    const anchor = new Date(2026, 9, 14); // Wed
    const days = weekDays(anchor, 0);
    expect(days).toHaveLength(7);
    expect(days[0]!.getDay()).toBe(0);
    expect(weekFetchRange(anchor, 0)).toEqual({
      from: new Date(2026, 9, 11).toISOString(),
      to: new Date(2026, 9, 18).toISOString(),
    });
  });

  it('pages the week at the server cap of 100 instead of asking for 200', async () => {
    const sizes: string[] = [];
    server.use(
      http.get(URL_BOOKINGS, ({ request }) => {
        const u = new URL(request.url);
        sizes.push(u.searchParams.get('size')!);
        const page = Number(u.searchParams.get('page'));
        return HttpResponse.json({
          content: [{ id: `b${page}`, status: 'APPROVED' }],
          number: page,
          totalPages: 2,
        });
      }),
    );
    const all = await listAllBookings({ projectId: '7' });
    expect(sizes).toEqual(['100', '100']);
    expect(all.items.map((b) => b.id)).toEqual(['b0', 'b1']);
    expect(all.truncated).toBe(false);
  });

  it('stops at 5 pages and flags the result as truncated', async () => {
    const pages: number[] = [];
    server.use(
      http.get(URL_BOOKINGS, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        pages.push(page);
        return HttpResponse.json({
          content: [{ id: `b${page}`, status: 'APPROVED' }],
          number: page,
          totalPages: 50,
          last: false,
        });
      }),
    );
    const all = await listAllBookings({ projectId: '7' });
    expect(pages).toEqual([0, 1, 2, 3, 4]);
    expect(all.items).toHaveLength(5);
    expect(all.truncated).toBe(true);
  });
});

const d1 = (h: number): Date => new Date(2026, 9, 14, h);
const d2 = (h: number): Date => new Date(2026, 9, 15, h);

describe('agenda grouping', () => {
  it('groups by local day ascending, PENDING first then by start time', () => {
    const sections = groupAgenda([
      booking('late-approved', 'APPROVED', d1(18)),
      booking('next-day', 'PENDING', d2(9)),
      booking('early-approved', 'APPROVED', d1(8)),
      booking('late-pending', 'PENDING', d1(20)),
      booking('early-pending', 'PENDING', d1(10)),
    ]);
    expect(sections.map((s) => s.key)).toEqual(['2026-10-14', '2026-10-15']);
    expect(sections[0]!.data.map((b) => b.id)).toEqual([
      'early-pending',
      'late-pending',
      'early-approved',
      'late-approved',
    ]);
    expect(sections[1]!.data.map((b) => b.id)).toEqual(['next-day']);
  });

  it('computes the exact duration in minutes', () => {
    const b = booking('x', 'PENDING', new Date(2026, 9, 14, 10));
    expect(durationMinutes(b.startTime, b.endTime)).toBe(90);
    expect(durationMinutes(b.endTime, b.startTime)).toBeUndefined();
  });
});

describe('reject reason', () => {
  it('is required once trimmed', () => {
    expect(rejectReasonError('')).toBe('fm.bookings.reasonRequired');
    expect(rejectReasonError('   ')).toBe('fm.bookings.reasonRequired');
    expect(rejectReasonError('Facility closed for maintenance')).toBeNull();
  });

  it('is at most 500 characters', () => {
    expect(rejectReasonError('a'.repeat(500))).toBeNull();
    expect(rejectReasonError('a'.repeat(501))).toBe('fm.bookings.reasonTooLong');
  });

  it('goes out as query params with no body', async () => {
    let seen: { status: string | null; reason: string | null; body: string } | null = null;
    server.use(
      http.patch(`${URL_BOOKINGS}/bk1/status`, async ({ request }) => {
        const u = new URL(request.url);
        seen = {
          status: u.searchParams.get('status'),
          reason: u.searchParams.get('reason'),
          body: await request.text(),
        };
        return HttpResponse.json({});
      }),
    );
    await updateBookingStatus('bk1', 'REJECTED', 'Closed for repairs');
    expect(seen).toEqual({ status: 'REJECTED', reason: 'Closed for repairs', body: '' });
  });
});
