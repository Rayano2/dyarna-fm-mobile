import { asNumber, asString, asStringOrUndef } from '@/shared/api/coerce';
import { safeMapList } from '@/shared/api/safe-map';

/**
 * One unit of `GET api/bms/company-reps/properties-list` (BMS
 * `PropertyUnitResponse`). Structurally a superset of the requests feature's
 * `BuildingUnit`, so `unitOccupancy` applies to it unchanged.
 */
export interface PropertyUnit {
  propertyUnitId: number;
  unitNumber: string;
  floorNumber: number;
  /** 0 when absent: this endpoint does not send `occupantCount`. */
  occupantCount: number;
  /** Absent when vacant, or when BMS's UMS name lookup failed. */
  residentFullName: string | undefined;
  residentMobile: string | undefined;
}

/** BMS `BuildingHierarchyResponse`. */
export interface PropertyBuilding {
  buildingCode: string;
  buildingName: string;
  units: PropertyUnit[];
}

/** BMS `ProjectHierarchyResponse`. */
export interface PropertyProject {
  projectId: number;
  projectName: string;
  cityCode: string | undefined;
  /** BMS sends only the name. Null when the project has no president. */
  president: { fullName: string } | null;
  buildings: PropertyBuilding[];
}

/** `GET .../projects/{projectId}/users` (BMS `CompanyRepUserResponse`). */
export interface ProjectUser {
  userId: string;
  fullName: string;
}

/** BMS sends Longs; tolerate the string form the web's type declares. */
function toId(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return Number.NaN;
}

function asList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function mapPropertyUnit(raw: unknown): PropertyUnit {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const unitNumber = asString(obj.unitNumber).trim();
  if (!unitNumber) throw new Error('unit without a number');
  const floor = asNumber(obj.floorNumber);
  return {
    propertyUnitId: asNumber(obj.propertyUnitId),
    unitNumber,
    floorNumber: Number.isFinite(floor) ? floor : 0,
    occupantCount: Math.max(0, asNumber(obj.occupantCount)),
    residentFullName: asStringOrUndef(obj.residentFullName)?.trim() || undefined,
    residentMobile: asStringOrUndef(obj.residentMobile)?.trim() || undefined,
  };
}

export function mapPropertyBuilding(raw: unknown): PropertyBuilding {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const buildingCode = asString(obj.buildingCode).trim();
  if (!buildingCode) throw new Error('building without a code');
  return {
    buildingCode,
    buildingName: asString(obj.buildingName).trim() || buildingCode,
    units: safeMapList(asList(obj.properties), mapPropertyUnit, {
      feature: 'properties',
      entity: 'unit',
    }),
  };
}

export function mapPropertyProject(raw: unknown): PropertyProject {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const projectId = toId(obj.projectId);
  if (!Number.isFinite(projectId)) throw new Error('project without an id');
  const president = (obj.president ?? null) as Record<string, unknown> | null;
  const presidentName =
    president && typeof president === 'object' ? asString(president.fullName).trim() : '';
  return {
    projectId,
    projectName: asString(obj.projectName).trim(),
    cityCode: asStringOrUndef(obj.cityCode),
    president: presidentName ? { fullName: presidentName } : null,
    buildings: safeMapList(asList(obj.buildings), mapPropertyBuilding, {
      feature: 'properties',
      entity: 'building',
    }),
  };
}

export function mapPropertiesList(body: unknown): PropertyProject[] {
  return safeMapList(asList(body), mapPropertyProject, {
    feature: 'properties',
    entity: 'project',
  });
}

export function mapProjectUser(raw: unknown): ProjectUser {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const userId = asString(obj.userId);
  if (!userId) throw new Error('user without an id');
  return { userId, fullName: asString(obj.fullName).trim() };
}

/** A plain list today; the web also tolerates a `{content}` page, so do we. */
export function mapProjectUsers(body: unknown): ProjectUser[] {
  const list = Array.isArray(body)
    ? body
    : asList((body as { content?: unknown } | null | undefined)?.content);
  return safeMapList(list, mapProjectUser, { feature: 'properties', entity: 'project-user' });
}
