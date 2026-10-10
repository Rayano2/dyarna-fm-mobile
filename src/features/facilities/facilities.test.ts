import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { firstIssues } from '../scope/lib/zod-resolver';
import { listFacilities, readIsActive, setFacilityActive, toFacility } from './api/facilities-api';
import {
  emptyFacilityForm,
  facilityFormSchema,
  facilityToForm,
  toFacilityPayload,
} from './lib/facility-form';

const BASE = 'https://community.test.local/api/v1/facilities';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('facility normalizer', () => {
  it('reads the active flag as isActive ?? active ?? true', () => {
    expect(readIsActive({ isActive: false })).toBe(false);
    expect(readIsActive({ active: false })).toBe(false);
    expect(readIsActive({ isActive: true, active: false })).toBe(true);
    expect(readIsActive({})).toBe(true);
  });

  it('maps a project-wide facility with no advance limit', () => {
    const f = toFacility({
      id: '5b1c…uuid',
      name: 'Gym',
      facilityType: 'GYM',
      projectId: 7,
      buildingId: null,
      requiresApproval: true,
      advanceBookingDays: null,
      maxDurationHours: 2,
      active: false,
    });
    expect(f).toMatchObject({
      projectId: '7',
      buildingId: undefined,
      advanceBookingDays: null,
      maxDurationHours: 2,
      isActive: false,
    });
  });
});

describe('facility form (zod)', () => {
  const valid = { ...emptyFacilityForm(null), name: 'Gym' };

  it('sends advanceBookingDays = null when the limit is off — never 0', () => {
    const values = facilityFormSchema.parse({
      ...valid,
      limitAdvanceBooking: false,
      advanceBookingDays: '0',
    });
    const payload = toFacilityPayload(values, '7');
    expect(payload.advanceBookingDays).toBeNull();
    expect(payload.advanceBookingDays).not.toBe(0);
  });

  it('sends the days as a number when the limit is on', () => {
    const values = facilityFormSchema.parse({ ...valid, advanceBookingDays: '45' });
    expect(toFacilityPayload(values, '7')).toMatchObject({
      advanceBookingDays: 45,
      maxDurationHours: 4,
      projectId: 7,
      buildingId: null,
      requiresApproval: true,
    });
  });

  it('rejects 0 and 366 days while the limit is on', () => {
    for (const days of ['0', '366', '', 'abc']) {
      const r = facilityFormSchema.safeParse({ ...valid, advanceBookingDays: days });
      expect(r.success).toBe(false);
      expect(firstIssues(r.error!).advanceBookingDays).toBe(
        'fm.facilities.errors.advanceDaysRange',
      );
    }
  });

  it('enforces name, type, capacity and max duration', () => {
    const r = facilityFormSchema.safeParse({
      ...valid,
      name: '   ',
      facilityType: 'SPA',
      capacity: '0',
      maxDurationHours: '25',
    });
    expect(r.success).toBe(false);
    expect(firstIssues(r.error!)).toMatchObject({
      name: 'fm.facilities.errors.nameRequired',
      facilityType: 'fm.facilities.errors.typeRequired',
      capacity: 'fm.facilities.errors.capacityInvalid',
      maxDurationHours: 'fm.facilities.errors.maxHoursRange',
    });
  });

  it('round-trips a facility with no limit back to the switch being off', () => {
    const f = toFacility({
      id: 'x',
      name: 'Pool',
      facilityType: 'POOL',
      advanceBookingDays: null,
    })!;
    const form = facilityToForm(f);
    expect(form.limitAdvanceBooking).toBe(false);
    expect(toFacilityPayload(facilityFormSchema.parse(form), '1').advanceBookingDays).toBeNull();
  });
});

describe('facilities API', () => {
  it('lists with includeInactive=true and the building filter', async () => {
    let url: URL | null = null;
    server.use(
      http.get(BASE, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json([{ id: 'a', name: 'A', facilityType: 'GYM', isActive: false }]);
      }),
    );
    const list = await listFacilities('7', '3');
    expect(url!.searchParams.get('includeInactive')).toBe('true');
    expect(url!.searchParams.get('buildingId')).toBe('3');
    expect(list[0]?.isActive).toBe(false);
  });

  it('deactivate returns the affected future bookings, sending no body', async () => {
    let seen: { active: string | null; body: string } | null = null;
    server.use(
      http.patch(`${BASE}/f1/active`, async ({ request }) => {
        seen = {
          active: new URL(request.url).searchParams.get('active'),
          body: await request.text(),
        };
        return HttpResponse.json({ facilityId: 'f1', isActive: false, affectedFutureBookings: 3 });
      }),
    );
    const result = await setFacilityActive('f1', false);
    expect(seen).toEqual({ active: 'false', body: '' });
    expect(result).toEqual({ isActive: false, affectedFutureBookings: 3 });
  });

  it('a deactivation with no affected bookings reads as 0', async () => {
    server.use(http.patch(`${BASE}/f1/active`, () => HttpResponse.json({ active: false })));
    expect(await setFacilityActive('f1', false)).toEqual({
      isActive: false,
      affectedFutureBookings: 0,
    });
  });
});
