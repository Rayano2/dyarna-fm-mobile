import { asNumber } from './coerce';
import { safeMapList } from './safe-map';

export interface Page<T> {
  content: T[];
  page: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/**
 * BMS `PageResponse<T>`: `{content, page, size, totalElements, totalPages,
 * last}`. Rows that fail to map are dropped (and reported), never thrown.
 */
export function mapPage<T>(
  raw: unknown,
  mapItem: (item: unknown) => T,
  entity: string,
  feature: string,
): Page<T> {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const list = Array.isArray(obj.content) ? obj.content : [];
  const page = asNumber(obj.page);
  const totalPages = asNumber(obj.totalPages);
  const last = typeof obj.last === 'boolean' ? obj.last : page + 1 >= totalPages;
  return {
    content: safeMapList(list, mapItem, { feature, entity }),
    page,
    totalElements: asNumber(obj.totalElements),
    totalPages,
    last,
  };
}
