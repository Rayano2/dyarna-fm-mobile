import { communityClient } from '@/shared/api/clients';
import { asString } from '@/shared/api/coerce';

export interface Facility {
  /** UUID string. */
  id: string;
  name: string;
  facilityType: string;
  description: string;
  location: string;
  capacity: number | undefined;
  projectId: string;
  /** Undefined = project-wide (`buildingId: null` on the wire). */
  buildingId: string | undefined;
  requiresApproval: boolean;
  /** Null = no advance-booking limit. */
  advanceBookingDays: number | null;
  maxDurationHours: number;
  isActive: boolean;
}

/** Wire body for `POST /api/v1/facilities` and `PUT /api/v1/facilities/{id}` (`CreateFacilityRequest`). */
export interface FacilityPayload {
  name: string;
  facilityType: string;
  description: string;
  location: string;
  capacity: number | null;
  projectId: number;
  buildingId: number | null;
  requiresApproval: boolean;
  /** NEVER 0: null means "no limit"; the server rejects anything outside 1–365. */
  advanceBookingDays: number | null;
  maxDurationHours: number;
}

function idString(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return asString(value);
}

function positiveIntOrUndef(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

/**
 * The active flag. `FacilityResponse` serializes it as `isActive`
 * (`@JsonProperty("isActive")`), older builds as `active`; absent means active.
 */
export function readIsActive(obj: Record<string, unknown>): boolean {
  const value = obj.isActive ?? obj.active;
  return typeof value === 'boolean' ? value : true;
}

export function toFacility(raw: unknown): Facility | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const id = asString(obj.id);
  if (id.length === 0) return null;
  const buildingId = idString(obj.buildingId);
  return {
    id,
    name: asString(obj.name),
    facilityType: asString(obj.facilityType),
    description: asString(obj.description),
    location: asString(obj.location),
    capacity: positiveIntOrUndef(obj.capacity),
    projectId: idString(obj.projectId),
    buildingId: buildingId.length > 0 ? buildingId : undefined,
    requiresApproval: obj.requiresApproval === true,
    advanceBookingDays: positiveIntOrUndef(obj.advanceBookingDays) ?? null,
    maxDurationHours: positiveIntOrUndef(obj.maxDurationHours) ?? 4,
    isActive: readIsActive(obj),
  };
}

export async function listFacilities(
  projectId: string,
  buildingId: string | undefined,
): Promise<Facility[]> {
  const searchParams: Record<string, string> = { projectId, includeInactive: 'true' };
  if (buildingId) searchParams.buildingId = buildingId;
  const res = await communityClient.get('api/v1/facilities', { searchParams }).json<unknown>();
  return (Array.isArray(res) ? res : [])
    .map((raw) => toFacility(raw))
    .filter((f): f is Facility => f !== null);
}

export async function createFacility(payload: FacilityPayload): Promise<void> {
  await communityClient.post('api/v1/facilities', { json: payload });
}

export async function updateFacility(id: string, payload: FacilityPayload): Promise<void> {
  await communityClient.put(`api/v1/facilities/${encodeURIComponent(id)}`, { json: payload });
}

export interface FacilityActiveResult {
  isActive: boolean;
  affectedFutureBookings: number;
}

export function toActiveResult(res: unknown, requested: boolean): FacilityActiveResult {
  const obj = (res ?? {}) as Record<string, unknown>;
  const affected = obj.affectedFutureBookings;
  const value = obj.isActive ?? obj.active;
  return {
    isActive: typeof value === 'boolean' ? value : requested,
    affectedFutureBookings:
      typeof affected === 'number' && Number.isFinite(affected) && affected > 0 ? affected : 0,
  };
}

/** `PATCH /api/v1/facilities/{id}/active?active=bool` — query param only, NO body. */
export async function setFacilityActive(
  id: string,
  active: boolean,
): Promise<FacilityActiveResult> {
  const res = await communityClient
    .patch(`api/v1/facilities/${encodeURIComponent(id)}/active`, {
      searchParams: { active: String(active) },
    })
    .json<unknown>();
  return toActiveResult(res, active);
}
