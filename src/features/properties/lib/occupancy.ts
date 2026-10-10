// Deep import on purpose (allow-listed in eslint.config.mjs): the barrel
// drags React Native screens into these node-tested helpers.
import { unitOccupancy } from '@/features/requests/lib/units';
import type { ProjectBuildingFilter } from '@/shared/lib/project-building-filter';
import type { ProjectUser, PropertyBuilding, PropertyProject, PropertyUnit } from '../api/mappers';

export interface OccupancyStats {
  buildings: number;
  units: number;
  occupied: number;
  /** occupied / units in [0, 1]; 0 when there are no units. */
  ratio: number;
}

export function isOccupied(unit: PropertyUnit): boolean {
  return unitOccupancy(unit).occupied;
}

function ratio(occupied: number, units: number): number {
  return units > 0 ? Math.min(1, occupied / units) : 0;
}

export function buildingStats(building: PropertyBuilding): OccupancyStats {
  const occupied = building.units.filter((u) => isOccupied(u)).length;
  return {
    buildings: 1,
    units: building.units.length,
    occupied,
    ratio: ratio(occupied, building.units.length),
  };
}

export function projectStats(project: PropertyProject): OccupancyStats {
  let units = 0;
  let occupied = 0;
  for (const building of project.buildings) {
    const stats = buildingStats(building);
    units += stats.units;
    occupied += stats.occupied;
  }
  return { buildings: project.buildings.length, units, occupied, ratio: ratio(occupied, units) };
}

export type UnitFilter = 'all' | 'occupied' | 'vacant';

export function filterUnits(units: readonly PropertyUnit[], filter: UnitFilter): PropertyUnit[] {
  if (filter === 'all') return [...units];
  const wantOccupied = filter === 'occupied';
  return units.filter((u) => isOccupied(u) === wantOccupied);
}

/**
 * Client-side project/building filter for the properties list (the endpoint
 * takes no parameters). A chosen building narrows its project to that one
 * building, so the card's counts describe what is shown.
 */
export function filterProjects(
  projects: readonly PropertyProject[],
  filter: ProjectBuildingFilter,
): PropertyProject[] {
  const out: PropertyProject[] = [];
  for (const project of projects) {
    if (filter.projectId !== null && project.projectId !== filter.projectId) continue;
    if (filter.buildingCode === null) {
      out.push(project);
      continue;
    }
    const buildings = project.buildings.filter((b) => b.buildingCode === filter.buildingCode);
    if (buildings.length > 0) out.push({ ...project, buildings });
  }
  return out;
}

export function searchUsers(users: readonly ProjectUser[], query: string): ProjectUser[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [...users];
  return users.filter((u) => u.fullName.toLocaleLowerCase().includes(needle));
}
