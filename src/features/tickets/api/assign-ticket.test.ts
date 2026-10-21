import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { assignErrorKind, assignTicket } from './assign-ticket';
import { getAssignableUsers, mapAssignableUsers } from './get-assignable-users';

// Real ky client (TMS_BASE_URL from vitest.setup.ts), msw at the network layer.
const TMS = 'https://tms.test.local/api/tms/tickets';
const NUMBER = 'EL-000042';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('getAssignableUsers', () => {
  it('reads the ticket NUMBER route and keeps a null fullName', async () => {
    let path = '';
    server.use(
      http.get(`${TMS}/:number/assignable-users`, ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json([
          { userId: 'u-1', fullName: 'Sara Ali', role: 'COMPANY_REP', isCurrentAssignee: true },
          { userId: 'u-2', fullName: null, role: 'PRESIDENT', isCurrentAssignee: false },
        ]);
      }),
    );
    const users = await getAssignableUsers(NUMBER);
    expect(path).toBe(`/api/tms/tickets/${NUMBER}/assignable-users`);
    expect(users).toEqual([
      { userId: 'u-1', fullName: 'Sara Ali', role: 'COMPANY_REP', isCurrentAssignee: true },
      { userId: 'u-2', fullName: null, role: 'PRESIDENT', isCurrentAssignee: false },
    ]);
  });

  it('an empty list is valid', async () => {
    server.use(http.get(`${TMS}/:number/assignable-users`, () => HttpResponse.json([])));
    await expect(getAssignableUsers(NUMBER)).resolves.toEqual([]);
  });

  it('drops malformed entries and treats a blank name as missing', () => {
    expect(
      mapAssignableUsers([{ fullName: 'no id' }, { userId: 7, fullName: '  ', role: 'X' }, null]),
    ).toEqual([{ userId: '7', fullName: null, role: 'COMPANY_REP', isCurrentAssignee: false }]);
    expect(mapAssignableUsers({ content: [] })).toEqual([]);
  });
});

async function assignError(status: number, code: string): Promise<unknown> {
  server.use(
    http.patch(`${TMS}/:number/assign`, () =>
      HttpResponse.json({ success: false, code, message: code }, { status }),
    ),
  );
  return assignTicket(NUMBER, 'u-2').catch((error: unknown) => error);
}

describe('assign errors are told apart by code, not HTTP status', () => {
  it.each([
    [400, 'TMS_404_01', 'notFound'],
    [400, 'TMS_400_01', 'statusInvalid'],
    [400, 'TMS_400_04', 'notEligible'],
    [403, 'BMS_403_00', 'forbidden'],
  ])('HTTP %s %s -> %s', async (status, code, kind) => {
    expect(assignErrorKind(await assignError(status, code))).toBe(kind);
  });

  it('an unknown code or a non-API error has no specific kind', async () => {
    expect(assignErrorKind(await assignError(400, 'TMS_400_99'))).toBeNull();
    expect(assignErrorKind(new Error('boom'))).toBeNull();
  });
});
