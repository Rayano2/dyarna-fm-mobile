import { z } from 'zod';
import type { FieldErrors, Resolver } from 'react-hook-form';

/**
 * Same rules as the FM web `loginSchema` (shared/schema.ts:4-7): a valid email
 * and a password of at least 6 characters. Messages are i18n key suffixes under
 * `fm.login.errors.*` (read with `useZodErrorText('fm.login')`).
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: 'invalidEmail' })),
  password: z.string().min(6, { error: 'passwordMin' }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * react-hook-form resolver for `loginSchema`. Written here rather than pulling
 * in `@hookform/resolvers` for a two-field form. Reports the first issue per field.
 */
export const loginResolver: Resolver<LoginFormValues> = async (values) => {
  const result = loginSchema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };

  const errors: FieldErrors<LoginFormValues> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if ((field === 'email' || field === 'password') && !errors[field]) {
      errors[field] = { type: issue.code, message: issue.message };
    }
  }
  return { values: {}, errors };
};
