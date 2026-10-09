import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  createAnnouncement,
  deleteAnnouncement,
  getResidentCount,
  listAnnouncements,
  setAnnouncementPinned,
} from './api/announcements-api';
import { announcementSchema } from './lib/announcement-schema';

const POSTS = 'https://community.test.local/api/v1/posts';
const COUNT = 'https://bms.test.local/api/bms/company-reps/projects/7/resident-count';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('announcement pin / delete', () => {
  it('pins with PATCH /pin {isPinned:true}', async () => {
    let body: unknown = null;
    server.use(
      http.patch(`${POSTS}/p1/pin`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'p1', isPinned: true });
      }),
    );
    await setAnnouncementPinned('p1', true);
    expect(body).toEqual({ isPinned: true });
  });

  it('unpins with {isPinned:false}', async () => {
    let body: unknown = null;
    server.use(
      http.patch(`${POSTS}/p1/pin`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'p1', isPinned: false });
      }),
    );
    await setAnnouncementPinned('p1', false);
    expect(body).toEqual({ isPinned: false });
  });

  it('deletes with DELETE /posts/{id}', async () => {
    let hit = false;
    server.use(
      http.delete(`${POSTS}/p1`, () => {
        hit = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await deleteAnnouncement('p1');
    expect(hit).toBe(true);
  });

  it('surfaces a 4xx with the server message', async () => {
    server.use(
      http.patch(`${POSTS}/p1/pin`, () =>
        HttpResponse.json({ message: 'Post not found' }, { status: 404 }),
      ),
    );
    await expect(setAnnouncementPinned('p1', true)).rejects.toMatchObject({
      status: 404,
      message: 'Post not found',
    });
  });
});

describe('announcement list + create', () => {
  it('pages by cursor, keeps server order (pinned first) and reads the pin flag', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get(POSTS, ({ request }) => {
        const u = new URL(request.url);
        cursors.push(u.searchParams.get('cursor'));
        expect(u.searchParams.get('categoryCode')).toBe('ANNOUNCEMENT');
        expect(u.searchParams.get('scopeId')).toBe('7');
        return HttpResponse.json({
          content: [
            { id: 'pinned', title: 'P', body: 'b', isPinned: true, authorName: 'Sara' },
            { id: 'newer', title: 'N', body: 'b', isPinned: false },
          ],
          pageInfo: { hasNextPage: true, nextCursor: '2026-10-01T10:00:00Z' },
        });
      }),
    );
    const first = await listAnnouncements('7');
    expect(first.items.map((a) => [a.id, a.isPinned])).toEqual([
      ['pinned', true],
      ['newer', false],
    ]);
    expect(first.nextCursor).toBe('2026-10-01T10:00:00Z');
    await listAnnouncements('7', first.nextCursor);
    expect(cursors).toEqual([null, '2026-10-01T10:00:00Z']);
  });

  it('creates with the PROJECT scope and the trimmed fields', async () => {
    let body: unknown = null;
    server.use(
      http.post(POSTS, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'n' }, { status: 201 });
      }),
    );
    await createAnnouncement({
      projectId: '7',
      title: ' Water cut ',
      body: ' 9-11 ',
      isPinned: true,
    });
    expect(body).toEqual({
      title: 'Water cut',
      body: '9-11',
      categoryCode: 'ANNOUNCEMENT',
      scopeType: 'PROJECT',
      scopeId: '7',
      isPinned: true,
    });
  });

  it('reads the resident count, and a failure as 0 so it never blocks sending', async () => {
    server.use(http.get(COUNT, () => HttpResponse.json({ count: 42 })));
    expect(await getResidentCount('7')).toBe(42);
    server.use(http.get(COUNT, () => HttpResponse.json({}, { status: 500 })));
    expect(await getResidentCount('7')).toBe(0);
  });

  it('validates title (≤100) and message (≤500)', () => {
    expect(
      announcementSchema.safeParse({ title: 'a', message: 'b', isPinned: false }).success,
    ).toBe(true);
    expect(
      announcementSchema.safeParse({ title: 'a'.repeat(101), message: 'b', isPinned: false })
        .success,
    ).toBe(false);
    expect(
      announcementSchema.safeParse({ title: 'a', message: '  ', isPinned: false }).success,
    ).toBe(false);
  });
});
