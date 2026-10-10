import { z } from 'zod';
import type { FieldErrors, Resolver } from 'react-hook-form';
import { toAsciiDigits } from '@/shared/lib/to-ascii-digits';

export const GENDER_CODES = ['MALE', 'FEMALE'] as const;
export type GenderCode = (typeof GENDER_CODES)[number];

/** Saudi mobile without the country code: 9 digits starting with 5 (web `signupSchema`). */
export const MOBILE_PATTERN = /^5\d{8}$/;

/**
 * The password rules, in the order the web checklist shows them. Shared by the
 * schema and the live checklist under the password field so the two can't drift.
 */
export const PASSWORD_RULES = [
  { key: 'passwordMin', test: (value: string): boolean => value.length >= 8 },
  { key: 'passwordUpper', test: (value: string): boolean => /[A-Z]/.test(value) },
  { key: 'passwordLower', test: (value: string): boolean => /[a-z]/.test(value) },
  { key: 'passwordDigit', test: (value: string): boolean => /\d/.test(value) },
  { key: 'passwordSpecial', test: (value: string): boolean => /[@$!%*?&#]/.test(value) },
] as const;

export type PasswordRuleKey = (typeof PASSWORD_RULES)[number]['key'];

/**
 * The FM web `signupSchema` rules (shared/schema.ts:9-24), except that email,
 * names and mobile are trimmed first (the web does not trim). Messages are
 * i18n key suffixes under `fm.signup.errors.*` (read with `useZodErrorText('fm.signup')`).
 * Field names match BMS `UmsCompanyRepCreateRequest`, so the parsed values are the body.
 */
export const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: 'invalidEmail' })),
  firstName: z.string().trim().min(2, { error: 'firstNameMin' }),
  lastName: z.string().trim().min(2, { error: 'lastNameMin' }),
  // Arabic keyboards type Arabic-Indic digits; convert them before the pattern check.
  mobile: z
    .string()
    .overwrite((v) => toAsciiDigits(v).trim())
    .regex(MOBILE_PATTERN, { error: 'mobileInvalid' }),
  genderCode: z.enum(GENDER_CODES, { error: 'genderInvalid' }),
  password: z
    .string()
    .min(8, { error: 'passwordMin' })
    .regex(/[A-Z]/, { error: 'passwordUpper' })
    .regex(/[a-z]/, { error: 'passwordLower' })
    .regex(/\d/, { error: 'passwordDigit' })
    .regex(/[@$!%*?&#]/, { error: 'passwordSpecial' }),
});

export type SignupFormValues = z.infer<typeof signupSchema>;

const SIGNUP_FIELDS = [
  'email',
  'firstName',
  'lastName',
  'mobile',
  'genderCode',
  'password',
] as const;
type SignupField = (typeof SIGNUP_FIELDS)[number];

function isSignupField(value: unknown): value is SignupField {
  return (SIGNUP_FIELDS as readonly unknown[]).includes(value);
}

/** react-hook-form resolver for `signupSchema`. Reports the first issue per field. */
export const signupResolver: Resolver<SignupFormValues> = async (values) => {
  const result = signupSchema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };

  const errors: FieldErrors<SignupFormValues> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (isSignupField(field) && !errors[field]) {
      errors[field] = { type: issue.code, message: issue.message };
    }
  }
  return { values: {}, errors };
};

/** The 4-digit email code (web `otpVerificationSchema`). */
export const signupOtpSchema = z.string().regex(/^\d{4}$/);

export function isCompleteOtp(code: string): boolean {
  return signupOtpSchema.safeParse(code).success;
}
