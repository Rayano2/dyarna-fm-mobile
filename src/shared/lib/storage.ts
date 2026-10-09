/**
 * Unified persistence wrappers.
 *
 * Policy: `secureStorage` (expo-secure-store / OS keychain) is for tokens,
 * PII, and device identity; `prefStorage` (AsyncStorage) is for preferences
 * and other non-sensitive local state.
 *
 * NOTE: locale ('dyarna.locale') and theme ('dyarna.theme') currently live
 * in SecureStore for historical reasons. They MUST NOT be migrated to
 * AsyncStorage silently — existing installs would read the new backend, find
 * nothing, and lose the user's saved values.
 *
 * Both wrappers are deliberately thin: they never catch. Call sites disagree
 * on failure semantics (some treat storage errors as fatal, some are
 * best-effort), so each site keeps its own try/catch guards.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

function makeStorage(backend: StorageBackend) {
  return {
    getString(key: string): Promise<string | null> {
      return backend.getItem(key);
    },
    setString(key: string, value: string): Promise<void> {
      return backend.setItem(key, value);
    },
    /** Returns null when the key is absent; a corrupt value throws from JSON.parse. */
    async getJSON<T>(key: string): Promise<T | null> {
      const raw = await backend.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    },
    setJSON(key: string, value: unknown): Promise<void> {
      return backend.setItem(key, JSON.stringify(value));
    },
    remove(key: string): Promise<void> {
      return backend.removeItem(key);
    },
  };
}

/** Tokens, PII, device identity — backed by expo-secure-store. */
export const secureStorage = makeStorage({
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
});

/** Preferences and non-sensitive local state — backed by AsyncStorage. */
export const prefStorage = makeStorage(AsyncStorage);
