import { bmsClient } from '@/shared/api/clients';
import { safeMapList } from '@/shared/api/safe-map';
import {
  mapBuildingUnit,
  mapResidentRequest,
  type BuildingUnit,
  type ResidentRequest,
} from './mappers';
import { mapPage, type Page } from '@/shared/api/page';

/** BMS caps this endpoint at 10 per page (`ResidentService`), same as the web. */
export const REQUESTS_PAGE_SIZE = 10;

export interface ResidentRequestsQuery {
  page: number;
  /** `PENDING` for the Pending segment; null lists every status. */
  status: 'PENDING' | null;
  projectId: number | null;
  buildingCode: string | null;
}

/**
 * `GET api/bms/residents`. The web sends a JSON body `[]` with this GET, but
 * the controller has no `@RequestBody` (ResidentRegistrationController), so
 * none is sent here. Company scope comes from the Bearer principal.
 */
export async function fetchResidentRequests(
  query: ResidentRequestsQuery,
): Promise<Page<ResidentRequest>> {
  const searchParams: Record<string, string | number> = {
    page: query.page,
    size: REQUESTS_PAGE_SIZE,
  };
  if (query.status) searchParams.status = query.status;
  if (query.projectId !== null) searchParams.projectId = query.projectId;
  if (query.buildingCode) searchParams.buildingCode = query.buildingCode;
  const body = await bmsClient.get('api/bms/residents', { searchParams }).json<unknown>();
  return mapPage(body, (raw) => mapResidentRequest(raw), 'resident-request', 'requests');
}

/** `GET api/bms/company-reps/buildings/{code}/units`: a plain list, not paged. */
export async function fetchBuildingUnits(buildingCode: string): Promise<BuildingUnit[]> {
  const body = await bmsClient
    .get(`api/bms/company-reps/buildings/${encodeURIComponent(buildingCode)}/units`)
    .json<unknown>();
  const list = Array.isArray(body) ? body : [];
  return safeMapList(list, (raw) => mapBuildingUnit(raw), { feature: 'requests', entity: 'unit' });
}

export async function approveResidentRequest(requestId: number, unitNumber: string): Promise<void> {
  await bmsClient.patch(
    `api/bms/resident-link-requests/${requestId}/${encodeURIComponent(unitNumber)}/approve`,
  );
}

/** The reason travels as a query parameter (`@RequestParam String reason`). */
export async function rejectResidentRequest(requestId: number, reason: string): Promise<void> {
  await bmsClient.patch(`api/bms/resident-link-requests/${requestId}/reject`, {
    searchParams: { reason },
  });
}
