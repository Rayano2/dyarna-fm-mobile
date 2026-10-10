import { z } from 'zod';
import type { FieldErrors, Resolver } from 'react-hook-form';
import { toAsciiDigits } from '@/shared/lib/to-ascii-digits';
import type { ComposeImage } from '@/shared/ui';

export const REPAIR_COST_MAX = 100_000;
export const RESOLVE_MAX_FILES = 5;

const COST_PATTERN = /^\d+(?:\.\d{1,2})?$/;

/**
 * Parses the optional repair-cost field. Empty -> null. Otherwise a plain
 * non-negative amount with at most 2 decimals, 0 to 100000 inclusive. Arabic-
 * Indic digits and a comma decimal separator are accepted (Arabic keyboards).
 * Returns `undefined` when the text is not a valid amount.
 */
export function parseRepairCost(input: string): number | null | undefined {
  const normalized = toAsciiDigits(input.trim()).replace(/[,٫]/, '.');
  if (normalized === '') return null;
  if (!COST_PATTERN.test(normalized)) return undefined;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > REPAIR_COST_MAX) return undefined;
  return value;
}

/** Messages are i18n key suffixes under `fm.tickets.resolve.errors.*`. */
export const resolveSchema = z.object({
  comment: z.string().trim().min(1, { error: 'commentRequired' }),
  repairCost: z.string().refine((v) => parseRepairCost(v) !== undefined, { error: 'costInvalid' }),
  files: z.array(z.custom<ComposeImage>()).max(RESOLVE_MAX_FILES, { error: 'tooManyFiles' }),
});

export type ResolveFormValues = z.infer<typeof resolveSchema>;

export const RESOLVE_DEFAULTS: ResolveFormValues = { comment: '', repairCost: '', files: [] };

const FIELDS = ['comment', 'repairCost', 'files'] as const;

/** react-hook-form resolver for `resolveSchema` (same pattern as `loginResolver`). */
export const resolveResolver: Resolver<ResolveFormValues> = async (values) => {
  const result = resolveSchema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };
  const errors: FieldErrors<ResolveFormValues> = {};
  for (const issue of result.error.issues) {
    const field = FIELDS.find((f) => f === issue.path[0]);
    if (field && !errors[field]) errors[field] = { type: issue.code, message: issue.message };
  }
  return { values: {}, errors };
};
