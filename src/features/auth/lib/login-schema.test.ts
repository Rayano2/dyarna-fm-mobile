import { describe, expect, it } from 'vitest';
import type { ResolverOptions } from 'react-hook-form';
import en from '@/shared/i18n/translations/en.json';
import ar from '@/shared/i18n/translations/ar.json';
import { loginResolver, type LoginFormValues } from './login-schema';

const options = {
  fields: {},
  shouldUseNativeValidation: false,
} as unknown as ResolverOptions<LoginFormValues>;

async function validate(values: LoginFormValues) {
  return loginResolver(values, undefined, options);
}

describe('login form validation', () => {
  it('accepts a valid email and a 6-character password, trimming the email', async () => {
    const result = await validate({ email: '  rep@company.com ', password: 'secret' });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ email: 'rep@company.com', password: 'secret' });
  });

  it('rejects a malformed email with the invalidEmail key', async () => {
    const result = await validate({ email: 'rep@', password: 'secret1' });
    expect(result.errors.email?.message).toBe('invalidEmail');
    expect(result.errors.password).toBeUndefined();
  });

  it('rejects an empty email', async () => {
    const result = await validate({ email: '', password: 'secret1' });
    expect(result.errors.email?.message).toBe('invalidEmail');
  });

  it('rejects a password shorter than 6 characters (web rule)', async () => {
    const result = await validate({ email: 'rep@company.com', password: '12345' });
    expect(result.errors.password?.message).toBe('passwordMin');
    expect(result.errors.email).toBeUndefined();
  });

  it('reports both fields at once, one message each, and no values', async () => {
    const result = await validate({ email: 'nope', password: '' });
    expect(result.errors.email?.message).toBe('invalidEmail');
    expect(result.errors.password?.message).toBe('passwordMin');
    expect(result.values).toEqual({});
  });

  it('every message it can emit has an EN and AR translation', () => {
    for (const key of ['invalidEmail', 'passwordMin'] as const) {
      expect(en.fm.login.errors[key]).toBeTruthy();
      expect(ar.fm.login.errors[key]).toBeTruthy();
    }
  });
});
