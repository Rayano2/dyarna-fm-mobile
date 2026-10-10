import { describe, expect, it } from 'vitest';
import type { ResolverOptions } from 'react-hook-form';
import en from '@/shared/i18n/translations/en.json';
import ar from '@/shared/i18n/translations/ar.json';
import {
  PASSWORD_RULES,
  isCompleteOtp,
  signupResolver,
  type SignupFormValues,
} from './signup-schema';

const options = {
  fields: {},
  shouldUseNativeValidation: false,
} as unknown as ResolverOptions<SignupFormValues>;

const VALID: SignupFormValues = {
  email: 'rep@company.com',
  firstName: 'Sara',
  lastName: 'Ali',
  mobile: '512345678',
  genderCode: 'FEMALE',
  password: 'Secret1@',
};

async function validate(overrides: Partial<Record<keyof SignupFormValues, string>>) {
  return signupResolver({ ...VALID, ...overrides } as SignupFormValues, undefined, options);
}

async function errorFor(field: keyof SignupFormValues, value: string): Promise<string | undefined> {
  const result = await validate({ [field]: value });
  return result.errors[field]?.message;
}

describe('signup form validation (mirrors the FM web signupSchema)', () => {
  it('accepts valid values and trims email and names', async () => {
    const result = await validate({
      email: '  rep@company.com ',
      firstName: ' Sara ',
      lastName: 'Ali ',
    });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual(VALID);
  });

  it('email: rejects malformed and empty', async () => {
    expect(await errorFor('email', 'rep@')).toBe('invalidEmail');
    expect(await errorFor('email', '')).toBe('invalidEmail');
  });

  it('first and last name: at least 2 characters, ignoring surrounding spaces', async () => {
    expect(await errorFor('firstName', 'S')).toBe('firstNameMin');
    expect(await errorFor('firstName', ' S ')).toBe('firstNameMin');
    expect(await errorFor('firstName', 'Sa')).toBeUndefined();
    expect(await errorFor('lastName', 'A')).toBe('lastNameMin');
    expect(await errorFor('lastName', 'Al')).toBeUndefined();
  });

  it('mobile: exactly 9 digits starting with 5', async () => {
    expect(await errorFor('mobile', '512345678')).toBeUndefined();
    expect(await errorFor('mobile', '412345678')).toBe('mobileInvalid');
    expect(await errorFor('mobile', '51234567')).toBe('mobileInvalid');
    expect(await errorFor('mobile', '5123456789')).toBe('mobileInvalid');
    expect(await errorFor('mobile', '0512345678')).toBe('mobileInvalid');
    expect(await errorFor('mobile', '5123a5678')).toBe('mobileInvalid');
  });

  it('mobile: Arabic-Indic and Persian digits are converted, not rejected', async () => {
    const arabic = await validate({ mobile: '٥١٢٣٤٥٦٧٨' });
    expect(arabic.errors).toEqual({});
    expect(arabic.values).toMatchObject({ mobile: '512345678' });
    const persian = await validate({ mobile: '۵۱۲۳۴۵۶۷۸' });
    expect(persian.values).toMatchObject({ mobile: '512345678' });
    expect(await errorFor('mobile', '٤١٢٣٤٥٦٧٨')).toBe('mobileInvalid');
  });

  it('gender: MALE or FEMALE only', async () => {
    expect(await errorFor('genderCode', 'MALE')).toBeUndefined();
    expect(await errorFor('genderCode', 'FEMALE')).toBeUndefined();
    expect(await errorFor('genderCode', 'OTHER')).toBe('genderInvalid');
    expect(await errorFor('genderCode', '')).toBe('genderInvalid');
  });

  it('password: each rule reports its own key', async () => {
    expect(await errorFor('password', 'Se1@')).toBe('passwordMin');
    expect(await errorFor('password', 'secret1@')).toBe('passwordUpper');
    expect(await errorFor('password', 'SECRET1@')).toBe('passwordLower');
    expect(await errorFor('password', 'Secrets@')).toBe('passwordDigit');
    expect(await errorFor('password', 'Secret12')).toBe('passwordSpecial');
  });

  it('password: accepts every special character the web allows', async () => {
    for (const special of '@$!%*?&#') {
      expect(await errorFor('password', `Secret1${special}`)).toBeUndefined();
    }
  });

  it('the live checklist agrees with the schema', () => {
    const results = PASSWORD_RULES.map((rule) => rule.test('Secret1@'));
    expect(results).toEqual([true, true, true, true, true]);
    expect(PASSWORD_RULES.map((rule) => rule.test(''))).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('every error and checklist key exists in both locales', () => {
    const keys = [
      'invalidEmail',
      'firstNameMin',
      'lastNameMin',
      'mobileInvalid',
      'genderInvalid',
      ...PASSWORD_RULES.map((rule) => rule.key),
    ];
    for (const key of keys) {
      expect(en.fm.signup.errors[key as keyof typeof en.fm.signup.errors]).toBeTruthy();
      expect(ar.fm.signup.errors[key as keyof typeof ar.fm.signup.errors]).toBeTruthy();
    }
    for (const rule of PASSWORD_RULES) {
      expect(en.fm.signup.rules[rule.key]).toBeTruthy();
      expect(ar.fm.signup.rules[rule.key]).toBeTruthy();
    }
  });
});

describe('signup OTP code', () => {
  it('is complete only at exactly 4 digits', () => {
    expect(isCompleteOtp('1234')).toBe(true);
    expect(isCompleteOtp('123')).toBe(false);
    expect(isCompleteOtp('')).toBe(false);
    expect(isCompleteOtp('12345')).toBe(false);
    expect(isCompleteOtp('12a4')).toBe(false);
  });
});
