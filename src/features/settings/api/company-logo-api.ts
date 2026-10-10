import { bmsClient } from '@/shared/api/clients';
import { asString } from '@/shared/api/coerce';
import { buildFormData } from '@/shared/api/multipart';

/** BMS `CompanyController` `/logo` (GET / POST multipart / DELETE), COMPANY_USER only. */
export const COMPANY_LOGO_PATH = 'api/bms/companies/logo';
/** A 2MB file over a slow link can outlast the default 30 s request timeout. */
const UPLOAD_TIMEOUT_MS = 120_000;

export interface LogoUploadFile {
  uri: string;
  name: string;
  type: string;
}

/** `{logoUrl: string | null}` → the URL, or null when the company has no logo. */
export function toLogoUrl(raw: unknown): string | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const url = asString(obj.logoUrl);
  return url.length > 0 ? url : null;
}

export async function getCompanyLogo(): Promise<string | null> {
  const res = await bmsClient.get(COMPANY_LOGO_PATH).json<unknown>();
  return toLogoUrl(res);
}

/**
 * Multipart, one file in field `file`. `bmsClient` pins no Content-Type, so
 * fetch writes the multipart boundary itself.
 */
export async function uploadCompanyLogo(file: LogoUploadFile): Promise<void> {
  await bmsClient.post(COMPANY_LOGO_PATH, {
    body: buildFormData({}, { file }),
    timeout: UPLOAD_TIMEOUT_MS,
  });
}

export async function deleteCompanyLogo(): Promise<void> {
  await bmsClient.delete(COMPANY_LOGO_PATH);
}
