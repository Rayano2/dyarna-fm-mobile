import type { Icons } from '@/shared/ui';

/**
 * Presentation metadata for a facility. Adapted from dyarna-rn
 * `features/facilities/lib/facility-meta.ts`: FM i18n keys, plus CINEMA (no
 * glyph in the shared icon set, so it takes the neutral fallback).
 */

export const FACILITY_TYPES = [
  'GYM',
  'POOL',
  'BBQ',
  'MEETING_ROOM',
  'PARTY_HALL',
  'TENNIS',
  'BASKETBALL',
  'PLAYGROUND',
  'ROOFTOP',
  'LOBBY',
  'GUEST_PARKING',
  'CINEMA',
] as const;

export type FacilityType = (typeof FACILITY_TYPES)[number];

const TYPE_ICONS: Readonly<Record<string, keyof typeof Icons>> = {
  GYM: 'Barbell',
  POOL: 'SwimmingPool',
  BBQ: 'ForkKnife',
  MEETING_ROOM: 'Users',
  PARTY_HALL: 'Confetti',
  TENNIS: 'TennisBall',
  BASKETBALL: 'Basketball',
  PLAYGROUND: 'BabyCarriage',
  ROOFTOP: 'Sun',
  LOBBY: 'Armchair',
  GUEST_PARKING: 'Car',
};

/** Non-directional glyphs — never mirrored in RTL. Unknown codes fall back to `Buildings`. */
export function facilityTypeIcon(code: string | undefined): keyof typeof Icons {
  return TYPE_ICONS[(code ?? '').toUpperCase()] ?? 'Buildings';
}

/** Localized type label, degrading to the raw server code on an i18n miss. */
export function facilityTypeLabel(code: string | undefined, t: (key: string) => string): string {
  if (!code) return '';
  const key = `fm.facilities.type.${code.toUpperCase()}`;
  const value = t(key);
  return value === key ? code : value;
}
