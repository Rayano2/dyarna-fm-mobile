/**
 * The fields occupancy is derived from. Structural, so both the requests
 * feature's `BuildingUnit` and the properties feature's `PropertyUnit` fit.
 */
export interface OccupancyUnit {
  /** Active residents in the unit. 0 when absent (older BMS builds). */
  occupantCount: number;
  /** Absent when vacant, or when BMS's UMS name lookup failed. */
  residentFullName: string | undefined;
}

export interface UnitOccupancy {
  occupied: boolean;
  /** Occupied units can't be picked: BMS refuses with BMS_400_14 anyway. */
  selectable: boolean;
  /** Residents beyond the named one ("+n"). 0 when there is at most one. */
  extraOccupants: number;
}

/**
 * A unit with a named resident is occupied even when `occupantCount` is
 * missing (older BMS builds report the name but not the count).
 */
export function unitOccupancy(unit: OccupancyUnit): UnitOccupancy {
  const occupied = unit.occupantCount > 0 || !!unit.residentFullName;
  return {
    occupied,
    selectable: !occupied,
    extraOccupants: Math.max(0, unit.occupantCount - 1),
  };
}
