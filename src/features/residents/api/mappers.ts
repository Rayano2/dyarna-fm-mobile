import { asBoolean, asNumber, asString, asStringOrUndef } from '@/shared/api/coerce';

/**
 * One row of `GET api/bms/company-reps/residents` (BMS `ResidentListResponse`).
 * The list is one row per unit-link: a resident in two buildings appears twice,
 * each row with its own `unitResidentId`.
 */
export interface Resident {
  userId: string;
  /** The unit-link this row is. Absent only on BMS builds older than offboarding. */
  unitResidentId: number | undefined;
  fullName: string;
  email: string | undefined;
  mobile: string | undefined;
  unitNumber: string | undefined;
  buildingName: string | undefined;
  buildingCode: string | undefined;
  projectName: string | undefined;
  projectId: number | undefined;
  floorNumber: number | undefined;
  registrationDate: string | undefined;
}

export interface LastTicket {
  ticketId: string;
  title: string;
  status: string;
  createdAt: string | undefined;
}

/** `GET api/bms/company-reps/residents/{userId}` (BMS `ResidentDetailsResponse`). */
export interface ResidentDetails extends Resident {
  openTicketsCount: number;
  closedTicketsCount: number;
  /** False once offboarded. Undefined on BMS builds that predate the flag. */
  active: boolean | undefined;
  lastTicket: LastTicket | undefined;
}

/** `POST .../offboard` (BMS `OffboardResidentResponse`). */
export interface OffboardResult {
  userId: string;
  deactivatedLinks: number;
  unitNumbers: string[];
  offboardedAt: string | undefined;
  /** True when the link was already inactive, so nothing changed. */
  alreadyOffboarded: boolean;
}

function optNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function mapResident(raw: unknown): Resident {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const userId = asString(obj.userId);
  if (!userId) throw new Error('resident without a userId');
  return {
    userId,
    unitResidentId: optNumber(obj.unitResidentId),
    fullName: asString(obj.fullName).trim(),
    email: asStringOrUndef(obj.email),
    mobile: asStringOrUndef(obj.mobile),
    unitNumber: asStringOrUndef(obj.unitNumber),
    buildingName: asStringOrUndef(obj.buildingName),
    buildingCode: asStringOrUndef(obj.buildingCode),
    projectName: asStringOrUndef(obj.projectName),
    // BMS sends a Long; tolerate the string form the web's type declares.
    projectId: optNumber(obj.projectId),
    floorNumber: optNumber(obj.floorNumber),
    registrationDate: asStringOrUndef(obj.registrationDate),
  };
}

function mapLastTicket(raw: unknown): LastTicket | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const ticketId = asString(obj.ticketId);
  if (!ticketId) return undefined;
  return {
    ticketId,
    title: asString(obj.title),
    status: asString(obj.status),
    createdAt: asStringOrUndef(obj.createdAt),
  };
}

export function mapResidentDetails(raw: unknown): ResidentDetails {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    ...mapResident(raw),
    openTicketsCount: asNumber(obj.openTicketsCount),
    closedTicketsCount: asNumber(obj.closedTicketsCount),
    active: typeof obj.active === 'boolean' ? obj.active : undefined,
    lastTicket: mapLastTicket(obj.lastTicket),
  };
}

export function mapOffboardResult(raw: unknown): OffboardResult {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    userId: asString(obj.userId),
    deactivatedLinks: asNumber(obj.deactivatedLinks),
    unitNumbers: Array.isArray(obj.unitNumbers)
      ? obj.unitNumbers.filter((u): u is string => typeof u === 'string')
      : [],
    offboardedAt: asStringOrUndef(obj.offboardedAt),
    alreadyOffboarded: asBoolean(obj.alreadyOffboarded),
  };
}
