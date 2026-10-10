import type { FilterBuilding, FilterProject } from '@/shared/api/project-buildings-filter';

export interface QrSelection {
  project: FilterProject | undefined;
  building: FilterBuilding | undefined;
}

/**
 * The project and building the QR card shows. An unset or stale pick falls
 * back to the first project that has a building (then the first project) and
 * that project's first building, as the web card does.
 */
export function resolveQrSelection(
  projects: readonly FilterProject[],
  projectId: number | null,
  buildingCode: string | null,
): QrSelection {
  const project =
    projects.find((p) => p.projectId === projectId) ??
    projects.find((p) => p.buildings.length > 0) ??
    projects[0];
  const building =
    project?.buildings.find((b) => b.buildingCode === buildingCode) ?? project?.buildings[0];
  return { project, building };
}
