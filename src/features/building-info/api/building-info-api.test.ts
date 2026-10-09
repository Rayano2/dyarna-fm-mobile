// @vitest-environment node
// Node env: ky runs on undici's fetch, whose FormData must be undici's own for
// the body to be encoded as multipart — exactly what RN's fetch does on device.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { apiRegistry, registerApiDependencies } from '@/shared/api/registry';
import {
  deleteBuildingInfo,
  getAttachmentLink,
  listBuildingInfo,
  readIsActive,
  readIsExpired,
  setBuildingInfoActive,
  toBuildingInfoItem,
  uploadAttachment,
} from './building-info-api';

const BASE = 'https://community.test.local/api/v1/building-info';
const server = setupServer();
const originalRegistry = { ...apiRegistry };

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  registerApiDependencies(originalRegistry);
});
afterAll(() => server.close());

describe('building-info normalizers', () => {
  it('reads the active flag as isActive ?? active ?? true', () => {
    expect(readIsActive({ isActive: false, active: true })).toBe(false);
    expect(readIsActive({ active: false })).toBe(false);
    expect(readIsActive({})).toBe(true);
    expect(readIsActive({ isActive: 'false' })).toBe(true);
  });

  it('reads the expired flag as isExpired ?? expired ?? false', () => {
    expect(readIsExpired({ isExpired: true })).toBe(true);
    expect(readIsExpired({ expired: true })).toBe(true);
    expect(readIsExpired({})).toBe(false);
  });

  it('maps an item, keeping the server isExpired rather than computing it', () => {
    const item = toBuildingInfoItem({
      id: 'i1',
      title: 'Pool rules',
      categoryCode: 'RULES',
      projectId: 7,
      buildingId: null,
      // In the past, but the server says not expired — the server wins.
      expiresAt: '2000-01-01T00:00:00Z',
      isActive: true,
      isExpired: false,
      attachmentCount: 2,
    });
    expect(item).toMatchObject({
      id: 'i1',
      projectId: '7',
      buildingId: undefined,
      isActive: true,
      isExpired: false,
      attachmentCount: 2,
    });
  });
});

describe('building-info API', () => {
  it('lists from the /manage endpoint with includeInactive, never the resident endpoint', async () => {
    let url: URL | null = null;
    server.use(
      http.get(`${BASE}/manage`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json([{ id: 'a', title: 'A', categoryCode: 'FAQ', isActive: false }]);
      }),
    );
    const items = await listBuildingInfo('7', '12');
    expect(url!.searchParams.get('projectId')).toBe('7');
    expect(url!.searchParams.get('buildingId')).toBe('12');
    expect(url!.searchParams.get('includeInactive')).toBe('true');
    expect(items[0]?.isActive).toBe(false);
  });

  it('publishes/unpublishes via ?active= with no body', async () => {
    let seen: { active: string | null; body: string } | null = null;
    server.use(
      http.patch(`${BASE}/i1/active`, async ({ request }) => {
        seen = {
          active: new URL(request.url).searchParams.get('active'),
          body: await request.text(),
        };
        return HttpResponse.json({});
      }),
    );
    await setBuildingInfoActive('i1', false);
    expect(seen).toEqual({ active: 'false', body: '' });
  });

  it('deletes an item', async () => {
    let hit = false;
    server.use(
      http.delete(`${BASE}/i1`, () => {
        hit = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await deleteBuildingInfo('i1');
    expect(hit).toBe(true);
  });

  it('uploads one file as multipart with the Bearer token and no JSON content-type', async () => {
    registerApiDependencies({ getActiveToken: () => 'tok-123' });
    let seen: { contentType: string | null; auth: string | null } | null = null;
    server.use(
      http.post(`${BASE}/i1/attachments`, ({ request }) => {
        seen = {
          contentType: request.headers.get('content-type'),
          auth: request.headers.get('authorization'),
        };
        return HttpResponse.json(
          {
            id: 'att1',
            originalFilename: 'rules.pdf',
            contentType: 'application/pdf',
            sizeBytes: 2048,
          },
          { status: 201 },
        );
      }),
    );
    const res = await uploadAttachment('i1', {
      uri: 'file:///rules.pdf',
      name: 'rules.pdf',
      type: 'application/pdf',
    });
    expect(seen!.auth).toBe('Bearer tok-123');
    expect(seen!.contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(seen!.contentType).not.toContain('application/json');
    expect(res).toEqual({
      id: 'att1',
      originalFilename: 'rules.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2048,
    });
  });

  it('mints a fresh link on every call', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/i1/attachments/att1/link`, () => {
        calls++;
        return HttpResponse.json({
          url: `https://files.test/${calls}`,
          expiresInSeconds: 300,
          filename: 'rules.pdf',
          contentType: 'application/pdf',
          sizeBytes: 1,
        });
      }),
    );
    const a = await getAttachmentLink('i1', 'att1');
    const b = await getAttachmentLink('i1', 'att1');
    expect([a.url, b.url]).toEqual(['https://files.test/1', 'https://files.test/2']);
  });
});
