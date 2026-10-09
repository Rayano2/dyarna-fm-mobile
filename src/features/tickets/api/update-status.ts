import { tmsClient } from '@/shared/api/clients';
import { buildFormData } from '@/shared/api/multipart';
import { ticketPaths } from './paths';

/** Attachment uploads can be slow on mobile networks; the web uses the same 2 minutes. */
export const ATTACHMENT_UPLOAD_TIMEOUT_MS = 120_000;

export type ResolutionStatus = 'RESOLVED' | 'NOT_ACTIONABLE';

/** `PATCH api/tms/tickets/{ticketNumber}/status?status=[&repairCost=]`. */
export async function updateTicketStatus(
  ticketNumber: string,
  status: string,
  repairCost?: number | null,
): Promise<void> {
  const searchParams = new URLSearchParams({ status });
  if (repairCost !== null && repairCost !== undefined) {
    searchParams.set('repairCost', String(repairCost));
  }
  await tmsClient.patch(ticketPaths.status(ticketNumber), { searchParams });
}

export interface ResolveFile {
  uri: string;
  name: string;
  type: string;
}

export interface ResolveTicketInput {
  /** Numeric id: comments and attachments routes. */
  ticketId: number;
  /** Ticket number: status route. */
  ticketNumber: string;
  status: ResolutionStatus;
  comment: string;
  repairCost: number | null;
  files: ResolveFile[];
}

/** `TicketAttachmentController` `/company` binds `@RequestParam("files") List<MultipartFile>`: one `files` part per file. */
export const ATTACHMENTS_PART_NAME = 'files';

export function buildAttachmentsForm(files: readonly ResolveFile[]): FormData {
  return buildFormData({}, { [ATTACHMENTS_PART_NAME]: [...files] });
}

export type ResolveStep = 'comment' | 'attachments' | 'status';

/**
 * A step of the resolve sequence failed. `completed` lists the steps that did
 * land, so a retry can skip them (a second comment would duplicate the note).
 * `partial` is true when something was already saved.
 */
export class ResolveTicketError extends Error {
  readonly completed: ResolveStep[];
  readonly failedStep: ResolveStep;
  override readonly cause: unknown;

  constructor(completed: ResolveStep[], failedStep: ResolveStep, cause: unknown) {
    super(`resolve failed at ${failedStep}`);
    this.name = 'ResolveTicketError';
    this.completed = completed;
    this.failedStep = failedStep;
    this.cause = cause;
  }

  get partial(): boolean {
    return this.completed.length > 0;
  }
}

/**
 * The web's resolve flow, in order and NOT atomic:
 *  1. `POST {ticketId}/comments` `{comment, isInternal:false}`
 *  2. if files: multipart `POST {ticketId}/attachments/company` (repeated `files` parts)
 *  3. `PATCH {ticketNumber}/status?status=...[&repairCost=]`
 *
 * Steps in `alreadyDone` are skipped, which is how a retry finishes a partial run.
 */
export async function resolveTicket(
  input: ResolveTicketInput,
  alreadyDone: ReadonlySet<ResolveStep> = new Set(),
): Promise<void> {
  const completed: ResolveStep[] = [...alreadyDone];

  const run = async (step: ResolveStep, fn: () => Promise<unknown>): Promise<void> => {
    if (alreadyDone.has(step)) return;
    try {
      await fn();
    } catch (error) {
      throw new ResolveTicketError(completed, step, error);
    }
    completed.push(step);
  };

  await run('comment', () =>
    tmsClient.post(ticketPaths.comments(input.ticketId), {
      json: { comment: input.comment, isInternal: false },
    }),
  );

  if (input.files.length > 0) {
    await run('attachments', () =>
      tmsClient.post(ticketPaths.companyAttachments(input.ticketId), {
        body: buildAttachmentsForm(input.files),
        timeout: ATTACHMENT_UPLOAD_TIMEOUT_MS,
      }),
    );
  }

  await run('status', () => updateTicketStatus(input.ticketNumber, input.status, input.repairCost));
}
