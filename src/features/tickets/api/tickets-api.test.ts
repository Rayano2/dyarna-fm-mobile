import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { shouldRetryTicket } from '../hooks/useTicket';
import { DEFAULT_TICKET_FILTERS } from '../lib/ticket-filters-store';
import { assignTicket } from './assign-ticket';
import { listTicketComments } from './comments';
import { getTicket, isTicketNotFoundError, TICKET_NOT_FOUND_CODE } from './get-ticket';
import { listTickets } from './list-tickets';
import { ResolveTicketError, resolveTicket, type ResolveTicketInput } from './update-status';

// Real ky clients (tmsClient -> TMS_BASE_URL from vitest.setup.ts), msw at the network layer.
const TMS = 'https://tms.test.local/api/tms/tickets';
const TICKET_ID = 42;
const TICKET_NUMBER = 'EL-000042';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const RAW = {
  ticketId: TICKET_ID,
  tktNumber: TICKET_NUMBER,
  statusCode: 'IN_PROGRESS',
  priorityCode: 'HIGH',
  createdAt: '2026-10-01T08:00:00Z',
};

interface Seen {
  method: string;
  path: string;
  search: string;
  body?: unknown;
}

/** Records every ticket call in order; `fail` makes the matching step answer 500. */
function recordResolveRoutes(fail?: 'comment' | 'attachments' | 'status') {
  const seen: Seen[] = [];
  const answer = (step: string) =>
    fail === step
      ? HttpResponse.json({ success: false, code: 'TMS_500', message: 'boom' }, { status: 500 })
      : HttpResponse.json({});
  server.use(
    http.post(`${TMS}/:id/comments`, async ({ request }) => {
      const url = new URL(request.url);
      seen.push({
        method: 'POST',
        path: url.pathname,
        search: url.search,
        body: await request.json(),
      });
      return answer('comment');
    }),
    http.post(`${TMS}/:id/attachments/company`, ({ request }) => {
      const url = new URL(request.url);
      seen.push({ method: 'POST', path: url.pathname, search: url.search });
      return answer('attachments');
    }),
    http.patch(`${TMS}/:number/status`, ({ request }) => {
      const url = new URL(request.url);
      seen.push({ method: 'PATCH', path: url.pathname, search: url.search });
      return answer('status');
    }),
  );
  return seen;
}

const INPUT: ResolveTicketInput = {
  ticketId: TICKET_ID,
  ticketNumber: TICKET_NUMBER,
  status: 'RESOLVED',
  comment: 'Replaced the breaker',
  repairCost: 150.5,
  files: [{ uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' }],
};

describe('resolveTicket (comment -> attachments -> status)', () => {
  it('runs the three steps in order, ids on {ticketId} routes and the number on {ticketNumber}', async () => {
    const seen = recordResolveRoutes();
    await resolveTicket(INPUT);
    expect(seen.map((s) => `${s.method} ${s.path}`)).toEqual([
      `POST /api/tms/tickets/${TICKET_ID}/comments`,
      `POST /api/tms/tickets/${TICKET_ID}/attachments/company`,
      `PATCH /api/tms/tickets/${TICKET_NUMBER}/status`,
    ]);
    expect(seen[0]?.body).toEqual({ comment: 'Replaced the breaker', isInternal: false });
    const status = new URLSearchParams(seen[2]?.search);
    expect(status.get('status')).toBe('RESOLVED');
    expect(status.get('repairCost')).toBe('150.5');
  });

  it('skips the upload without files and sends no repairCost when there is none', async () => {
    const seen = recordResolveRoutes();
    await resolveTicket({ ...INPUT, status: 'NOT_ACTIONABLE', files: [], repairCost: null });
    expect(seen.map((s) => s.method)).toEqual(['POST', 'PATCH']);
    const status = new URLSearchParams(seen[1]?.search);
    expect(status.get('status')).toBe('NOT_ACTIONABLE');
    expect(status.has('repairCost')).toBe(false);
  });

  it('stops at a failed upload and reports the partial save', async () => {
    const seen = recordResolveRoutes('attachments');
    const error = await resolveTicket(INPUT).catch((error_: unknown) => error_);
    expect(error).toBeInstanceOf(ResolveTicketError);
    const e = error as ResolveTicketError;
    expect(e.failedStep).toBe('attachments');
    expect(e.completed).toEqual(['comment']);
    expect(e.partial).toBe(true);
    // The status was never changed.
    expect(seen.some((s) => s.method === 'PATCH')).toBe(false);
  });

  it('a retry finishes the run without re-posting the note', async () => {
    recordResolveRoutes('status');
    const first = (await resolveTicket(INPUT).catch(
      (error: unknown) => error,
    )) as ResolveTicketError;
    expect(first.completed).toEqual(['comment', 'attachments']);

    server.resetHandlers();
    const seen = recordResolveRoutes();
    await resolveTicket(INPUT, new Set(first.completed));
    expect(seen.map((s) => `${s.method} ${s.path}`)).toEqual([
      `PATCH /api/tms/tickets/${TICKET_NUMBER}/status`,
    ]);
  });

  it('a failed first step is not partial', async () => {
    recordResolveRoutes('comment');
    const e = (await resolveTicket(INPUT).catch((error: unknown) => error)) as ResolveTicketError;
    expect(e.failedStep).toBe('comment');
    expect(e.partial).toBe(false);
  });
});

describe('id vs number routing', () => {
  it('assign uses the ticket NUMBER and the user id as a query param', async () => {
    let seen = '';
    server.use(
      http.patch(`${TMS}/:number/assign`, ({ request }) => {
        const url = new URL(request.url);
        seen = `${url.pathname}${url.search}`;
        return HttpResponse.json(RAW);
      }),
    );
    await assignTicket(TICKET_NUMBER, 'user-1');
    expect(seen).toBe(`/api/tms/tickets/${TICKET_NUMBER}/assign?userId=user-1`);
  });

  it('comments are read by the numeric ticket ID', async () => {
    let path = '';
    server.use(
      http.get(`${TMS}/:id/comments`, ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json([
          { authorRole: 'RESIDENT', body: 'hi', isInternal: false, createdAt: 'c' },
        ]);
      }),
    );
    const comments = await listTicketComments(TICKET_ID);
    expect(path).toBe(`/api/tms/tickets/${TICKET_ID}/comments`);
    expect(comments).toHaveLength(1);
  });

  it('the detail is read by the ticket NUMBER on the company route', async () => {
    let path = '';
    server.use(
      http.get(`${TMS}/company/:number`, ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json(RAW);
      }),
    );
    const t = await getTicket(TICKET_NUMBER);
    expect(path).toBe(`/api/tms/tickets/company/${TICKET_NUMBER}`);
    expect(t.ticketId).toBe(TICKET_ID);
  });
});

describe('listTickets', () => {
  it('sends filters, sort and paging but no companyId (derived from the JWT server-side)', async () => {
    let params = new URLSearchParams();
    server.use(
      http.get(TMS, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json({ content: [RAW], totalElements: 16, totalPages: 2 });
      }),
    );
    const page = await listTickets(
      {
        ...DEFAULT_TICKET_FILTERS,
        status: 'OPEN',
        projectId: 3,
        buildingCode: 'B9',
        ticketNo: ' EL-1 ',
      },
      1,
    );
    expect(Object.fromEntries(params)).toEqual({
      page: '1',
      size: '15',
      status: 'OPEN',
      sort: 'createdAt,desc',
      ticketNo: 'EL-1',
      projectId: '3',
      buildingCode: 'B9',
    });
    expect(page).toMatchObject({ page: 1, totalPages: 2 });
  });

  it('omits status for ALL', async () => {
    let params = new URLSearchParams();
    server.use(
      http.get(TMS, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json({ content: [], totalElements: 0, totalPages: 0 });
      }),
    );
    await listTickets(DEFAULT_TICKET_FILTERS, 0);
    expect(params.has('status')).toBe(false);
  });
});

async function detailError(response: Response): Promise<unknown> {
  server.use(http.get(`${TMS}/company/:number`, () => response));
  return getTicket(TICKET_NUMBER).catch((error: unknown) => error);
}

describe('detail not-found -> "Ticket not found" state', () => {
  it('an HTTP 404 is not-found and is never retried', async () => {
    const error = await detailError(HttpResponse.json({}, { status: 404 }));
    expect(isTicketNotFoundError(error)).toBe(true);
    expect(shouldRetryTicket(0, error)).toBe(false);
  });

  it('bms-tms TMS_404_01 sent as HTTP 400 (other company / missing) is not-found', async () => {
    const error = await detailError(
      HttpResponse.json(
        { success: false, code: TICKET_NOT_FOUND_CODE, message: 'Ticket not found' },
        { status: 400 },
      ),
    );
    expect(isTicketNotFoundError(error)).toBe(true);
    expect(shouldRetryTicket(0, error)).toBe(false);
  });

  it('other failures are a retryable error, not not-found', async () => {
    const error = await detailError(
      HttpResponse.json({ success: false, code: 'TMS_400_02', message: 'bad' }, { status: 400 }),
    );
    expect(isTicketNotFoundError(error)).toBe(false);
    expect(shouldRetryTicket(0, error)).toBe(true);
    expect(shouldRetryTicket(2, error)).toBe(false);
  });
});
