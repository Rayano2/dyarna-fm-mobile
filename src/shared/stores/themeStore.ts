import { create } from 'zustand';
import { UnistylesRuntime } from 'react-native-unistyles';
import { secureStorage } from '@/shared/lib/storage';

const STORAGE_KEY = 'dyarna.theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  hydrated: boolean;
  hydrate(): Promise<void>;
  setMode(mode: ThemeMode): Promise<void>;
}

function applyMode(mode: ThemeMode) {
  if (mode === 'system') {
    UnistylesRuntime.setAdaptiveThemes(true);
  } else {
    UnistylesRuntime.setAdaptiveThemes(false);
    UnistylesRuntime.setTheme(mode);
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  hydrated: false,
  hydrate: async () => {
    const stored = await secureStorage.getString(STORAGE_KEY);
    const mode: ThemeMode =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    applyMode(mode);
    set({ mode, hydrated: true });
  },
  setMode: async (mode) => {
    await secureStorage.setString(STORAGE_KEY, mode);
    applyMode(mode);
    set({ mode });
  },
}));
