import { bmsClient } from './clients';
import { asNumber, asString } from './coerce';
import { safeMapList } from './safe-map';

export interface FilterBuilding {
  buildingCode: string;
  buildingName: string;
}

export interface FilterProject {
  projectId: number;
  projectName: string;
  buildings: FilterBuilding[];
}

/**
 * Projects (and their buildings) the caller's company manages. BMS resolves
 * the company from the authenticated principal (Bearer), so the call takes no
 * parameters. `ProjectBuildingsFilterResponse`: `{projectId, projectName,
 * buildings:[{buildingId, buildingCode, buildingName}]}`.
 */
export const PROJECTS_BUILDINGS_FILTER_PATH = 'api/bms/company-reps/projects-buildings-filter';

function mapBuilding(raw: unknown): FilterBuilding {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const buildingCode = asString(obj.buildingCode);
  if (!buildingCode) throw new Error('building without a code');
  return { buildingCode, buildingName: asString(obj.buildingName, buildingCode) };
}

export function mapFilterProject(raw: unknown): FilterProject {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const projectId = asNumber(obj.projectId, Number.NaN);
  if (!Number.isFinite(projectId)) throw new Error('project without an id');
  const buildings = Array.isArray(obj.buildings)
    ? safeMapList(obj.buildings, (b) => mapBuilding(b), { feature: 'filters', entity: 'building' })
    : [];
  return { projectId, projectName: asString(obj.projectName), buildings };
}

export async function fetchProjectsBuildingsFilter(): Promise<FilterProject[]> {
  const body = await bmsClient.get(PROJECTS_BUILDINGS_FILTER_PATH).json<unknown>();
  const list = Array.isArray(body) ? body : [];
  return safeMapList(list, (p) => mapFilterProject(p), { feature: 'filters', entity: 'project' });
}
