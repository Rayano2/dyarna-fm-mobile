import { z } from 'zod';
import type { TFunction } from 'i18next';
import type { ServiceName } from './types';
import { ErrorEnvelopeSchema } from './schemas/envelope';

export const ERROR_CODES = {
  // NETWORK is now narrow and literal: the device is offline. Everything that
  // merely failed to reach a response is REQUEST_FAILED or TIMEOUT.
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  REQUEST_FAILED: 'REQUEST_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION_FAILED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = string;

export interface ApiErrorInit {
  code: ErrorCode;
  message?: string;
  status: number;
  service: ServiceName;
  fields?: Record<string, string>;
  // Seconds until the client may retry. Sourced from either a `Retry-After`
  // response header or a `retry_after_seconds` body field (rate-limit 429s).
  retryAfterSeconds?: number;
  raw: unknown;
}

export class ApiError extends Error {
  code: ErrorCode;
  status: number;
  service: ServiceName;
  fields: Record<string, string> | undefined;
  retryAfterSeconds: number | undefined;
  raw: unknown;
  constructor(init: ApiErrorInit) {
    super(init.message ?? init.code);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.service = init.service;
    this.fields = init.fields;
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.raw = init.raw;
  }
}

/**
 * "The request never came back — so we do not know whether the server applied
 * it." REQUEST_FAILED is the one code with a genuinely unknown outcome: the
 * write may well have committed and only the response was lost (#26). NETWORK
 * (device offline) and TIMEOUT keep their own, more specific handling; every
 * HTTP status error is a definitive answer from the server and is never
 * unconfirmed.
 *
 * Callers use this to soften the copy, refresh the screen, or — where a
 * server-side check is unambiguous — reconcile the outcome (`withReconcile`).
 */
export function isUnconfirmedError(error: unknown): boolean {
  return error instanceof ApiError && error.code === ERROR_CODES.REQUEST_FAILED;
}

// Various backends ship a flat error shape instead of our wrapped envelope.
// Rate-limit (community): { error: "too_many_requests", message, retry_after_seconds }
// TMS / BMS validation:    { code: "BMS_400_07", message, success: false, ... }
// Match all the field-name variants so we can preserve a human-readable
// message + machine code instead of falling through to a useless "UNKNOWN".
const FlatErrorBodySchema = z.object({
  error: z.string().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
  detail: z.string().optional(),
  retry_after_seconds: z.number().optional(),
  retryAfterSeconds: z.number().optional(),
});

function parseRetryAfterHeader(value: string | null): number | undefined {
  if (!value) return undefined;
  // HTTP allows either a number of seconds or an HTTP-date. We only handle
  // the seconds form here — the date form is rare in practice and the
  // server already gives us a body field for everything we care about.
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function fallbackCodeForStatus(status: number): ErrorCode {
  if (status === 401) return ERROR_CODES.UNAUTHORIZED;
  if (status === 403) return ERROR_CODES.FORBIDDEN;
  if (status === 404) return ERROR_CODES.NOT_FOUND;
  if (status === 429) return ERROR_CODES.TOO_MANY_REQUESTS;
  return ERROR_CODES.UNKNOWN;
}

// `preParsedBody` exists because ky v2 consumes the response body into
// `HTTPError.data` before beforeError hooks run — by the time the error
// interceptor calls us, `response.clone()` throws "Body has already been
// consumed". Callers holding an unread Response may omit it.
export async function normalizeError(
  response: Response,
  service: ServiceName,
  preParsedBody?: unknown,
): Promise<ApiError> {
  const status = response.status;
  const headerRetry = parseRetryAfterHeader(response.headers.get('retry-after'));
  let body: unknown = preParsedBody;
  if (body === undefined) {
    try {
      body = await response.clone().json();
    } catch {
      // body not JSON — leave undefined and fall through to the status-only path
    }
  }

  if (body !== undefined) {
    // 1) Wrapped envelope: { ok: false, error: { code, message, fields } }
    const envelope = ErrorEnvelopeSchema.safeParse(body);
    if (envelope.success) {
      return new ApiError({
        code: envelope.data.error.code,
        ...(envelope.data.error.message ? { message: envelope.data.error.message } : {}),
        ...(envelope.data.error.fields ? { fields: envelope.data.error.fields } : {}),
        ...(headerRetry === undefined ? {} : { retryAfterSeconds: headerRetry }),
        status,
        service,
        raw: body,
      });
    }

    // 2) Flat error body: { error?, code?, message?, detail?, retry_after_seconds? }
    const flat = FlatErrorBodySchema.safeParse(body);
    if (
      flat.success &&
      (flat.data.error || flat.data.code || flat.data.message || flat.data.detail)
    ) {
      const rawCode = flat.data.error ?? flat.data.code;
      const code = rawCode ? rawCode.toUpperCase() : fallbackCodeForStatus(status);
      const message = flat.data.message ?? flat.data.detail;
      const retryAfterSeconds =
        flat.data.retry_after_seconds ?? flat.data.retryAfterSeconds ?? headerRetry;
      return new ApiError({
        code,
        ...(message ? { message } : {}),
        ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
        status,
        service,
        raw: body,
      });
    }
  }

  // 3) Status-only fallback
  return new ApiError({
    code: fallbackCodeForStatus(status),
    status,
    service,
    ...(headerRetry === undefined ? {} : { retryAfterSeconds: headerRetry }),
    raw: body ?? null,
  });
}

export function getUserMessage(error: ApiError, t: TFunction): string {
  // Rate-limit gets special handling so we can surface the retry-after hint.
  const isRateLimited = error.status === 429 || error.code === ERROR_CODES.TOO_MANY_REQUESTS;
  if (isRateLimited) return formatRateLimitMessage(error, t);

  const known: Record<string, string> = {
    NETWORK_ERROR: t('errors.network'),
    // Both carry ky's raw English message (kept for logs); map them here so
    // the user never sees "Request timed out" verbatim via the fallback below.
    TIMEOUT: t('errors.timeout'),
    REQUEST_FAILED: t('errors.requestFailed'),
    BUILDING_NOT_FOUND: t('errors.buildingNotFound'),
    OTP_INVALID: t('errors.otpInvalid'),
    OTP_EXPIRED: t('errors.otpInvalid'),
    OTP_TOO_MANY_ATTEMPTS: t('errors.otpTooManyAttempts'),
    EMAIL_ALREADY_REGISTERED: t('errors.emailAlreadyRegistered'),
  };
  if (error.status >= 500) return t('errors.server');
  return known[error.code] ?? error.message ?? t('errors.generic');
}

// The community service has been seen returning absurdly large
// retry_after_seconds values on 429s. Past an hour we stop trusting the
// number and show the generic message instead of "try again in 1440m".
const MAX_TRUSTED_RETRY_AFTER_SECONDS = 3600;

function formatRateLimitMessage(error: ApiError, t: TFunction): string {
  const seconds = error.retryAfterSeconds;
  if (seconds === undefined || seconds <= 0 || seconds > MAX_TRUSTED_RETRY_AFTER_SECONDS) {
    return t('errors.tooManyRequests');
  }
  if (seconds < 60) {
    return t('errors.tooManyRequestsSeconds', { seconds: Math.ceil(seconds) });
  }
  // Round up so "Try again in 1m" never undershoots the server's window.
  const minutes = Math.ceil(seconds / 60);
  return t('errors.tooManyRequestsMinutes', { minutes });
}
