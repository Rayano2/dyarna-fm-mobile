import { bmsClient } from '@/shared/api/clients';
import { mapPage, type Page } from '@/shared/api/page';
import {
  mapOffboardResult,
  mapResident,
  mapResidentDetails,
  type OffboardResult,
  type Resident,
  type ResidentDetails,
} from './mappers';

/**
 * The web asks for 100, but BMS caps this endpoint at 50 per page
 * (`CompanyRepresentativeService.getResidentsList`), so ask for what is served.
 */
export const RESIDENTS_PAGE_SIZE = 50;

/** BMS `OffboardResidentRequest.reason` is `@Size(max = 500)`. */
export const OFFBOARD_REASON_MAX = 500;

export interface ResidentsQuery {
  page: number;
  projectId: number | null;
  buildingCode: string | null;
}

/** Company scope comes from the Bearer principal; there is no server search. */
export async function fetchResidents(query: ResidentsQuery): Promise<Page<Resident>> {
  const searchParams: Record<string, string | number> = {
    page: query.page,
    size: RESIDENTS_PAGE_SIZE,
  };
  if (query.projectId !== null) searchParams.projectId = query.projectId;
  if (query.buildingCode) searchParams.buildingCode = query.buildingCode;
  const body = await bmsClient
    .get('api/bms/company-reps/residents', { searchParams })
    .json<unknown>();
  return mapPage(body, (raw) => mapResident(raw), 'resident', 'residents');
}

export async function fetchResidentDetails(userId: string): Promise<ResidentDetails> {
  const body = await bmsClient
    .get(`api/bms/company-reps/residents/${encodeURIComponent(userId)}`)
    .json<unknown>();
  return mapResidentDetails(body);
}

export interface OffboardInput {
  userId: string;
  unitResidentId: number;
  reason?: string | undefined;
}

/** Ends ONE unit-link. A blank reason is omitted, as on the web. */
export async function offboardResident({
  userId,
  unitResidentId,
  reason,
}: OffboardInput): Promise<OffboardResult> {
  const trimmed = reason?.trim();
  const json = trimmed ? { unitResidentId, reason: trimmed } : { unitResidentId };
  const body = await bmsClient
    .post(`api/bms/company-reps/residents/${encodeURIComponent(userId)}/offboard`, { json })
    .json<unknown>();
  return mapOffboardResult(body);
}
