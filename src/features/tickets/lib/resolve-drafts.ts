import type { ResolveFormValues } from './resolve-schema';

/**
 * In-memory resolve drafts, one per ticket number. Closing the sheet (or a
 * failed submit) keeps what was typed; a successful resolve clears it. Kept in
 * memory only: picked image URIs point into the picker's cache and must not
 * outlive the app session.
 */
const drafts = new Map<string, ResolveFormValues>();

export const resolveDrafts = {
  get: (ticketNumber: string): ResolveFormValues | undefined => drafts.get(ticketNumber),
  set: (ticketNumber: string, values: ResolveFormValues): void => {
    drafts.set(ticketNumber, values);
  },
  clear: (ticketNumber: string): void => {
    drafts.delete(ticketNumber);
  },
};
