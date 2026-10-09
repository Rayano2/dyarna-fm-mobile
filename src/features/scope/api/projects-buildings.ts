import { bmsClient } from '@/shared/api/clients';
import { asString } from '@/shared/api/coerce';

export interface ScopeBuilding {
  /** BMS `Long`, carried as a string so it can go straight into a query param. */
  buildingId: string;
  buildingCode: string;
  buildingName: string;
}

export interface ScopeProject {
  projectId: string;
  projectName: string;
  buildings: ScopeBuilding[];
}

function idString(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return asString(value);
}

function toBuilding(raw: unknown): ScopeBuilding | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const buildingId = idString(obj.buildingId);
  if (buildingId.length === 0) return null;
  const buildingCode = asString(obj.buildingCode);
  return {
    buildingId,
    buildingCode,
    buildingName: asString(obj.buildingName) || buildingCode || buildingId,
  };
}

/** Normalizes `ProjectBuildingsFilterResponse[]` (BMS `CompanyRepresentativeController.java:203`). */
export function toScopeProjects(res: unknown): ScopeProject[] {
  const list = Array.isArray(res) ? res : [];
  const projects: ScopeProject[] = [];
  for (const raw of list) {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const projectId = idString(obj.projectId);
    if (projectId.length === 0) continue;
    const buildings = (Array.isArray(obj.buildings) ? obj.buildings : [])
      .map((b) => toBuilding(b))
      .filter((b): b is ScopeBuilding => b !== null);
    projects.push({ projectId, projectName: asString(obj.projectName) || projectId, buildings });
  }
  return projects;
}

/** `GET api/bms/company-reps/projects-buildings-filter` — the rep's projects with their buildings. */
export async function getScopeProjects(): Promise<ScopeProject[]> {
  const res = await bmsClient.get('api/bms/company-reps/projects-buildings-filter').json<unknown>();
  return toScopeProjects(res);
}
