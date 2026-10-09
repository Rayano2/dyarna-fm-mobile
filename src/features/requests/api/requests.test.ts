import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { queryKeys } from '@/shared/api/query-keys';
import { approveErrorEffect, approveSuccessEffect, submitReject } from '../lib/request-actions';
import { reconcileSelection } from '../lib/units';
import { approveResidentRequest, fetchBuildingUnits, fetchResidentRequests } from './requests';

const BMS = 'https://bms.test.local/api/bms';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function failure(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the request to fail');
}

describe('fetchResidentRequests (GET api/bms/residents)', () => {
  it('sends the filters as query params and NO body', async () => {
    let seen: { params: Record<string, string>; body: string } | null = null;
    server.use(
      http.get(`${BMS}/residents`, async ({ request }) => {
        seen = {
          params: Object.fromEntries(new URL(request.url).searchParams),
          body: await request.text(),
        };
        return HttpResponse.json({
          content: [{ requestId: 5, firstName: 'A', status: 'PENDING' }],
          page: 0,
          totalElements: 1,
          totalPages: 1,
          last: true,
        });
      }),
    );

    const page = await fetchResidentRequests({
      page: 0,
      status: 'PENDING',
      projectId: 3,
      buildingCode: 'B-1',
    });

    expect(seen).toEqual({
      params: { page: '0', size: '10', status: 'PENDING', projectId: '3', buildingCode: 'B-1' },
      body: '',
    });
    expect(page.content[0]?.requestId).toBe(5);
    expect(page.last).toBe(true);
  });

  it('omits unset filters (the All segment sends no status)', async () => {
    let params: Record<string, string> = {};
    server.use(
      http.get(`${BMS}/residents`, ({ request }) => {
        params = Object.fromEntries(new URL(request.url).searchParams);
        return HttpResponse.json({ content: [], page: 0, totalPages: 0, last: true });
      }),
    );
    await fetchResidentRequests({ page: 2, status: null, projectId: null, buildingCode: null });
    expect(params).toEqual({ page: '2', size: '10' });
  });
});

describe('approve', () => {
  it('success: closes the sheet and invalidates requests, the dashboard count and units', async () => {
    let path = '';
    server.use(
      http.patch(`${BMS}/resident-link-requests/:id/:unit/approve`, ({ params }) => {
        path = `${String(params.id)}/${String(params.unit)}`;
        return HttpResponse.json({ requestId: 7, status: 'APPROVED' });
      }),
    );

    await approveResidentRequest(7, '101');

    expect(path).toBe('7/101');
    expect(approveSuccessEffect()).toEqual({
      kind: 'approved',
      closeSheet: true,
      toast: 'approvedToast',
      invalidate: [
        queryKeys.fmResidents.requests,
        queryKeys.fmResidents.dashboardInfo,
        queryKeys.fmResidents.buildingUnitsAll,
      ],
    });
  });

  it('BMS_400_14: keeps the sheet open, clears the selection and refetches the units', async () => {
    let unitsCalls = 0;
    server.use(
      http.patch(`${BMS}/resident-link-requests/:id/:unit/approve`, () =>
        HttpResponse.json(
          {
            success: false,
            code: 'BMS_400_14',
            message: 'This unit is already assigned to another active resident.',
            path: '/api/bms/resident-link-requests/7/101/approve',
          },
          { status: 400 },
        ),
      ),
      http.get(`${BMS}/company-reps/buildings/:code/units`, () => {
        unitsCalls += 1;
        return HttpResponse.json([
          { propertyUnitId: 1, unitNumber: '101', occupantCount: 1, residentFullName: 'Omar' },
          { propertyUnitId: 2, unitNumber: '102', occupantCount: 0 },
        ]);
      }),
    );

    const effect = approveErrorEffect(await failure(approveResidentRequest(7, '101')));

    expect(effect).toEqual({
      kind: 'unitTaken',
      closeSheet: false,
      clearSelection: true,
      refetchUnits: true,
      toast: 'unitTaken',
    });

    // What the sheet does with that effect: refetch, then the stale pick can't survive.
    const units = await fetchBuildingUnits('B-1');
    expect(unitsCalls).toBe(1);
    expect(reconcileSelection('101', units)).toBeNull();
    expect(reconcileSelection('102', units)).toBe('102');
  });

  it('any other failure is a plain failure toast, not unit-taken', async () => {
    server.use(
      http.patch(`${BMS}/resident-link-requests/:id/:unit/approve`, () =>
        HttpResponse.json({ code: 'BMS_500_01', message: 'boom' }, { status: 500 }),
      ),
    );
    const effect = approveErrorEffect(await failure(approveResidentRequest(7, '101')));
    expect(effect).toEqual({ kind: 'failed', closeSheet: false, toast: 'approveFailed' });
  });
});

describe('reject', () => {
  it('a blank reason is rejected locally and never sent', async () => {
    let calls = 0;
    server.use(
      http.patch(`${BMS}/resident-link-requests/:id/reject`, () => {
        calls += 1;
        return HttpResponse.json({});
      }),
    );
    await expect(submitReject(7, '   ')).resolves.toEqual({ ok: false, error: 'reasonRequired' });
    await expect(submitReject(7, '')).resolves.toEqual({ ok: false, error: 'reasonRequired' });
    expect(calls).toBe(0);
  });

  it('sends the trimmed reason as an encoded query param', async () => {
    let reason: string | null = null;
    let rawQuery = '';
    server.use(
      http.patch(`${BMS}/resident-link-requests/:id/reject`, ({ request }) => {
        const url = new URL(request.url);
        reason = url.searchParams.get('reason');
        rawQuery = url.search;
        return HttpResponse.json({ requestId: 7, status: 'REJECTED' });
      }),
    );
    await expect(submitReject(7, '  wrong unit & name  ')).resolves.toEqual({ ok: true });
    expect(reason).toBe('wrong unit & name');
    expect(rawQuery).not.toContain(' & ');
  });

  it('a server failure still throws, so the sheet can toast it', async () => {
    server.use(
      http.patch(`${BMS}/resident-link-requests/:id/reject`, () =>
        HttpResponse.json({ message: 'nope' }, { status: 500 }),
      ),
    );
    await expect(submitReject(7, 'x')).rejects.toMatchObject({ status: 500 });
  });
});
