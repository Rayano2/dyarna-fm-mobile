import type { SlaPhase, TicketSla } from '../types';

export type SlaTone = 'normal' | 'warning' | 'breached' | 'done';

export interface SlaView {
  tone: SlaTone;
  /** Seconds left in the active phase, clamped at 0. Null when there is no timer to show. */
  remainingSeconds: number | null;
}

/** Under this share of the phase left, the chip turns to the warning tone. */
const WARNING_RATIO = 0.25;

function activePhase(sla: TicketSla): SlaPhase | null {
  if (sla.activePhase === 'RESPONSE') return sla.response;
  if (sla.activePhase === 'DONE') return null;
  return sla.resolve;
}

/**
 * Remaining seconds of a phase at `nowMs`, counted down from the server's
 * `dueAt` (falls back to `remainingSeconds` relative to `fetchedAtMs`).
 */
export function phaseRemaining(phase: SlaPhase, nowMs: number, fetchedAtMs: number): number | null {
  if (phase.dueAt) {
    const due = Date.parse(phase.dueAt);
    if (Number.isFinite(due)) return Math.max(0, Math.floor((due - nowMs) / 1000));
  }
  if (phase.remainingSeconds !== null) {
    const elapsed = Math.floor((nowMs - fetchedAtMs) / 1000);
    return Math.max(0, phase.remainingSeconds - elapsed);
  }
  return null;
}

/**
 * Chip state. Breach comes only from the backend (`overdueNow` / `breachedEver`
 * on the active phase); the client never decides a ticket is breached, even when
 * its own countdown reaches 0.
 */
export function computeSlaView(
  sla: TicketSla | null,
  nowMs: number,
  fetchedAtMs: number,
  startedAtMs: number | null = null,
): SlaView {
  if (!sla) return { tone: 'done', remainingSeconds: null };
  const phase = activePhase(sla);
  if (!phase) return { tone: 'done', remainingSeconds: null };
  if (phase.overdueNow || phase.breachedEver) return { tone: 'breached', remainingSeconds: 0 };
  const remaining = phaseRemaining(phase, nowMs, fetchedAtMs);
  if (remaining === null) return { tone: 'done', remainingSeconds: null };
  // The phase budget: due minus start (the ticket's creation) when both are
  // known, else what was left when the server answered.
  const due = phase.dueAt ? Date.parse(phase.dueAt) : Number.NaN;
  const budget =
    startedAtMs !== null && Number.isFinite(due) && due > startedAtMs
      ? Math.floor((due - startedAtMs) / 1000)
      : phase.remainingSeconds;
  const warn = budget !== null && budget > 0 && remaining / budget < WARNING_RATIO;
  return { tone: warn ? 'warning' : 'normal', remainingSeconds: remaining };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** `HH:MM:SS`; hours keep counting past a day (`52:10:03`). Digits only, so no locale text and always LTR. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
