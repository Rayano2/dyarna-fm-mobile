import { afterEach, describe, expect, it } from 'vitest';
import { focusManager } from '@tanstack/react-query';
import { wireAppFocus, type AppStateLike } from './query';

function fakeAppState(): AppStateLike & { emit(status: string): void; listeners: number } {
  const listeners = new Set<(status: string) => void>();
  return {
    addEventListener(_type, listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
    emit(status) {
      for (const listener of listeners) listener(status);
    },
    get listeners() {
      return listeners.size;
    },
  };
}

afterEach(() => {
  focusManager.setFocused(undefined);
});

describe('wireAppFocus', () => {
  it('feeds AppState changes into focusManager, and wires only once', () => {
    const appState = fakeAppState();
    wireAppFocus(appState);
    expect(appState.listeners).toBe(1);

    appState.emit('background');
    expect(focusManager.isFocused()).toBe(false);
    appState.emit('active');
    expect(focusManager.isFocused()).toBe(true);
    appState.emit('inactive');
    expect(focusManager.isFocused()).toBe(false);

    // A second call (e.g. a fast-refresh re-run) must not replace or stack listeners.
    const other = fakeAppState();
    wireAppFocus(other);
    expect(other.listeners).toBe(0);
    expect(appState.listeners).toBe(1);
  });
});
