function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** Builds an unsigned JWT-shaped token with the given claims (tests only; the client never verifies). */
export function fakeJwt(claims: Record<string, unknown>): string {
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}.signature`;
}

/** Claims shaped like UMS JwtUtils.generateWebJwtToken (the BMS tms/login token). */
export function umsWebClaims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sub: '3f2b9c1e-0000-4000-8000-000000000001',
    email: 'rep@company.com',
    roles: ['COMPANY_USER', 'COMPANY_REP'],
    type: 'tk',
    firstName: 'Sara',
    lastName: 'Ali',
    ...overrides,
  };
}
