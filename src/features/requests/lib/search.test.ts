import { describe, expect, it } from 'vitest';
import type { ResidentRequest } from '../api/mappers';
import { filterRequestsBySearch } from './search';

function request(
  requestId: number,
  fullName: string,
  mobile?: string,
  email?: string,
): ResidentRequest {
  return {
    requestId,
    fullName,
    email,
    mobile,
    projectName: undefined,
    buildingCode: undefined,
    buildingName: undefined,
    unitNumber: undefined,
    status: 'PENDING',
    createdAt: undefined,
  };
}

const ROWS = [
  request(1, 'Sara Ali', '+966 50 111 2222', 'sara@x.com'),
  request(2, 'Omar Saleh', '+966500003333', 'omar@y.com'),
  request(3, 'سارة أحمد'),
];

describe('filterRequestsBySearch (client-side, loaded pages only)', () => {
  it('returns everything for a blank query', () => {
    expect(filterRequestsBySearch(ROWS, '  ')).toHaveLength(3);
  });

  it('matches the name case-insensitively, including Arabic', () => {
    expect(filterRequestsBySearch(ROWS, 'SARA').map((r) => r.requestId)).toEqual([1]);
    expect(filterRequestsBySearch(ROWS, 'سارة').map((r) => r.requestId)).toEqual([3]);
  });

  it('matches the mobile ignoring spaces', () => {
    expect(filterRequestsBySearch(ROWS, '501112222').map((r) => r.requestId)).toEqual([1]);
    expect(filterRequestsBySearch(ROWS, '3333').map((r) => r.requestId)).toEqual([2]);
  });

  it('matches the email', () => {
    expect(filterRequestsBySearch(ROWS, '@y.com').map((r) => r.requestId)).toEqual([2]);
  });
});
