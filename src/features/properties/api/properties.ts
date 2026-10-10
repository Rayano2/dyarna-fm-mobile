import { bmsClient } from '@/shared/api/clients';
import {
  mapProjectUsers,
  mapPropertiesList,
  type ProjectUser,
  type PropertyProject,
} from './mappers';

/** Company scope comes from the Bearer principal. Not paged. */
export async function fetchPropertiesList(): Promise<PropertyProject[]> {
  const body = await bmsClient.get('api/bms/company-reps/properties-list').json<unknown>();
  return mapPropertiesList(body);
}

export interface CreateUnitInput {
  buildingCode: string;
  unitNumber: string;
  floorNumber: number;
}

export async function createUnit(input: CreateUnitInput): Promise<void> {
  await bmsClient.post('api/bms/buildings/units', { json: input });
}

export async function fetchProjectUsers(projectId: number): Promise<ProjectUser[]> {
  const body = await bmsClient
    .get(`api/bms/company-reps/projects/${projectId}/users`)
    .json<unknown>();
  return mapProjectUsers(body);
}

export interface AssignPresidentInput {
  projectId: number;
  residentUserId: string;
}

export async function assignPresident({
  projectId,
  residentUserId,
}: AssignPresidentInput): Promise<void> {
  await bmsClient.post(`api/bms/company-reps/projects/${projectId}/assign-president`, {
    json: { residentUserId },
  });
}
