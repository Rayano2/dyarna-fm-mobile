import { create } from 'zustand';
import { prefStorage } from '@/shared/lib/storage';
import { logger } from '@/shared/lib/logger';

const STORAGE_KEY = 'dyarna.moderation.v1';

interface ModerationSnapshot {
  blockedUserIds: string[];
  /** Display names captured at block time, keyed by user id — the backend's
   *  block list is ids-only, so this is the only name source for the
   *  blocked-users screen. May lack entries for server-synced blocks. */
  blockedUserNames: Record<string, string>;
  hiddenPostIds: string[];
}

interface ModerationState extends ModerationSnapshot {
  hydrated: boolean;
  hydrate(): Promise<void>;
  blockUser(userId: string, name?: string): void;
  unblockUser(userId: string): void;
  /** Adds server-known block ids missing locally (e.g. blocks made on
   *  another device). Names stay unknown for those. */
  mergeServerBlocks(userIds: string[]): void;
  hidePost(postId: string): void;
}

function persist(state: ModerationState): void {
  const snapshot: ModerationSnapshot = {
    blockedUserIds: state.blockedUserIds,
    blockedUserNames: state.blockedUserNames,
    hiddenPostIds: state.hiddenPostIds,
  };
  prefStorage.setJSON(STORAGE_KEY, snapshot).catch((error) => {
    logger.warn('Failed to persist moderation state', error);
  });
}

/**
 * Client-side moderation state (App Store Guideline 1.2). Blocking a user or
 * reporting a post takes effect instantly by filtering the local caches; the
 * matching backend calls are best-effort notifications. Device-scoped and
 * deliberately kept across sign-out so a blocked user never flashes back.
 */
export const useModerationStore = create<ModerationState>((set, get) => ({
  blockedUserIds: [],
  blockedUserNames: {},
  hiddenPostIds: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await prefStorage.getJSON<Partial<ModerationSnapshot>>(STORAGE_KEY);
      set({
        blockedUserIds: stored?.blockedUserIds ?? [],
        blockedUserNames: stored?.blockedUserNames ?? {},
        hiddenPostIds: stored?.hiddenPostIds ?? [],
        hydrated: true,
      });
    } catch (error) {
      logger.warn('Failed to hydrate moderation state', error);
      set({ hydrated: true });
    }
  },

  blockUser: (userId, name) => {
    if (!userId) return;
    const s = get();
    if (s.blockedUserIds.includes(userId)) return;
    set({
      blockedUserIds: [...s.blockedUserIds, userId],
      blockedUserNames: name ? { ...s.blockedUserNames, [userId]: name } : s.blockedUserNames,
    });
    persist(get());
  },

  unblockUser: (userId) => {
    const s = get();
    if (!s.blockedUserIds.includes(userId)) return;
    const names = { ...s.blockedUserNames };
    delete names[userId];
    set({
      blockedUserIds: s.blockedUserIds.filter((id) => id !== userId),
      blockedUserNames: names,
    });
    persist(get());
  },

  mergeServerBlocks: (userIds) => {
    const s = get();
    const missing = userIds.filter((id) => id && !s.blockedUserIds.includes(id));
    if (missing.length === 0) return;
    set({ blockedUserIds: [...s.blockedUserIds, ...missing] });
    persist(get());
  },

  hidePost: (postId) => {
    if (!postId || get().hiddenPostIds.includes(postId)) return;
    set({ hiddenPostIds: [...get().hiddenPostIds, postId] });
    persist(get());
  },
}));
