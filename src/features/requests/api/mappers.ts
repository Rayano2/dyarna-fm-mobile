import { asNumber, asString, asStringOrUndef } from '@/shared/api/coerce';

export type ResidentRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'OTHER';

/**
 * One row of `GET api/bms/residents` (BMS `ResidentLinkResponse`). The DTO
 * carries no rejection reason and no updatedAt, so neither is modelled.
 */
export interface ResidentRequest {
  requestId: number;
  fullName: string;
  email: string | undefined;
  mobile: string | undefined;
  projectName: string | undefined;
  buildingCode: string | undefined;
  buildingName: string | undefined;
  /** Null until approved (BMS fills it from the active unit link). */
  unitNumber: string | undefined;
  status: ResidentRequestStatus;
  createdAt: string | undefined;
}

/** One unit of `GET api/bms/company-reps/buildings/{code}/units` (BMS `PropertyUnitResponse`). */
export interface BuildingUnit {
  propertyUnitId: number;
  unitNumber: string;
  /** Active residents in the unit. 0 when absent (older BMS builds). */
  occupantCount: number;
  /** Absent when vacant, or when BMS's UMS name lookup failed. */
  residentFullName: string | undefined;
}

const STATUSES: ReadonlySet<string> = new Set(['PENDING', 'APPROVED', 'REJECTED']);

function toStatus(raw: unknown): ResidentRequestStatus {
  const value = asString(raw).toUpperCase();
  return STATUSES.has(value) ? (value as ResidentRequestStatus) : 'OTHER';
}

export function mapResidentRequest(raw: unknown): ResidentRequest {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const requestId = asNumber(obj.requestId, Number.NaN);
  if (!Number.isFinite(requestId)) throw new Error('request without an id');
  const fullName = [asString(obj.firstName).trim(), asString(obj.lastName).trim()]
    .filter((part) => part.length > 0)
    .join(' ');
  return {
    requestId,
    fullName,
    email: asStringOrUndef(obj.email),
    mobile: asStringOrUndef(obj.mobile),
    projectName: asStringOrUndef(obj.projectName),
    buildingCode: asStringOrUndef(obj.buildingCode),
    buildingName: asStringOrUndef(obj.buildingName),
    unitNumber: asStringOrUndef(obj.unitNumber),
    status: toStatus(obj.status),
    createdAt: asStringOrUndef(obj.createdAt),
  };
}

export function mapBuildingUnit(raw: unknown): BuildingUnit {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const unitNumber = asString(obj.unitNumber).trim();
  if (!unitNumber) throw new Error('unit without a number');
  return {
    propertyUnitId: asNumber(obj.propertyUnitId),
    unitNumber,
    occupantCount: Math.max(0, asNumber(obj.occupantCount)),
    residentFullName: asStringOrUndef(obj.residentFullName),
  };
}
