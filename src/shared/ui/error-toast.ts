import type { TFunction } from 'i18next';
import { ApiError, getUserMessage } from '@/shared/api/errors';
import type { ToastInput } from '@/shared/stores/toastStore';

export interface ApiErrorToastOptions {
  /**
   * Short, action-oriented title shown when the server provided a
   * descriptive message — e.g. "Couldn't submit request", "Couldn't
   * post comment". The body slot then carries the server reason.
   * Falls back to the server message in the title when no server
   * message exists (so generic failures still surface something).
   */
  fallbackTitle: string;
}

type ToastPush = (input: ToastInput) => string;

/**
 * Surface a mutation failure to the user with the most informative shape
 * the error supports. Replaces the pattern:
 *
 *   const title = error instanceof ApiError ? getUserMessage(error, t) : t('errors.generic');
 *   toast({ variant: 'error', title });
 *
 * which truncates long server messages and drops the action context.
 * Rules:
 * - 429s render as `warning` (yellow) with the retry-after countdown.
 * - When the server gave us a real message, use `fallbackTitle` as the
 *   headline and the server text as the body (where the Toast has room
 *   to wrap up to 5 lines). Bump duration so the user has time to read.
 * - Otherwise (network / generic / translated short message), single-line
 *   toast with the message in the title.
 */
export function showApiErrorToast(
  push: ToastPush,
  error: unknown,
  t: TFunction,
  options: ApiErrorToastOptions,
): void {
  const isApi = error instanceof ApiError;
  const message = isApi ? getUserMessage(error, t) : t('errors.generic');
  const variant: 'warning' | 'error' = isApi && error.status === 429 ? 'warning' : 'error';

  // `getUserMessage` returns `error.message` verbatim when the server
  // supplied one. If they match, we have a contextual message worth
  // putting in the body; otherwise the helper returned a generic
  // translated string that reads fine as a title on its own.
  const hasServerMessage = isApi && !!error.message && message === error.message;

  if (hasServerMessage) {
    push({
      variant,
      title: options.fallbackTitle,
      body: message,
      durationMs: 7000,
    });
    return;
  }

  push({ variant, title: message, durationMs: 5000 });
}
