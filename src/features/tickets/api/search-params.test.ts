import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResponsePromise } from 'ky';
import { tmsClient } from '@/shared/api/clients';
import { DEFAULT_TICKET_FILTERS } from '../lib/ticket-filters-store';
import { listTickets } from './list-tickets';
import { updateTicketStatus } from './update-status';

/**
 * FM #110 items 4 and 8. Node's URLSearchParams is spec-complete, so the msw
 * tests in tickets-api.test.ts passed while React Native's polyfill (which
 * can't be copy-constructed by ky) dropped every param on device. These tests
 * check the shape handed to ky instead: it must be a plain object.
 */
function fakeResponse(body: unknown): ResponsePromise {
  return { json: () => Promise.resolve(body) } as unknown as ResponsePromise;
}

function searchParamsOf(spy: { mock: { calls: unknown[][] } }): unknown {
  const options = spy.mock.calls[0]?.[1] as { searchParams?: unknown } | undefined;
  return options?.searchParams;
}

afterEach(() => vi.restoreAllMocks());

describe('ky searchParams are plain objects (RN URLSearchParams polyfill)', () => {
  it('listTickets passes every filter as a plain record', async () => {
    const get = vi
      .spyOn(tmsClient, 'get')
      .mockReturnValue(fakeResponse({ content: [], totalElements: 0, totalPages: 0 }));
    await listTickets(
      { ...DEFAULT_TICKET_FILTERS, status: 'OPEN', projectId: 3, buildingCode: 'B9', ticketNo: '' },
      2,
    );
    const params = searchParamsOf(get);
    expect(params).not.toBeInstanceOf(URLSearchParams);
    expect(Object.getPrototypeOf(params)).toBe(Object.prototype);
    expect(params).toEqual({
      page: 2,
      size: 15,
      status: 'OPEN',
      sort: 'createdAt,desc',
      projectId: 3,
      buildingCode: 'B9',
    });
  });

  it('updateTicketStatus sends status (and repairCost) as a plain record', async () => {
    const patch = vi.spyOn(tmsClient, 'patch').mockReturnValue(fakeResponse({}));
    await updateTicketStatus('EL-000042', 'RESOLVED', 120);
    const params = searchParamsOf(patch);
    expect(params).not.toBeInstanceOf(URLSearchParams);
    expect(Object.getPrototypeOf(params)).toBe(Object.prototype);
    expect(params).toEqual({ status: 'RESOLVED', repairCost: 120 });
  });

  it('updateTicketStatus omits repairCost when absent', async () => {
    const patch = vi.spyOn(tmsClient, 'patch').mockReturnValue(fakeResponse({}));
    await updateTicketStatus('EL-000042', 'IN_PROGRESS', null);
    expect(searchParamsOf(patch)).toEqual({ status: 'IN_PROGRESS' });
  });
});
