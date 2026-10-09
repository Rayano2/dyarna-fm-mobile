import type { BadgeTone } from '@/shared/ui';

/**
 * Ticket status / priority -> badge tone + i18n key, for the dashboard's recent
 * tickets. Temporary home: to be consolidated with the Tickets feature (T7).
 * Unknown codes render the raw code on a neutral pill rather than vanish.
 */
const STATUS_TONES: Record<string, BadgeTone> = {
  OPEN: 'info',
  ASSIGNED: 'primarySubtle',
  IN_PROGRESS: 'gold',
  RESOLVED: 'primary',
  CLOSED: 'neutral',
  BREACHED: 'danger',
  ESCALATED: 'danger',
  NOT_ACTIONABLE: 'neutral',
  ON_HOLD: 'goldMuted',
  CANCELLED: 'neutral',
};

const PRIORITY_TONES: Record<string, BadgeTone> = {
  LOW: 'neutral',
  MEDIUM: 'primaryMuted',
  HIGH: 'gold',
  URGENT: 'danger',
  CRITICAL: 'danger',
  EMERGENCY: 'danger',
};

export interface BadgeSpec {
  tone: BadgeTone;
  /** i18n key, or null for an unknown code (render the code itself). */
  labelKey: string | null;
}

function spec(
  code: string,
  tones: Record<string, BadgeTone>,
  namespace: 'status' | 'priority',
): BadgeSpec {
  const upper = code.toUpperCase();
  const tone = tones[upper];
  if (tone === undefined) return { tone: 'neutral', labelKey: null };
  return { tone, labelKey: `fm.dashboard.${namespace}.${upper}` };
}

export function statusBadge(code: string): BadgeSpec {
  return spec(code, STATUS_TONES, 'status');
}

export function priorityBadge(code: string): BadgeSpec {
  return spec(code, PRIORITY_TONES, 'priority');
}

type Translate = (key: string) => string;

/** The localized status names the DTO already carries (`statusNameAr/En`). */
export interface StatusNames {
  statusNameAr: string;
  statusNameEn: string;
}

/**
 * Status label: our key for a known code; for an unknown one the server's own
 * localized name (current locale first, then the other), and only then the raw code.
 */
export function statusLabel(
  code: string,
  names: StatusNames,
  t: Translate,
  isArabic: boolean,
): string {
  const { labelKey } = statusBadge(code);
  if (labelKey) return t(labelKey);
  const [first, second] = isArabic
    ? [names.statusNameAr, names.statusNameEn]
    : [names.statusNameEn, names.statusNameAr];
  return first || second || code;
}

/** Priority label: our key for a known code, else the raw code (the DTO has no name). */
export function priorityLabel(code: string, t: Translate): string {
  const { labelKey } = priorityBadge(code);
  return labelKey ? t(labelKey) : code;
}
