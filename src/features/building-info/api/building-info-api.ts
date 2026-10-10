import { communityClient } from '@/shared/api/clients';
import { asString } from '@/shared/api/coerce';
import { buildFormData } from '@/shared/api/multipart';

const BASE = 'api/v1/building-info';
/** One 10 MB file over a slow link outlasts the default 30 s request timeout. */
const UPLOAD_TIMEOUT_MS = 120_000;

export interface BuildingInfoAttachment {
  id: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
}

export interface BuildingInfoItem {
  id: string;
  title: string;
  summary: string;
  body: string;
  categoryCode: string;
  projectId: string;
  /** Undefined = whole project. */
  buildingId: string | undefined;
  /** ISO instant, or undefined for "no expiry". */
  expiresAt: string | undefined;
  isActive: boolean;
  /** Server-computed. Never derived on the client (clock skew, server TZ). */
  isExpired: boolean;
  attachmentCount: number;
}

export interface BuildingInfoPayload {
  title: string;
  summary: string;
  body: string;
  categoryCode: string;
  projectId: number;
  buildingId: number | null;
  expiresAt: string | null;
}

export interface AttachmentLink {
  url: string;
  expiresInSeconds: number;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

function idString(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return asString(value);
}

/** `isActive ?? active ?? true` — `BuildingInfoItemResponse` serializes `@JsonProperty("isActive")`. */
export function readIsActive(obj: Record<string, unknown>): boolean {
  const value = obj.isActive ?? obj.active;
  return typeof value === 'boolean' ? value : true;
}

/** `isExpired ?? expired ?? false`. */
export function readIsExpired(obj: Record<string, unknown>): boolean {
  const value = obj.isExpired ?? obj.expired;
  return typeof value === 'boolean' ? value : false;
}

export function toAttachment(raw: unknown): BuildingInfoAttachment | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const id = asString(obj.id);
  if (id.length === 0) return null;
  const size = obj.sizeBytes;
  return {
    id,
    originalFilename: asString(obj.originalFilename) || id,
    contentType: asString(obj.contentType),
    sizeBytes: typeof size === 'number' && Number.isFinite(size) ? size : 0,
  };
}

export function toBuildingInfoItem(raw: unknown): BuildingInfoItem | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const id = asString(obj.id);
  if (id.length === 0) return null;
  const buildingId = idString(obj.buildingId);
  const count = obj.attachmentCount;
  const attachments = Array.isArray(obj.attachments) ? obj.attachments : undefined;
  return {
    id,
    title: asString(obj.title),
    summary: asString(obj.summary),
    body: asString(obj.body),
    categoryCode: asString(obj.categoryCode) || 'OTHER',
    projectId: idString(obj.projectId),
    buildingId: buildingId.length > 0 ? buildingId : undefined,
    expiresAt: asString(obj.expiresAt) || undefined,
    isActive: readIsActive(obj),
    isExpired: readIsExpired(obj),
    attachmentCount:
      typeof count === 'number' && Number.isFinite(count) ? count : (attachments?.length ?? 0),
  };
}

/**
 * `GET /api/v1/building-info/manage` — the FM endpoint. The bare
 * `GET /api/v1/building-info` is the RESIDENT endpoint (scope from the JWT)
 * and must not be used here.
 */
export async function listBuildingInfo(
  projectId: string,
  buildingId: string | undefined,
): Promise<BuildingInfoItem[]> {
  const searchParams: Record<string, string> = { projectId, includeInactive: 'true' };
  if (buildingId) searchParams.buildingId = buildingId;
  const res = await communityClient.get(`${BASE}/manage`, { searchParams }).json<unknown>();
  return (Array.isArray(res) ? res : [])
    .map((raw) => toBuildingInfoItem(raw))
    .filter((i): i is BuildingInfoItem => i !== null);
}

export async function createBuildingInfo(
  payload: BuildingInfoPayload,
): Promise<BuildingInfoItem | null> {
  const res = await communityClient.post(BASE, { json: payload }).json<unknown>();
  return toBuildingInfoItem(res);
}

export async function updateBuildingInfo(
  id: string,
  payload: BuildingInfoPayload,
): Promise<BuildingInfoItem | null> {
  const res = await communityClient
    .put(`${BASE}/${encodeURIComponent(id)}`, { json: payload })
    .json<unknown>();
  return toBuildingInfoItem(res);
}

/** `PATCH .../{id}/active?active=bool` — query param only, no body. */
export async function setBuildingInfoActive(id: string, active: boolean): Promise<void> {
  await communityClient.patch(`${BASE}/${encodeURIComponent(id)}/active`, {
    searchParams: { active: String(active) },
  });
}

export async function deleteBuildingInfo(id: string): Promise<void> {
  await communityClient.delete(`${BASE}/${encodeURIComponent(id)}`);
}

export async function listAttachments(itemId: string): Promise<BuildingInfoAttachment[]> {
  const res = await communityClient
    .get(`${BASE}/${encodeURIComponent(itemId)}/attachments`)
    .json<unknown>();
  return (Array.isArray(res) ? res : [])
    .map((raw) => toAttachment(raw))
    .filter((a): a is BuildingInfoAttachment => a !== null);
}

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * `POST .../{id}/attachments`, multipart, one file in field `file`.
 *
 * Community is a stateless Bearer resource server with CSRF disabled
 * (`SecurityConfig.java:41,48`), so a direct upload with the Bearer header is
 * accepted — no proxy needed, unlike the web (which only proxies because its
 * axios instance pins a JSON content-type). `communityClient` pins no
 * Content-Type and ky sets none for a FormData body, so fetch writes the
 * multipart boundary itself.
 */
export async function uploadAttachment(
  itemId: string,
  file: UploadFile,
): Promise<BuildingInfoAttachment | null> {
  const res = await communityClient
    .post(`${BASE}/${encodeURIComponent(itemId)}/attachments`, {
      body: buildFormData({}, { file }),
      timeout: UPLOAD_TIMEOUT_MS,
    })
    .json<unknown>();
  return toAttachment(res);
}

export async function deleteAttachment(itemId: string, attachmentId: string): Promise<void> {
  await communityClient.delete(
    `${BASE}/${encodeURIComponent(itemId)}/attachments/${encodeURIComponent(attachmentId)}`,
  );
}

/** A freshly minted, self-authenticating link. Never cached: it expires. */
export async function getAttachmentLink(
  itemId: string,
  attachmentId: string,
): Promise<AttachmentLink> {
  const res = await communityClient
    .get(
      `${BASE}/${encodeURIComponent(itemId)}/attachments/${encodeURIComponent(attachmentId)}/link`,
    )
    .json<unknown>();
  const obj = (res ?? {}) as Record<string, unknown>;
  const url = asString(obj.url);
  if (url.length === 0) throw new Error('Attachment link response had no url');
  return {
    url,
    expiresInSeconds: typeof obj.expiresInSeconds === 'number' ? obj.expiresInSeconds : 0,
    filename: asString(obj.filename),
    contentType: asString(obj.contentType),
    sizeBytes: typeof obj.sizeBytes === 'number' ? obj.sizeBytes : 0,
  };
}
