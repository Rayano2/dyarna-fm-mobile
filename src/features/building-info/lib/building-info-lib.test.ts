import { describe, expect, it } from 'vitest';
import { firstIssues } from '../../scope/lib/zod-resolver';
import {
  ALLOWED_EXTENSIONS,
  MAX_ATTACHMENT_BYTES,
  mimeForFile,
  validateAttachment,
} from './attachment-validation';
import {
  buildingInfoFormSchema,
  emptyBuildingInfoForm,
  endOfLocalDayIso,
  isFutureExpiry,
  toBuildingInfoPayload,
} from './building-info-form';
import { filterItems, itemStatus } from './building-info-meta';
import type { BuildingInfoItem } from '../api/building-info-api';

describe('expiry: end of the local day as an ISO instant', () => {
  it('is 23:59:59.999 LOCAL on the picked day, serialized as an instant', () => {
    const picked = new Date(2026, 9, 14, 8, 30); // 14 Oct 2026, 08:30 local
    const iso = endOfLocalDayIso(picked);
    expect(iso).toBe(new Date(2026, 9, 14, 23, 59, 59, 999).toISOString());
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.999Z$/);
    const back = new Date(iso);
    expect([back.getFullYear(), back.getMonth(), back.getDate(), back.getHours()]).toEqual([
      2026, 9, 14, 23,
    ]);
  });

  it('accepts today (its end is still ahead) and rejects yesterday', () => {
    const now = new Date(2026, 9, 14, 12, 0);
    expect(isFutureExpiry(new Date(2026, 9, 14), now)).toBe(true);
    expect(isFutureExpiry(new Date(2026, 9, 13), now)).toBe(false);
  });

  it('puts the end-of-day instant in the payload, or null for no expiry', () => {
    const base = { ...emptyBuildingInfoForm(null), title: 'Gym rules' };
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const withExpiry = buildingInfoFormSchema.parse({ ...base, expiresOn: future });
    expect(toBuildingInfoPayload(withExpiry, '7').expiresAt).toBe(endOfLocalDayIso(future));
    const none = buildingInfoFormSchema.parse(base);
    expect(toBuildingInfoPayload(none, '7')).toMatchObject({
      expiresAt: null,
      projectId: 7,
      buildingId: null,
    });
  });

  it('rejects a past expiry with the i18n key', () => {
    const r = buildingInfoFormSchema.safeParse({
      ...emptyBuildingInfoForm(null),
      title: 'x',
      expiresOn: new Date(2000, 0, 1),
    });
    expect(r.success).toBe(false);
    expect(firstIssues(r.error!).expiresOn).toBe('fm.buildingInfo.expiryPast');
  });
});

describe('attachment validation', () => {
  it('accepts every allowlisted extension up to 10 MB', () => {
    for (const ext of ALLOWED_EXTENSIONS) {
      expect(validateAttachment({ name: `doc.${ext}`, size: MAX_ATTACHMENT_BYTES })).toBeNull();
    }
    expect(validateAttachment({ name: 'SCAN.PDF', size: 10 })).toBeNull();
  });

  it('rejects files over 10 MB', () => {
    expect(validateAttachment({ name: 'big.pdf', size: MAX_ATTACHMENT_BYTES + 1 })).toBe(
      'tooLarge',
    );
  });

  it('rejects types off the allowlist, and names without an extension', () => {
    expect(validateAttachment({ name: 'virus.exe', size: 10 })).toBe('badType');
    expect(validateAttachment({ name: 'clip.mp4', size: 10 })).toBe('badType');
    expect(validateAttachment({ name: 'README', size: 10 })).toBe('badType');
    expect(validateAttachment({ name: 'trailingdot.', size: 10 })).toBe('badType');
  });

  it('lets an unknown size through (the server enforces the cap)', () => {
    expect(validateAttachment({ name: 'a.pdf', size: undefined })).toBeNull();
    expect(validateAttachment({ name: 'a.pdf', size: null })).toBeNull();
  });

  it('derives the MIME type from the extension first', () => {
    expect(mimeForFile('a.docx', 'application/octet-stream')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(mimeForFile('photo.HEIC', null)).toBe('image/heic');
  });
});

const item = (id: string, isActive: boolean, isExpired: boolean): BuildingInfoItem => ({
  id,
  title: id,
  summary: '',
  body: '',
  categoryCode: 'RULES',
  projectId: '7',
  buildingId: undefined,
  expiresAt: undefined,
  isActive,
  isExpired,
  attachmentCount: 0,
});

describe('status filter', () => {
  it('published = active && !expired; expired wins over the flag', () => {
    expect(itemStatus(item('a', true, false))).toBe('published');
    expect(itemStatus(item('b', false, false))).toBe('unpublished');
    expect(itemStatus(item('c', true, true))).toBe('expired');
    const all = [item('a', true, false), item('b', false, false), item('c', true, true)];
    expect(filterItems(all, 'published', '').map((i) => i.id)).toEqual(['a']);
    expect(filterItems(all, 'expired', '').map((i) => i.id)).toEqual(['c']);
    expect(filterItems(all, 'all', 'B').map((i) => i.id)).toEqual(['b']);
  });
});
