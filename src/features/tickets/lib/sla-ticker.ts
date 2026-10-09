/**
 * ONE 1-second interval for every SLA chip on screen. Chips subscribe; the
 * interval runs only while there is at least one subscriber AND at least one
 * focused screen holding it active (`activate()` on focus, release on blur), so
 * it is paused whenever the tickets screens are off-screen. A list of 15 chips
 * therefore costs one timer, not 15. Holds are counted, so the list blurring
 * after the detail focuses (either order) never pauses the visible screen.
 */
export interface SlaTicker {
  subscribe(listener: () => void): () => void;
  getNow(): number;
  /** Marks a screen as visible; call the returned release when it blurs. */
  activate(): () => void;
  /** Test/diagnostic: whether the interval is currently running. */
  isRunning(): boolean;
}

export interface TickerDeps {
  now: () => number;
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
}

const defaultDeps: TickerDeps = {
  now: () => Date.now(),
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: (handle) => globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
};

export const SLA_TICK_MS = 1000;

export function createSlaTicker(deps: TickerDeps = defaultDeps): SlaTicker {
  const listeners = new Set<() => void>();
  let handle: unknown = null;
  let holds = 0;
  let now = deps.now();

  const tick = (): void => {
    now = deps.now();
    for (const listener of listeners) listener();
  };

  const sync = (): void => {
    const shouldRun = listeners.size > 0 && holds > 0;
    if (shouldRun && handle === null) {
      // Catch up at once so a resumed screen doesn't show a stale second.
      now = deps.now();
      handle = deps.setInterval(tick, SLA_TICK_MS);
    } else if (!shouldRun && handle !== null) {
      deps.clearInterval(handle);
      handle = null;
    }
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      sync();
      return () => {
        listeners.delete(listener);
        sync();
      };
    },
    getNow: () => now,
    activate() {
      holds++;
      if (holds === 1) tick();
      sync();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        holds--;
        sync();
      };
    },
    isRunning: () => handle !== null,
  };
}

/** The app-wide ticker shared by every `useSlaTick` caller. */
export const slaTicker: SlaTicker = createSlaTicker();
