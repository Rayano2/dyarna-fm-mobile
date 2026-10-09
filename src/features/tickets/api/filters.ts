import { bmsClient } from '@/shared/api/clients';
import type { FilterProject } from '../types';
import { mapProjectsFilter } from './mappers';
import { PROJECTS_BUILDINGS_FILTER_PATH } from './paths';

/** `GET api/bms/company-reps/projects-buildings-filter`: the rep's projects and their buildings. */
export async function getProjectsBuildingsFilter(): Promise<FilterProject[]> {
  const raw = await bmsClient.get(PROJECTS_BUILDINGS_FILTER_PATH).json<unknown>();
  return mapProjectsFilter(raw);
}
