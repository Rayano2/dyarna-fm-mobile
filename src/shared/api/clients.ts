import { ENV } from '@/shared/config/env';
import { createApiClient } from './client';

export const umsClient = createApiClient({ baseUrl: ENV.UMS_BASE_URL, service: 'ums' });
export const bmsClient = createApiClient({ baseUrl: ENV.BMS_BASE_URL, service: 'bms' });
export const tmsClient = createApiClient({ baseUrl: ENV.TMS_BASE_URL, service: 'tms' });
export const communityClient = createApiClient({
  baseUrl: ENV.COMMUNITY_BASE_URL,
  service: 'community',
});
