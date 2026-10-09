import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  setOnline(online: boolean): void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  setOnline: (online) => set({ isOnline: online }),
}));
