import type { z } from 'zod';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';

/**
 * react-hook-form resolver for a zod schema, without `@hookform/resolvers`
 * (not a dependency — `auth/lib/login-schema.ts` hand-rolls the same thing).
 *
 * Issue messages are full i18n keys; the form renders them through `t()`.
 * Only the first issue per top-level field is kept.
 */
export function zodFormResolver<In extends FieldValues, Out>(
  schema: z.ZodType<Out, In>,
): Resolver<In, unknown, Out> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !errors[field]) {
        errors[field] = { type: issue.code, message: issue.message };
      }
    }
    return { values: {}, errors: errors as FieldErrors<In> };
  };
}

/** First issue message per top-level field, for pure (non-form) callers and tests. */
export function firstIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !out[field]) out[field] = issue.message;
  }
  return out;
}
