import { unitOccupancy } from '@/shared/lib/unit-occupancy';
import type { BuildingUnit } from '../api/mappers';

/**
 * Which hint the approve sheet shows above the unit list:
 * - `none`: the building has no units (link to add one);
 * - `allOccupied`: nothing can be picked (links to Residents and Properties);
 * - `someOccupied`: some rows are disabled;
 * - `allVacant`: no hint.
 */
export type UnitsSummary = 'none' | 'allOccupied' | 'someOccupied' | 'allVacant';

export function summarizeUnits(units: readonly BuildingUnit[]): UnitsSummary {
  if (units.length === 0) return 'none';
  const occupied = units.filter((u) => unitOccupancy(u).occupied).length;
  if (occupied === units.length) return 'allOccupied';
  return occupied > 0 ? 'someOccupied' : 'allVacant';
}

/**
 * Keep a selection only while it still names a selectable unit. After a
 * refetch shows the chosen unit taken, the selection must not survive.
 */
export function reconcileSelection(
  selected: string | null,
  units: readonly BuildingUnit[],
): string | null {
  if (selected === null) return null;
  const unit = units.find((u) => u.unitNumber === selected);
  return unit && unitOccupancy(unit).selectable ? selected : null;
}
