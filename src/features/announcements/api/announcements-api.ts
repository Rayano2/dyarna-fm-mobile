import { bmsClient, communityClient } from '@/shared/api/clients';
import { asString } from '@/shared/api/coerce';

export const ANNOUNCEMENT_CATEGORY = 'ANNOUNCEMENT';
export const TITLE_MAX = 100;
export const MESSAGE_MAX = 500;

export interface Announcement {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  authorName: string;
  createdAt: string | undefined;
}

export interface AnnouncementPage {
  items: Announcement[];
  /** Cursor for the next page, or undefined at the end. */
  nextCursor: string | undefined;
}

/** `PostResponse` (Community `dto/PostResponse.java`); `isPinned` is the wire name, `pinned` tolerated. */
export function toAnnouncement(raw: unknown): Announcement | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const id = asString(obj.id);
  if (id.length === 0) return null;
  const pinned = obj.isPinned ?? obj.pinned;
  return {
    id,
    title: asString(obj.title),
    body: asString(obj.body),
    isPinned: pinned === true,
    authorName: asString(obj.authorName),
    createdAt: asString(obj.createdAt) || undefined,
  };
}

/**
 * Normalizes a `PageResponse<PostResponse>`. Pinned posts come first on the
 * FIRST page only (`PostRepository` orders `isPinned DESC, createdAt DESC`
 * and the cursor query excludes pinned posts), so the list keeps server order.
 */
export function toAnnouncementPage(res: unknown): AnnouncementPage {
  const obj = (res ?? {}) as Record<string, unknown>;
  const content = Array.isArray(obj.content) ? obj.content : [];
  const pageInfo = (obj.pageInfo ?? {}) as Record<string, unknown>;
  const items = content
    .map((raw) => toAnnouncement(raw))
    .filter((a): a is Announcement => a !== null);
  const nextCursor =
    pageInfo.hasNextPage === true ? asString(pageInfo.nextCursor) || undefined : undefined;
  return { items, nextCursor };
}

/**
 * `GET /api/v1/posts?scopeId&categoryCode=ANNOUNCEMENT[&cursor]`.
 *
 * Cursor paging, not `page`: the server fetches `limit + 1` rows per page
 * (`PostService.listPosts`), so `page=N` offsets by 11 and silently skips a
 * post per page. It also ignores `size` and always uses 10.
 */
export async function listAnnouncements(
  projectId: string,
  cursor?: string | undefined,
): Promise<AnnouncementPage> {
  const searchParams: Record<string, string> = {
    scopeId: projectId,
    categoryCode: ANNOUNCEMENT_CATEGORY,
    size: '10',
  };
  if (cursor) searchParams.cursor = cursor;
  const res = await communityClient.get('api/v1/posts', { searchParams }).json<unknown>();
  return toAnnouncementPage(res);
}

export interface CreateAnnouncementInput {
  projectId: string;
  title: string;
  body: string;
  isPinned: boolean;
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<void> {
  await communityClient.post('api/v1/posts', {
    json: {
      title: input.title.trim(),
      body: input.body.trim(),
      categoryCode: ANNOUNCEMENT_CATEGORY,
      scopeType: 'PROJECT',
      scopeId: input.projectId,
      isPinned: input.isPinned,
    },
  });
}

/** `PATCH /api/v1/posts/{id}/pin {isPinned}` — the server keeps one pinned post per project. */
export async function setAnnouncementPinned(id: string, isPinned: boolean): Promise<void> {
  await communityClient.patch(`api/v1/posts/${encodeURIComponent(id)}/pin`, {
    json: { isPinned },
  });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await communityClient.delete(`api/v1/posts/${encodeURIComponent(id)}`);
}

/**
 * `GET api/bms/company-reps/projects/{id}/resident-count` → `{count}`.
 * Null when the count is unknown (error or bad body) — the UI then shows a
 * neutral line instead of a misleading "0". It never throws, so it can't block sending.
 */
export async function getResidentCount(projectId: string): Promise<number | null> {
  try {
    const res = await bmsClient
      .get(`api/bms/company-reps/projects/${encodeURIComponent(projectId)}/resident-count`)
      .json<unknown>();
    const count = (res as { count?: unknown } | null)?.count;
    return typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : null;
  } catch {
    return null;
  }
}
