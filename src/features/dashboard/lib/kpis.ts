import type { Icons } from '@/shared/ui';
import {
  FM_PROPERTIES,
  FM_REQUESTS,
  FM_TICKETS,
  FM_TODOS,
  type FmDestination,
} from '@/shared/lib/fm-routes';
import type { DashboardInfo } from '../api/dashboard-api';

export type KpiKind = 'openTickets' | 'pendingRequests' | 'activeProperties' | 'myTasks';

export interface KpiTileSpec {
  kind: KpiKind;
  icon: keyof typeof Icons;
  /** `fm.dashboard.kpi.<kind>` and `<kind>Desc`. */
  labelKey: string;
  descKey: string;
  destination: FmDestination;
}

const DESTINATIONS: Record<KpiKind, FmDestination> = {
  openTickets: FM_TICKETS,
  pendingRequests: FM_REQUESTS,
  activeProperties: FM_PROPERTIES,
  myTasks: FM_TODOS,
};

const ICONS: Record<KpiKind, keyof typeof Icons> = {
  openTickets: 'Wrench',
  pendingRequests: 'UserPlus',
  activeProperties: 'Buildings',
  myTasks: 'ListChecks',
};

export const KPI_ORDER: readonly KpiKind[] = [
  'openTickets',
  'pendingRequests',
  'activeProperties',
  'myTasks',
];

export function kpiDestination(kind: KpiKind): FmDestination {
  return DESTINATIONS[kind];
}

export function kpiTile(kind: KpiKind): KpiTileSpec {
  return {
    kind,
    icon: ICONS[kind],
    labelKey: `fm.dashboard.kpi.${kind}`,
    descKey: `fm.dashboard.kpi.${kind}Desc`,
    destination: DESTINATIONS[kind],
  };
}

/**
 * The tile's value. `null` means "unknown" (rendered as an en dash): only the
 * My tasks tile can be unknown on its own, when the todos query failed.
 */
export function kpiValue(
  kind: KpiKind,
  info: DashboardInfo | undefined,
  activeTodos?: number,
): number | null {
  if (kind === 'myTasks') return activeTodos ?? null;
  if (!info) return 0;
  if (kind === 'openTickets') return info.openMaintenanceTicketsCount;
  if (kind === 'pendingRequests') return info.pendingResidentRequestsCount;
  return info.activeUnitsCount;
}

/** Morning before 12:00, afternoon before 18:00, evening after. */
export function greetingKey(hour: number): string {
  if (hour < 12) return 'fm.dashboard.greetingMorning';
  if (hour < 18) return 'fm.dashboard.greetingAfternoon';
  return 'fm.dashboard.greetingEvening';
}
