import type { FilterBuilding, FilterProject } from '@/shared/api/project-buildings-filter';

/** The project/building scope the FM lists filter by. Both unset = everything. */
export interface ProjectBuildingFilter {
  projectId: number | null;
  buildingCode: string | null;
}

export const EMPTY_PROJECT_BUILDING_FILTER: ProjectBuildingFilter = {
  projectId: null,
  buildingCode: null,
};

/**
 * Choosing a different project clears the building: a building belongs to
 * exactly one project, so keeping the old one would filter by a building that
 * is not in the chosen project (and the list would come back empty). Picking
 * the same project again keeps the building.
 */
export function selectProject(
  filter: ProjectBuildingFilter,
  projectId: number | null,
): ProjectBuildingFilter {
  if (filter.projectId === projectId) return filter;
  return { projectId, buildingCode: null };
}

/** A building can only be chosen once a project is; otherwise it's a no-op. */
export function selectBuilding(
  filter: ProjectBuildingFilter,
  buildingCode: string | null,
): ProjectBuildingFilter {
  if (filter.projectId === null) return filter;
  return { ...filter, buildingCode };
}

/** Number of active filters, for the filter button's count badge. */
export function activeFilterCount(filter: ProjectBuildingFilter): number {
  return (filter.projectId === null ? 0 : 1) + (filter.buildingCode === null ? 0 : 1);
}

export function buildingsForProject(
  projects: readonly FilterProject[],
  projectId: number | null,
): FilterBuilding[] {
  if (projectId === null) return [];
  return projects.find((p) => p.projectId === projectId)?.buildings ?? [];
}
