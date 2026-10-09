import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prefStorage } from '@/shared/lib/storage';
import { useModerationStore } from './moderationStore';

vi.mock('@/shared/lib/storage', () => ({
  prefStorage: {
    getJSON: vi.fn(),
    setJSON: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prefStorage.getJSON).mockResolvedValue(null);
  vi.mocked(prefStorage.setJSON).mockResolvedValue();
  useModerationStore.setState({
    blockedUserIds: [],
    blockedUserNames: {},
    hiddenPostIds: [],
    hydrated: false,
  });
});

describe('hydrate', () => {
  it('loads persisted ids and marks hydrated', async () => {
    vi.mocked(prefStorage.getJSON).mockResolvedValue({
      blockedUserIds: ['u1'],
      hiddenPostIds: ['p1', 'p2'],
    });

    await useModerationStore.getState().hydrate();

    expect(useModerationStore.getState()).toMatchObject({
      blockedUserIds: ['u1'],
      hiddenPostIds: ['p1', 'p2'],
      hydrated: true,
    });
  });

  it('tolerates missing and corrupt storage', async () => {
    vi.mocked(prefStorage.getJSON).mockRejectedValue(new Error('corrupt'));

    await useModerationStore.getState().hydrate();

    expect(useModerationStore.getState()).toMatchObject({
      blockedUserIds: [],
      hiddenPostIds: [],
      hydrated: true,
    });
  });
});

describe('blockUser / hidePost', () => {
  it('adds ids with names, dedupes, ignores empty, and persists the full snapshot', () => {
    const s = useModerationStore.getState();
    s.blockUser('u1', 'Abu Ahmed');
    s.blockUser('u1', 'Abu Ahmed');
    s.blockUser('');
    s.hidePost('p1');

    expect(useModerationStore.getState().blockedUserIds).toEqual(['u1']);
    expect(useModerationStore.getState().blockedUserNames).toEqual({ u1: 'Abu Ahmed' });
    expect(useModerationStore.getState().hiddenPostIds).toEqual(['p1']);
    expect(prefStorage.setJSON).toHaveBeenCalledTimes(2);
    expect(prefStorage.setJSON).toHaveBeenLastCalledWith('dyarna.moderation.v1', {
      blockedUserIds: ['u1'],
      blockedUserNames: { u1: 'Abu Ahmed' },
      hiddenPostIds: ['p1'],
    });
  });

  it('keeps working when persistence fails (block still applies in-memory)', () => {
    vi.mocked(prefStorage.setJSON).mockRejectedValue(new Error('disk full'));

    useModerationStore.getState().blockUser('u2');

    expect(useModerationStore.getState().blockedUserIds).toEqual(['u2']);
  });
});

describe('unblockUser / mergeServerBlocks', () => {
  it('unblock removes the id and its name, and persists', () => {
    const s = useModerationStore.getState();
    s.blockUser('u1', 'Abu Ahmed');
    s.blockUser('u2', 'Um Khalid');

    useModerationStore.getState().unblockUser('u1');

    expect(useModerationStore.getState().blockedUserIds).toEqual(['u2']);
    expect(useModerationStore.getState().blockedUserNames).toEqual({ u2: 'Um Khalid' });
    expect(prefStorage.setJSON).toHaveBeenLastCalledWith('dyarna.moderation.v1', {
      blockedUserIds: ['u2'],
      blockedUserNames: { u2: 'Um Khalid' },
      hiddenPostIds: [],
    });
  });

  it('unblocking an unknown id is a no-op (no persistence churn)', () => {
    useModerationStore.getState().unblockUser('ghost');
    expect(prefStorage.setJSON).not.toHaveBeenCalled();
  });

  it('merges server-known ids without clobbering local names; no-op when nothing new', () => {
    useModerationStore.getState().blockUser('u1', 'Abu Ahmed');

    useModerationStore.getState().mergeServerBlocks(['u1', 'u3', '']);
    expect(useModerationStore.getState().blockedUserIds).toEqual(['u1', 'u3']);
    expect(useModerationStore.getState().blockedUserNames).toEqual({ u1: 'Abu Ahmed' });

    const persistCalls = vi.mocked(prefStorage.setJSON).mock.calls.length;
    useModerationStore.getState().mergeServerBlocks(['u1', 'u3']);
    expect(vi.mocked(prefStorage.setJSON).mock.calls.length).toBe(persistCalls);
  });
});
