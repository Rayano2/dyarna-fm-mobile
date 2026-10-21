import { tmsClient } from '@/shared/api/clients';
import { ApiError } from '@/shared/api/errors';
import { TICKET_NOT_FOUND_CODE } from './get-ticket';
import { ticketPaths } from './paths';

/**
 * `PATCH api/tms/tickets/{ticketNumber}/assign?userId=`. Any eligible user
 * (from `assignable-users`), the FM included. OPEN becomes IN_PROGRESS on
 * assignment; IN_PROGRESS and ESCALATED keep their status.
 */
export async function assignTicket(ticketNumber: string, userId: string): Promise<void> {
  // Plain record: see list-tickets.ts on RN's URLSearchParams polyfill.
  const searchParams: Record<string, string> = { userId };
  await tmsClient.patch(ticketPaths.assign(ticketNumber), { searchParams });
}

/** bms-tms: the ticket status is not OPEN, IN_PROGRESS or ESCALATED. */
export const ASSIGN_STATUS_INVALID_CODE = 'TMS_400_01';
/** bms-tms: the chosen user is not eligible for this ticket. */
export const ASSIGNEE_NOT_ELIGIBLE_CODE = 'TMS_400_04';
/** bms: the caller's role may not assign. */
export const ASSIGN_FORBIDDEN_CODE = 'BMS_403_00';

export type AssignErrorKind = 'notFound' | 'statusInvalid' | 'notEligible' | 'forbidden';

/**
 * Tells assign failures apart by business `code` only. bms-tms sends every
 * one of the TMS codes as HTTP 400, so the status says nothing.
 */
export function assignErrorKind(error: unknown): AssignErrorKind | null {
  if (!(error instanceof ApiError)) return null;
  switch (error.code) {
    case TICKET_NOT_FOUND_CODE: {
      return 'notFound';
    }
    case ASSIGN_STATUS_INVALID_CODE: {
      return 'statusInvalid';
    }
    case ASSIGNEE_NOT_ELIGIBLE_CODE: {
      return 'notEligible';
    }
    case ASSIGN_FORBIDDEN_CODE: {
      return 'forbidden';
    }
    default: {
      return null;
    }
  }
}
