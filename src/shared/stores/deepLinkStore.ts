import { create } from 'zustand';

interface DeepLinkState {
  pendingUrl: string | null;
  stash(url: string): void;
  consume(): string | null;
  clear(): void;
}

export const useDeepLinkStore = create<DeepLinkState>((set, get) => ({
  pendingUrl: null,
  stash: (url) => set({ pendingUrl: url }),
  consume: () => {
    const url = get().pendingUrl;
    set({ pendingUrl: null });
    return url;
  },
  clear: () => set({ pendingUrl: null }),
}));
