import { bmsClient } from '@/shared/api/clients';
import { asString } from '@/shared/api/coerce';

export interface UserBuilding {
  buildingCode: string;
  buildingName: string;
}

/**
 * `/api/bms/building/user/buildings` — returns the buildings the
 * authenticated user is linked to. Consumed by two features: the ticket
 * composer (building picker) and the profile contacts screen, where it
 * serves as a fallback source of an addressable building id when
 * `/api/bms/projects/my-projects` happens to omit the project id (which
 * the backend currently does for some accounts; see useBuildingContacts
 * for the rationale).
 *
 * This fetcher used to be duplicated in both features under different
 * query keys, so the same endpoint was fetched and cached twice per
 * session. It lives in shared now so both consumers go through
 * `useUserBuildings` and share the single `queryKeys.bms.userBuildings`
 * cache entry.
 */
export async function getUserBuildings(): Promise<UserBuilding[]> {
  const res = await bmsClient.get('api/bms/building/user/buildings').json<unknown>();
  const list = Array.isArray(res) ? res : [];
  return list
    .map((raw) => {
      const obj = (raw ?? {}) as Record<string, unknown>;
      return {
        buildingCode: asString(obj.buildingCode ?? obj.building_code),
        buildingName: asString(obj.buildingName ?? obj.building_name),
      };
    })
    .filter((b) => b.buildingCode.length > 0);
}
