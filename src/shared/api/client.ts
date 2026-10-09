import ky, { isHTTPError, isTimeoutError, type KyInstance } from 'ky';
import { ENV } from '@/shared/config/env';
import { authInterceptor } from './interceptors/auth';
import { loggerRequest, loggerResponse } from './interceptors/logger';
import { errorInterceptor } from './interceptors/error';
import type { ServiceName } from './types';

export interface ClientConfig {
  baseUrl: string;
  service: ServiceName;
}

/**
 * Transport-level retry policy. Exported so it can be asserted on — see the
 * guard test in `interceptors/interceptors.test.ts`.
 *
 * `methods` MUST stay limited to safe, side-effect-free verbs. A request that
 * failed without a response may still have been processed by the server, so
 * auto-retrying a POST/PATCH/PUT/DELETE risks a duplicate booking, ticket or
 * poll vote. Mutations surface the failure to the user instead; the retry is
 * theirs to make, deliberately.
 */
export const RETRY_CONFIG = {
  limit: 2,
  methods: ['get'],
  // Transport-level failures only (timeouts, bad gateways). 500s are
  // deliberately excluded: React Query owns logical retries, and hooks
  // that set `retry: 0` to spare a flaky endpoint (useEscalationSettings)
  // must actually get zero retries.
  statusCodes: [408, 502, 503, 504],
} as const;

/**
 * Transport failures that mean "the socket died", not "the server answered".
 *
 * ky ships its own `is-network-error` heuristic, but it only recognises a fixed
 * list of messages. A release Android build talking to a keep-alive edge (#26)
 * can throw a message that list does not contain — OkHttp surfaces a reused,
 * server-closed pooled socket as an unexpected end of stream / connection reset
 * rather than RN's usual "Network request failed". When ky doesn't recognise the
 * message it silently treats the throw as non-retryable, so a GET that a single
 * retry would have fixed fails outright. Match the wider set ourselves.
 */
const TRANSPORT_FAILURE_PATTERNS = [
  'network request failed',
  'unexpected end of stream',
  'connection reset',
  'connection abort',
  'socket closed',
];

function isTransportFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return TRANSPORT_FAILURE_PATTERNS.some((pattern) => message.includes(pattern));
}

export function createApiClient({ baseUrl, service }: ClientConfig): KyInstance {
  return ky.create({
    prefix: baseUrl,
    timeout: ENV.API_TIMEOUT,
    retry: {
      limit: RETRY_CONFIG.limit,
      methods: [...RETRY_CONFIG.methods],
      statusCodes: [...RETRY_CONFIG.statusCodes],
      // A timeout already burned the full budget; replaying it just makes the
      // user wait another whole timeout for the same answer.
      retryOnTimeout: false,
      // SAFE FOR MUTATIONS BY CONSTRUCTION: ky checks `retry.methods.includes(
      // request.method)` BEFORE it ever calls `shouldRetry` (see
      // `ky/distribution/core/Ky.js`). While `methods` is `['get']` — and the
      // guard test in `interceptors.test.ts` makes sure it stays that way —
      // this predicate is unreachable for POST/PATCH/PUT/DELETE and cannot
      // resurrect a double-write. It only widens *which GET failures* retry.
      //
      // Returns `true`/`false` only where we mean to override ky; every other
      // case returns `undefined` so ky falls through to its own defaults — that
      // is what keeps the 408/502/503/504 status retries working.
      //
      // A `true` here is a HARD yes: ky returns a delay immediately and never
      // reaches its own `statusCodes` gate. So any error that carries a response
      // is handed straight back to ky — the server answered, and only ky's
      // status list decides whether that answer is retryable. Without this,
      // a gateway echoing "connection reset" into the status text of, say, a
      // 401 or a 422 would make us replay it.
      shouldRetry: ({ error }): boolean | undefined => {
        if (isHTTPError(error)) return undefined;
        if (isTimeoutError(error)) return false;
        if (isTransportFailure(error)) return true;
        return undefined;
      },
    },
    hooks: {
      beforeRequest: [authInterceptor, loggerRequest(service)],
      afterResponse: [loggerResponse(service)],
      beforeError: [errorInterceptor(service)],
    },
  });
}
