import { describe, expect, it } from 'vitest';
import { summarizeResponseBody } from './logger';

describe('summarizeResponseBody (dev response logs)', () => {
  it('masks credential fields such as the signup temp accessToken', () => {
    const summary = summarizeResponseBody({
      success: true,
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.payload.signature',
      refreshToken: 'refresh-token-value',
      otpCode: '1234',
      password: 12_345_678,
      firstName: 'Sara',
    });
    expect(summary).toEqual({
      success: true,
      accessToken: 'eyJ***ure',
      refreshToken: 'ref***lue',
      otpCode: '***',
      password: '***',
      firstName: 'Sara',
    });
  });

  it('leaves non-sensitive fields and nested shapes as before', () => {
    expect(summarizeResponseBody({ id: 7, items: [{ a: 1 }], meta: { page: 0 } })).toEqual({
      id: 7,
      items: { arrayLength: 1, firstItemKeys: ['a'] },
      meta: { objectKeys: ['page'] },
    });
  });
});
