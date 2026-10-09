import { create } from 'zustand';
import type { ResolveStep } from '../api/update-status';
import { RESOLVE_DEFAULTS, type ResolveFormValues } from './resolve-schema';

/**
 * One resolve attempt per ticket number: what was typed AND which steps of the
 * non-atomic sequence (comment -> attachments -> status) already landed. Both
 * live together so they can never disagree: leaving the screen and coming back
 * keeps the done steps (a retry never re-posts the public note), and the sheet
 * locks the fields whose step already landed (an edit can't be silently
 * skipped). Cleared together on success.
 *
 * In memory only: picked image URIs point into the picker's cache and must not
 * outlive the app session.
 */
export interface ResolveDraft {
  values: ResolveFormValues;
  done: readonly ResolveStep[];
}

interface ResolveDraftsState {
  drafts: Record<string, ResolveDraft>;
  setValues(ticketNumber: string, values: ResolveFormValues): void;
  markDone(ticketNumber: string, steps: readonly ResolveStep[]): void;
  clear(ticketNumber: string): void;
}

const NO_STEPS: readonly ResolveStep[] = [];

export const useResolveDrafts = create<ResolveDraftsState>((set) => ({
  drafts: {},
  setValues: (ticketNumber, values) =>
    set((s) => ({
      drafts: {
        ...s.drafts,
        // Same `done` reference, so its subscribers don't re-render per keystroke.
        [ticketNumber]: { values, done: s.drafts[ticketNumber]?.done ?? NO_STEPS },
      },
    })),
  markDone: (ticketNumber, steps) =>
    set((s) => ({
      drafts: {
        ...s.drafts,
        [ticketNumber]: {
          values: s.drafts[ticketNumber]?.values ?? RESOLVE_DEFAULTS,
          done: [...new Set([...(s.drafts[ticketNumber]?.done ?? NO_STEPS), ...steps])],
        },
      },
    })),
  clear: (ticketNumber) =>
    set((s) => {
      const rest = { ...s.drafts };
      delete rest[ticketNumber];
      return { drafts: rest };
    }),
}));

/** Form defaults for a ticket: its own draft, or a blank form. Never another ticket's draft. */
export function initialResolveValues(ticketNumber: string): ResolveFormValues {
  return useResolveDrafts.getState().drafts[ticketNumber]?.values ?? RESOLVE_DEFAULTS;
}

/** Steps of this ticket's resolve that already landed on the server. */
export function doneResolveSteps(ticketNumber: string): ReadonlySet<ResolveStep> {
  return new Set(useResolveDrafts.getState().drafts[ticketNumber]?.done ?? NO_STEPS);
}

/** React selector: this ticket's done steps (stable reference while unchanged). */
export function selectDoneSteps(
  ticketNumber: string,
): (s: ResolveDraftsState) => readonly ResolveStep[] {
  return (s) => s.drafts[ticketNumber]?.done ?? NO_STEPS;
}
