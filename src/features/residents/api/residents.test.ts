import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { queryKeys } from '@/shared/api/query-keys';
import {
  classifyOffboardError,
  filterResidentsBySearch,
  OFFBOARD_INVALIDATIONS,
  offboardSuccessToastKey,
} from '../lib/residents-logic';
import { mapResident, mapResidentDetails } from './mappers';
import { fetchResidentDetails, fetchResidents, offboardResident } from './residents';

const BMS = 'https://bms.test.local/api/bms/company-reps';
const USER = '3f2b9c1e-0000-4000-8000-000000000009';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function offboardError(response: Response): Promise<unknown> {
  server.use(http.post(`${BMS}/residents/:id/offboard`, () => response));
  try {
    await offboardResident({ userId: USER, unitResidentId: 11, reason: 'moved out' });
  } catch (error) {
    return error;
  }
  throw new Error('expected the offboard to fail');
}

describe('resident mappers', () => {
  it('maps a list row (BMS ResidentListResponse), accepting projectId as a number', () => {
    expect(
      mapResident({
        userId: USER,
        unitResidentId: 11,
        fullName: 'Sara Ali',
        email: 'sara@x.com',
        mobile: '+966500000000',
        unitNumber: '101',
        buildingName: 'Tower A',
        buildingCode: 'B-1',
        projectName: 'Palm',
        projectId: 3,
        floorNumber: 1,
        registrationDate: '2026-01-02T10:00:00',
      }),
    ).toEqual({
      userId: USER,
      unitResidentId: 11,
      fullName: 'Sara Ali',
      email: 'sara@x.com',
      mobile: '+966500000000',
      unitNumber: '101',
      buildingName: 'Tower A',
      buildingCode: 'B-1',
      projectName: 'Palm',
      projectId: 3,
      floorNumber: 1,
      registrationDate: '2026-01-02T10:00:00',
    });
  });

  it('throws on a row without a userId', () => {
    expect(() => mapResident({ fullName: 'x' })).toThrow();
  });

  it('maps the details: counts, active flag and last ticket', () => {
    const d = mapResidentDetails({
      userId: USER,
      fullName: 'Sara',
      openTicketsCount: 2,
      closedTicketsCount: 5,
      active: false,
      lastTicket: {
        ticketId: 'T-9',
        title: 'Leak',
        status: 'OPEN',
        createdAt: '2026-10-01T00:00:00Z',
      },
    });
    expect(d).toMatchObject({
      openTicketsCount: 2,
      closedTicketsCount: 5,
      active: false,
      lastTicket: {
        ticketId: 'T-9',
        title: 'Leak',
        status: 'OPEN',
        createdAt: '2026-10-01T00:00:00Z',
      },
    });
  });

  it('leaves active undefined on an older BMS build and drops a malformed last ticket', () => {
    const d = mapResidentDetails({ userId: USER, lastTicket: { title: 'no id' } });
    expect(d.active).toBeUndefined();
    expect(d.lastTicket).toBeUndefined();
    expect(d.openTicketsCount).toBe(0);
  });
});

describe('fetchResidents / fetchResidentDetails', () => {
  it('asks for the 50-row page BMS serves and passes the filters', async () => {
    let params: Record<string, string> = {};
    server.use(
      http.get(`${BMS}/residents`, ({ request }) => {
        params = Object.fromEntries(new URL(request.url).searchParams);
        return HttpResponse.json({
          content: [{ userId: USER, unitResidentId: 11, fullName: 'Sara' }],
          page: 0,
          totalElements: 1,
          totalPages: 1,
          last: true,
        });
      }),
    );
    const page = await fetchResidents({ page: 0, projectId: 3, buildingCode: 'B-1' });
    expect(params).toEqual({ page: '0', size: '50', projectId: '3', buildingCode: 'B-1' });
    expect(page.totalElements).toBe(1);
    expect(page.content[0]?.unitResidentId).toBe(11);
  });

  it('fetches the details by userId', async () => {
    server.use(
      http.get(`${BMS}/residents/:id`, ({ params }) =>
        HttpResponse.json({ userId: params.id, fullName: 'Sara', openTicketsCount: 1 }),
      ),
    );
    await expect(fetchResidentDetails(USER)).resolves.toMatchObject({
      userId: USER,
      openTicketsCount: 1,
    });
  });
});

describe('offboard', () => {
  it('posts the unit link and the trimmed reason; a blank reason is omitted', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${BMS}/residents/:id/offboard`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({
          userId: USER,
          deactivatedLinks: 1,
          unitNumbers: ['101'],
          offboardedAt: '2026-10-09T10:00:00',
          alreadyOffboarded: false,
        });
      }),
    );
    const result = await offboardResident({
      userId: USER,
      unitResidentId: 11,
      reason: '  moved  ',
    });
    await offboardResident({ userId: USER, unitResidentId: 11, reason: '   ' });

    expect(bodies).toEqual([{ unitResidentId: 11, reason: 'moved' }, { unitResidentId: 11 }]);
    expect(result).toEqual({
      userId: USER,
      deactivatedLinks: 1,
      unitNumbers: ['101'],
      offboardedAt: '2026-10-09T10:00:00',
      alreadyOffboarded: false,
    });
    expect(offboardSuccessToastKey(result)).toBe('fm.residents.offboardedToast');
  });

  it('"already offboarded" (idempotent repeat) gets its own toast', async () => {
    server.use(
      http.post(`${BMS}/residents/:id/offboard`, () =>
        HttpResponse.json({
          userId: USER,
          deactivatedLinks: 0,
          unitNumbers: [],
          alreadyOffboarded: true,
        }),
      ),
    );
    const result = await offboardResident({ userId: USER, unitResidentId: 11 });
    expect(offboardSuccessToastKey(result)).toBe('fm.residents.offboardedAlready');
  });

  it('BMS_400_15 (building president) is the president inline error', async () => {
    const error = await offboardError(
      HttpResponse.json(
        {
          success: false,
          code: 'BMS_400_15',
          message: 'This resident is the active president of the building.',
        },
        { status: 400 },
      ),
    );
    expect(classifyOffboardError(error)).toBe('president');
  });

  it('403 is the forbidden inline error', async () => {
    const error = await offboardError(
      HttpResponse.json(
        { success: false, code: 'FORBIDDEN', message: 'Not authorized' },
        { status: 403 },
      ),
    );
    expect(classifyOffboardError(error)).toBe('forbidden');
  });

  it('anything else is the generic inline error', async () => {
    expect(
      classifyOffboardError(
        await offboardError(
          HttpResponse.json({ code: 'BMS_400_01', message: 'x' }, { status: 400 }),
        ),
      ),
    ).toBe('generic');
    expect(
      classifyOffboardError(await offboardError(new HttpResponse(null, { status: 500 }))),
    ).toBe('generic');
    expect(classifyOffboardError(new Error('socket'))).toBe('generic');
  });

  it('invalidates the residents list, details, unit occupancy and properties', () => {
    expect(OFFBOARD_INVALIDATIONS).toEqual([
      queryKeys.fmResidents.residents,
      queryKeys.fmResidents.residentDetails,
      queryKeys.fmResidents.buildingUnitsAll,
      queryKeys.bms.propertiesList,
    ]);
  });
});

describe('filterResidentsBySearch (client-side)', () => {
  const rows = [
    mapResident({ userId: 'a', fullName: 'Sara Ali', mobile: '+966 50 111 2222' }),
    mapResident({ userId: 'b', fullName: 'Omar', mobile: '+966500003333', email: 'sara@x.com' }),
  ];

  it('matches the name and the mobile, not the email', () => {
    expect(filterResidentsBySearch(rows, 'sara').map((r) => r.userId)).toEqual(['a']);
    expect(filterResidentsBySearch(rows, '0003333').map((r) => r.userId)).toEqual(['b']);
    expect(filterResidentsBySearch(rows, '').map((r) => r.userId)).toEqual(['a', 'b']);
  });
});
