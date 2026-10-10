import { ApiError } from '@/shared/api/errors';
import { queryKeys } from '@/shared/api/query-keys';
import type { OffboardResult, Resident } from '../api/mappers';

/** BMS `RESIDENT_IS_ACTIVE_PRESIDENT`: reassign the presidency before offboarding. */
export const PRESIDENT_CODE = 'BMS_400_15';

/**
 * The inline error the offboard sheet shows. Never a toast: the sheet stays
 * open so the typed reason survives a retry.
 * - `president`: BMS_400_15, with a "Go to properties" action;
 * - `forbidden`: 403, the building is not one this company manages;
 * - `generic`: anything else.
 */
export type OffboardErrorKind = 'president' | 'forbidden' | 'generic';

export function classifyOffboardError(error: unknown): OffboardErrorKind {
  if (error instanceof ApiError) {
    if (error.code === PRESIDENT_CODE) return 'president';
    if (error.status === 403) return 'forbidden';
  }
  return 'generic';
}

/** Toast key for a successful offboard; a repeat call reports "already offboarded". */
export function offboardSuccessToastKey(
  result: OffboardResult,
): 'fm.residents.offboardedToast' | 'fm.residents.offboardedAlready' {
  return result.alreadyOffboarded
    ? 'fm.residents.offboardedAlready'
    : 'fm.residents.offboardedToast';
}

/** Caches an offboard invalidates: the resident lists, details and unit occupancy. */
export const OFFBOARD_INVALIDATIONS: readonly (readonly unknown[])[] = [
  queryKeys.fmResidents.residents,
  queryKeys.fmResidents.residentDetails,
  queryKeys.fmResidents.buildingUnitsAll,
];

/**
 * Client-side search over the loaded residents (web parity): the name
 * case-insensitively, the mobile number as typed (spaces ignored).
 */
export function filterResidentsBySearch(residents: readonly Resident[], query: string): Resident[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...residents];
  const digits = needle.replaceAll(/\s+/g, '');
  return residents.filter(
    (r) =>
      r.fullName.toLowerCase().includes(needle) ||
      (r.mobile?.replaceAll(/\s+/g, '').includes(digits) ?? false),
  );
}

/** Stable row key: one row per unit-link, so the link id disambiguates. */
export function residentRowKey(resident: Resident, index: number): string {
  return `${resident.userId}:${resident.unitResidentId ?? `i${index}`}`;
}
