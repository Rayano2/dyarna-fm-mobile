import type { ResidentRequest } from '../api/mappers';

/**
 * Client-side search over the requests already loaded (web parity: there is
 * no server search). Matches name and email case-insensitively and the mobile
 * number as typed, ignoring spaces in both.
 */
export function filterRequestsBySearch(
  requests: readonly ResidentRequest[],
  query: string,
): ResidentRequest[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...requests];
  const digits = needle.replaceAll(/\s+/g, '');
  return requests.filter(
    (r) =>
      r.fullName.toLowerCase().includes(needle) ||
      (r.email?.toLowerCase().includes(needle) ?? false) ||
      (digits.length > 0 && (r.mobile?.replaceAll(/\s+/g, '').includes(digits) ?? false)),
  );
}
