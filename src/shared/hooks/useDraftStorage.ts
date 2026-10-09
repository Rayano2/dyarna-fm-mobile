import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'dyarna:compose-draft:';

export interface DraftStorage<T> {
  /** Hydrated draft (or null if none exists). `undefined` while the
   *  initial AsyncStorage read is in flight — callers should hold the
   *  compose UI off until the draft has resolved one way or the other. */
  draft: T | null | undefined;
  /** Persist the current value as the in-progress draft. Debounced so
   *  every keystroke doesn't write to disk; the trailing call wins. */
  save(next: T): void;
  /** Erase the persisted draft. Call on successful submit and on
   *  explicit "discard" so a future open starts blank. */
  clear(): Promise<void>;
}

// Tiny debounced AsyncStorage write-through. Suitable for compose forms
// where we want recovery on accidental dismissal but don't need
// transactional guarantees — losing the last ~300ms of typing on a
// crash is acceptable.
export function useDraftStorage<T>(key: string, debounceMs = 300): DraftStorage<T> {
  // Three-state: `undefined` = AsyncStorage read pending, `null` = no
  // draft existed, `T` = a draft was hydrated.
  const [draft, setDraft] = useState<T | null | undefined>();
  const fullKey = `${KEY_PREFIX}${key}`;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(fullKey).then((stored) => {
      if (cancelled) return;
      if (stored && stored.length > 0) {
        try {
          setDraft(JSON.parse(stored) as T);
          return;
        } catch {
          // Corrupt JSON — treat as no draft and let the next save overwrite.
        }
      }
      setDraft(null);
    });
    return () => {
      cancelled = true;
    };
  }, [fullKey]);

  // Cancel any pending write when this hook unmounts so a stale flush
  // doesn't fire after the user has navigated away.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const save = useCallback(
    (next: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void AsyncStorage.setItem(fullKey, JSON.stringify(next));
      }, debounceMs);
    },
    [fullKey, debounceMs],
  );

  const clear = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await AsyncStorage.removeItem(fullKey);
  }, [fullKey]);

  return { draft, save, clear };
}
