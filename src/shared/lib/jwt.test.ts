import { describe, expect, it } from 'vitest';
import { jwtUserId } from './jwt';

function fakeJwt(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims), 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `header.${payload}.signature`;
}

describe('jwtUserId', () => {
  it('prefers the userId claim (post-profile TEMP tokens)', () => {
    const token = fakeJwt({ sub: 'user@test.com', type: 'TEMP', userId: 'uuid-1' });
    expect(jwtUserId(token)).toBe('uuid-1');
  });

  it('falls back to sub for full session tokens (sub is the user id)', () => {
    const token = fakeJwt({ sub: '43530022-d83c-4a59-841d-8b57738eeae9', type: 'tk' });
    expect(jwtUserId(token)).toBe('43530022-d83c-4a59-841d-8b57738eeae9');
  });

  it('rejects an email sub (pre-profile TEMP tokens have no user id)', () => {
    const token = fakeJwt({ sub: 'user@test.com', type: 'TEMP' });
    expect(jwtUserId(token)).toBeNull();
  });

  it('survives multi-byte claim values (Arabic names)', () => {
    const token = fakeJwt({ sub: 'uuid-2', firstName: 'فيصل', lastName: 'خان' });
    expect(jwtUserId(token)).toBe('uuid-2');
  });

  it('returns null for null, malformed, and non-JWT input', () => {
    expect(jwtUserId(null)).toBeNull();
    expect(jwtUserId('not-a-jwt')).toBeNull();
    expect(jwtUserId('a.%%%%.c')).toBeNull();
  });
});
