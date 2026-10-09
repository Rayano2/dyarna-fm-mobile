import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  countActiveTodos,
  getActiveTodoCount,
  getDashboardInfo,
  mapDashboardInfo,
} from './dashboard-api';

const DASHBOARD_URL = 'https://bms.test.local/api/bms/company-reps/dashboardInfo';
const TODOS_URL = 'https://bms.test.local/todos';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const TICKET = {
  ticketId: 42,
  tktNumber: '725',
  statusCode: 'OPEN',
  priorityCode: 'HIGH',
  title: 'Leaking pipe',
  description: 'Kitchen sink',
  buildingName: 'Tower A',
  createdAt: '2026-08-21T09:15:00',
  categoryNameAr: 'سباكة',
  categoryNameEn: 'Plumbing',
  assignedTo: 'Omar',
  // Extra TicketResponse fields are ignored.
  residentMobile: '0500000000',
};

describe('mapDashboardInfo', () => {
  it('maps DashboardInfoResponse counts and topOpenTickets', () => {
    const info = mapDashboardInfo({
      openMaintenanceTicketsCount: 7,
      pendingResidentRequestsCount: 3,
      activeUnitsCount: 120,
      topOpenTickets: [TICKET],
    });
    expect(info).toEqual({
      openMaintenanceTicketsCount: 7,
      pendingResidentRequestsCount: 3,
      activeUnitsCount: 120,
      topOpenTickets: [
        {
          ticketId: 42,
          tktNumber: '725',
          statusCode: 'OPEN',
          priorityCode: 'HIGH',
          title: 'Leaking pipe',
          description: 'Kitchen sink',
          buildingName: 'Tower A',
          // LocalDateTime has no offset: normalised to UTC at the boundary.
          createdAt: '2026-08-21T09:15:00Z',
          categoryNameAr: 'سباكة',
          categoryNameEn: 'Plumbing',
          assignedTo: 'Omar',
        },
      ],
    });
  });

  it('treats nulls/garbage as zero and an empty list (the empty state)', () => {
    const info = mapDashboardInfo({
      openMaintenanceTicketsCount: null,
      pendingResidentRequestsCount: '4',
      activeUnitsCount: -2,
      topOpenTickets: null,
    });
    expect(info).toEqual({
      openMaintenanceTicketsCount: 0,
      pendingResidentRequestsCount: 4,
      activeUnitsCount: 0,
      topOpenTickets: [],
    });
    expect(mapDashboardInfo(null).topOpenTickets).toEqual([]);
  });

  it('drops a ticket without a numeric ticketId instead of failing the whole card', () => {
    const info = mapDashboardInfo({
      topOpenTickets: [
        { ...TICKET, ticketId: null },
        { ...TICKET, ticketId: 43 },
      ],
    });
    expect(info.topOpenTickets.map((t) => t.ticketId)).toEqual([43]);
  });

  it('GETs api/bms/company-reps/dashboardInfo over bmsClient', async () => {
    server.use(
      http.get(DASHBOARD_URL, () =>
        HttpResponse.json({
          openMaintenanceTicketsCount: 2,
          pendingResidentRequestsCount: 1,
          activeUnitsCount: 9,
          topOpenTickets: [TICKET],
        }),
      ),
    );
    const info = await getDashboardInfo();
    expect(info.openMaintenanceTicketsCount).toBe(2);
    expect(info.topOpenTickets[0]?.tktNumber).toBe('725');
  });
});

describe('active todo count (My tasks KPI)', () => {
  it('counts todos where isCompleted is not true (null counts as active)', () => {
    expect(
      countActiveTodos({
        content: [
          { todoId: 1, isCompleted: false },
          { todoId: 2, isCompleted: true },
          { todoId: 3, isCompleted: null },
          { todoId: 4 },
        ],
      }),
    ).toBe(3);
    expect(countActiveTodos({ content: [] })).toBe(0);
    expect(countActiveTodos(null)).toBe(0);
  });

  it('GETs /todos (root, no api prefix) with the web dashboard query', async () => {
    let seen: URLSearchParams | null = null;
    server.use(
      http.get(TODOS_URL, ({ request }) => {
        seen = new URL(request.url).searchParams;
        return HttpResponse.json({
          content: [{ isCompleted: false }, { isCompleted: true }, { isCompleted: false }],
          last: true,
        });
      }),
    );
    await expect(getActiveTodoCount()).resolves.toBe(2);
    expect(seen).not.toBeNull();
    const params = seen as unknown as URLSearchParams;
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('100');
    expect(params.get('sort')).toBe('priority,asc');
  });

  it('rejects when the todos endpoint fails (the tile then shows a dash)', async () => {
    server.use(http.get(TODOS_URL, () => HttpResponse.json({}, { status: 500 })));
    await expect(getActiveTodoCount()).rejects.toBeDefined();
  });
});
