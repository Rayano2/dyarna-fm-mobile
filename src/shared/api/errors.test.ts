import { describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { ApiError, ERROR_CODES, getUserMessage, normalizeError } from './errors';

function jsonResponse(body: unknown, init: { status: number; headers?: Record<string, string> }) {
  return Response.json(body, {
    status: init.status,
    ...(init.headers ? { headers: init.headers } : {}),
  });
}

function rate(retryAfterSeconds?: number): ApiError {
  return new ApiError({
    code: ERROR_CODES.TOO_MANY_REQUESTS,
    status: 429,
    service: 'community',
    message: 'srv-msg',
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    raw: null,
  });
}

function mockT() {
  return vi.fn((key: string) => key) as unknown as TFunction;
}

describe('normalizeError', () => {
  it('parses the wrapped envelope { ok:false, error:{ code,message } }', async () => {
    const r = jsonResponse(
      { ok: false, error: { code: 'BUILDING_NOT_FOUND', message: 'nope' } },
      { status: 404 },
    );
    const err = await normalizeError(r, 'community');
    expect(err.code).toBe('BUILDING_NOT_FOUND');
    expect(err.message).toBe('nope');
    expect(err.status).toBe(404);
  });

  it('parses TMS/BMS validation 400 with `code` field and surfaces the server message', async () => {
    const r = jsonResponse(
      {
        code: 'BMS_400_07',
        message: 'President cannot raise a complaint ticket against themselves.',
        path: '/api/tms/tickets',
        success: false,
        timestamp: '2026-05-24T12:32:32.807810087',
        traceId: null,
      },
      { status: 400 },
    );
    const err = await normalizeError(r, 'tms');
    expect(err.code).toBe('BMS_400_07');
    expect(err.message).toBe('President cannot raise a complaint ticket against themselves.');
    expect(err.status).toBe(400);
  });

  it('parses the flat 429 body and preserves retry_after_seconds + message', async () => {
    const r = jsonResponse(
      {
        error: 'too_many_requests',
        message: 'You are reacting too fast. Please slow down.',
        retry_after_seconds: 8,
      },
      { status: 429 },
    );
    const err = await normalizeError(r, 'community');
    expect(err.code).toBe('TOO_MANY_REQUESTS');
    expect(err.message).toBe('You are reacting too fast. Please slow down.');
    expect(err.retryAfterSeconds).toBe(8);
    expect(err.status).toBe(429);
  });

  it('falls back to the Retry-After header when the body omits retry_after_seconds', async () => {
    const r = jsonResponse(
      { error: 'too_many_requests' },
      { status: 429, headers: { 'retry-after': '12' } },
    );
    const err = await normalizeError(r, 'community');
    expect(err.code).toBe('TOO_MANY_REQUESTS');
    expect(err.retryAfterSeconds).toBe(12);
  });

  it('maps 429 with no body or header to TOO_MANY_REQUESTS without retry hint', async () => {
    const r = new Response(null, { status: 429 });
    const err = await normalizeError(r, 'community');
    expect(err.code).toBe(ERROR_CODES.TOO_MANY_REQUESTS);
    expect(err.retryAfterSeconds).toBeUndefined();
  });

  it('keeps UNKNOWN code when body is non-JSON and status has no specific mapping', async () => {
    const r = new Response('<html>oops</html>', { status: 418 });
    const err = await normalizeError(r, 'community');
    expect(err.code).toBe(ERROR_CODES.UNKNOWN);
  });
});

describe('getUserMessage rate-limit formatting', () => {
  it('renders a seconds message when retry-after is under a minute', () => {
    const t = mockT();
    getUserMessage(rate(8), t);
    expect(t).toHaveBeenLastCalledWith('errors.tooManyRequestsSeconds', { seconds: 8 });
  });

  it('rounds non-integer seconds up', () => {
    const t = mockT();
    getUserMessage(rate(8.4), t);
    expect(t).toHaveBeenLastCalledWith('errors.tooManyRequestsSeconds', { seconds: 9 });
  });

  it('switches to a minutes message when retry-after is 60+ seconds', () => {
    const t = mockT();
    getUserMessage(rate(125), t);
    expect(t).toHaveBeenLastCalledWith('errors.tooManyRequestsMinutes', { minutes: 3 });
  });

  it('falls back to the no-hint message when retryAfterSeconds is missing', () => {
    const t = mockT();
    getUserMessage(rate(), t);
    expect(t).toHaveBeenLastCalledWith('errors.tooManyRequests');
  });

  it('still trusts a retry-after of exactly one hour', () => {
    const t = mockT();
    getUserMessage(rate(3600), t);
    expect(t).toHaveBeenLastCalledWith('errors.tooManyRequestsMinutes', { minutes: 60 });
  });

  it('ignores implausibly large retry-after values (community 429 quirk)', () => {
    const t = mockT();
    getUserMessage(rate(86_400), t);
    expect(t).toHaveBeenLastCalledWith('errors.tooManyRequests');
  });
});
