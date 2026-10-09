import type { Icons } from '@/shared/ui';
import type { BuildingInfoItem } from '../api/building-info-api';

/**
 * Category + status presentation for FM building info. Adapted from dyarna-rn
 * `building-info/lib/{category-display,building-info-meta}.ts` with FM keys
 * and the FM-only status filter.
 */

export const BUILDING_INFO_CATEGORIES = [
  'RULES',
  'FAQ',
  'CONTRACT',
  'WARRANTY',
  'GUIDE',
  'EMERGENCY',
  'OTHER',
] as const;

const CATEGORY_ICONS: Readonly<Record<string, keyof typeof Icons>> = {
  RULES: 'Info',
  FAQ: 'Question',
  CONTRACT: 'FileText',
  WARRANTY: 'ShieldCheck',
  GUIDE: 'BookOpen',
  EMERGENCY: 'Warning',
  OTHER: 'FileText',
};

export function categoryIconName(code: string): keyof typeof Icons {
  return CATEGORY_ICONS[code] ?? 'FileText';
}

export function categoryLabel(code: string, t: (key: string) => string): string {
  const key = `fm.buildingInfo.category.${code}`;
  const value = t(key);
  return value === key ? t('fm.buildingInfo.category.OTHER') : value;
}

export type BuildingInfoStatus = 'published' | 'unpublished' | 'expired';
export type BuildingInfoFilter = 'all' | BuildingInfoStatus;

/**
 * Expired wins over the active flag: an expired item is invisible to
 * residents whatever its flag says. Published = active && !expired.
 */
export function itemStatus(
  item: Pick<BuildingInfoItem, 'isActive' | 'isExpired'>,
): BuildingInfoStatus {
  if (item.isExpired) return 'expired';
  return item.isActive ? 'published' : 'unpublished';
}

export function isPublished(item: Pick<BuildingInfoItem, 'isActive' | 'isExpired'>): boolean {
  return itemStatus(item) === 'published';
}

export function statusIconName(status: BuildingInfoStatus): keyof typeof Icons {
  if (status === 'published') return 'Eye';
  if (status === 'unpublished') return 'EyeSlash';
  return 'Clock';
}

export function matchesSearch(item: BuildingInfoItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  return (
    item.title.toLowerCase().includes(needle) ||
    item.summary.toLowerCase().includes(needle) ||
    item.body.toLowerCase().includes(needle)
  );
}

export function filterItems(
  items: readonly BuildingInfoItem[],
  filter: BuildingInfoFilter,
  query: string,
): BuildingInfoItem[] {
  return items.filter(
    (item) => (filter === 'all' || itemStatus(item) === filter) && matchesSearch(item, query),
  );
}
