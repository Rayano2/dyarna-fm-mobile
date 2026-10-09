import type { BeforeRequestHook, AfterResponseHook } from 'ky';
import type { ServiceName } from '../types';
import { logger } from '@/shared/lib/logger';

function mask(value: string): string {
  if (value.length <= 6) return '***';
  return value.slice(0, 3) + '***' + value.slice(-3);
}

function maskBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) return body;
  const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const key of Object.keys(clone)) {
    if (/token|otp|password/i.test(key)) {
      const v = clone[key];
      clone[key] = typeof v === 'string' ? mask(v) : '***';
    }
  }
  return clone;
}

function pathWithQuery(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return `${u.pathname}${u.search}`;
  } catch {
    return rawUrl;
  }
}

export function loggerRequest(service: ServiceName): BeforeRequestHook {
  return async ({ request }) => {
    if (!__DEV__) return;
    let body: unknown;
    try {
      const raw = await request.clone().text();
      body = raw ? JSON.parse(raw) : undefined;
    } catch {
      body = undefined;
    }
    logger.debug(`[${service}] → ${request.method} ${pathWithQuery(request.url)}`, {
      body: maskBody(body),
    });
  };
}

function summarizeResponseBody(parsed: unknown): Record<string, unknown> {
  if (parsed === undefined || parsed === null) return { value: parsed };
  if (Array.isArray(parsed)) {
    return {
      arrayLength: parsed.length,
      firstItemKeys:
        parsed[0] && typeof parsed[0] === 'object' ? Object.keys(parsed[0]) : undefined,
    };
  }
  if (typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const summary: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        const first = value[0];
        summary[key] = {
          arrayLength: value.length,
          firstItemKeys: first && typeof first === 'object' ? Object.keys(first) : undefined,
        };
      } else if (value && typeof value === 'object') {
        summary[key] = { objectKeys: Object.keys(value as object) };
      } else {
        summary[key] = value;
      }
    }
    return summary;
  }
  return { value: parsed };
}

export function loggerResponse(service: ServiceName): AfterResponseHook {
  return async ({ request, response }) => {
    if (!__DEV__) return;
    let parsedBody: unknown;
    try {
      const raw = await response.clone().text();
      parsedBody = raw ? JSON.parse(raw) : undefined;
    } catch {
      parsedBody = undefined;
    }
    logger.debug(
      `[${service}] ← ${response.status} ${request.method} ${pathWithQuery(request.url)}`,
      parsedBody === undefined ? undefined : summarizeResponseBody(parsedBody),
    );
  };
}
