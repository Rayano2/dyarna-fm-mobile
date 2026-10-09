import { describe, expect, it, vi } from 'vitest';
import type { TicketSla } from '../types';
import { computeSlaView, formatCountdown } from './sla';
import { createSlaTicker, SLA_TICK_MS, type TickerDeps } from './sla-ticker';

function fakeDeps() {
  let now = 1_000_000;
  const intervals = new Map<number, () => void>();
  let nextId = 1;
  const deps: TickerDeps = {
    now: () => now,
    setInterval: vi.fn((fn: () => void) => {
      const id = nextId++;
      intervals.set(id, fn);
      return id;
    }),
    clearInterval: vi.fn((id: unknown) => {
      intervals.delete(id as number);
    }),
  };
  const advance = (ms: number) => {
    now += ms;
    for (const fn of intervals.values()) fn();
  };
  return { deps, intervals, advance };
}

describe('SLA ticker: one shared interval', () => {
  it('many chips share ONE interval, which stops with the last chip', () => {
    const { deps, intervals } = fakeDeps();
    const ticker = createSlaTicker(deps);
    const release = ticker.activate();
    const unsubs = Array.from({ length: 15 }, () => ticker.subscribe(() => {}));
    expect(deps.setInterval).toHaveBeenCalledTimes(1);
    expect(deps.setInterval).toHaveBeenCalledWith(expect.any(Function), SLA_TICK_MS);
    expect(intervals.size).toBe(1);
    for (const u of unsubs) u();
    expect(intervals.size).toBe(0);
    expect(deps.clearInterval).toHaveBeenCalledTimes(1);
    release();
  });

  it('every tick notifies every subscriber and advances the shared clock', () => {
    const { deps, advance } = fakeDeps();
    const ticker = createSlaTicker(deps);
    ticker.activate();
    const a = vi.fn();
    const b = vi.fn();
    ticker.subscribe(a);
    ticker.subscribe(b);
    const before = ticker.getNow();
    advance(SLA_TICK_MS);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(ticker.getNow()).toBe(before + SLA_TICK_MS);
  });

  it('is paused while no screen is focused and resumes on focus', () => {
    const { deps } = fakeDeps();
    const ticker = createSlaTicker(deps);
    ticker.subscribe(() => {});
    expect(ticker.isRunning()).toBe(false);
    const release = ticker.activate();
    expect(ticker.isRunning()).toBe(true);
    release();
    expect(ticker.isRunning()).toBe(false);
    release(); // idempotent
    expect(ticker.isRunning()).toBe(false);
  });

  it('list blur and detail focus in either order never pause the visible screen', () => {
    const { deps } = fakeDeps();
    const ticker = createSlaTicker(deps);
    ticker.subscribe(() => {});
    const list = ticker.activate();
    const detail = ticker.activate(); // detail focuses first...
    list(); // ...then the list blurs
    expect(ticker.isRunning()).toBe(true);
    expect(deps.setInterval).toHaveBeenCalledTimes(1);
    detail();
    expect(ticker.isRunning()).toBe(false);
  });
});

const sla = (over: Partial<TicketSla> = {}): TicketSla => ({
  activePhase: 'RESPONSE',
  response: {
    dueAt: '2026-10-01T12:00:00Z',
    remainingSeconds: 7200,
    overdueNow: false,
    breachedEver: false,
  },
  resolve: {
    dueAt: '2026-10-02T08:00:00Z',
    remainingSeconds: 79_200,
    overdueNow: false,
    breachedEver: false,
  },
  ...over,
});

describe('computeSlaView', () => {
  const NOW = Date.parse('2026-10-01T10:00:00Z');
  const CREATED = Date.parse('2026-10-01T08:00:00Z');

  it('counts down the active phase from dueAt', () => {
    expect(computeSlaView(sla(), NOW, NOW, CREATED)).toEqual({
      tone: 'normal',
      remainingSeconds: 7200,
    });
    expect(
      computeSlaView(sla({ activePhase: 'RESOLVE' }), NOW, NOW, CREATED).remainingSeconds,
    ).toBe(79_200);
  });

  it('warns under 25% of the phase left', () => {
    // 4h phase, 50 min left = 20.8%.
    const late = Date.parse('2026-10-01T11:10:00Z');
    expect(computeSlaView(sla(), late, NOW, CREATED).tone).toBe('warning');
  });

  it('clamps at 0 without declaring a breach itself', () => {
    const past = Date.parse('2026-10-01T13:00:00Z');
    expect(computeSlaView(sla(), past, NOW, CREATED)).toEqual({
      tone: 'warning',
      remainingSeconds: 0,
    });
  });

  it('breach comes from the backend flags', () => {
    const breached = sla({
      response: {
        dueAt: '2026-10-01T12:00:00Z',
        remainingSeconds: 0,
        overdueNow: true,
        breachedEver: true,
      },
    });
    expect(computeSlaView(breached, NOW, NOW, CREATED).tone).toBe('breached');
  });

  it('DONE or no SLA shows nothing', () => {
    expect(computeSlaView(sla({ activePhase: 'DONE' }), NOW, NOW).tone).toBe('done');
    expect(computeSlaView(null, NOW, NOW).tone).toBe('done');
  });

  it('formats as digits only', () => {
    expect(formatCountdown(3661)).toBe('01:01:01');
    expect(formatCountdown(52 * 3600 + 5)).toBe('52:00:05');
    expect(formatCountdown(-5)).toBe('00:00:00');
  });
});
