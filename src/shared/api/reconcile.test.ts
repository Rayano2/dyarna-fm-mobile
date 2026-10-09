import { describe, expect, it, vi } from 'vitest';
import { ApiError, ERROR_CODES } from './errors';
import { COMMITTED, withReconcile, type ProofVerdict } from './reconcile';

const unconfirmed = (): ApiError =>
  new ApiError({
    code: ERROR_CODES.REQUEST_FAILED,
    status: 0,
    service: 'ums',
    message: 'Network request failed',
    raw: null,
  });

const definitive = (code: string, status: number): ApiError =>
  new ApiError({ code, status, service: 'ums', raw: null });

// Keep the tests fast: the production delay exists to let the server finish
// committing, which a fake verifier does not need.
const NO_DELAY = { delayMs: 0 };

describe('withReconcile', () => {
  it('resolves with the mutation result when nothing went wrong', async () => {
    const run = vi.fn(async () => 'ok');
    const verify = vi.fn(async (): Promise<string | null> => 'from the verifier');

    await expect(withReconcile(run, verify, NO_DELAY)).resolves.toBe('ok');
    expect(run).toHaveBeenCalledTimes(1);
    expect(verify).not.toHaveBeenCalled();
  });

  it('resolves as success when the verifier proves the write landed', async () => {
    const error = unconfirmed();
    const run = vi.fn(async () => {
      throw error;
    });
    const verify = vi.fn(async (): Promise<ProofVerdict> => COMMITTED);

    await expect(withReconcile(run, verify, NO_DELAY)).resolves.toBeUndefined();
    expect(run).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('returns the value the verifier found', async () => {
    const run = vi.fn(async (): Promise<{ id: string }> => {
      throw unconfirmed();
    });
    const verify = vi.fn(async () => ({ id: 'booking-1' }));

    await expect(withReconcile(run, verify, NO_DELAY)).resolves.toEqual({ id: 'booking-1' });
  });

  it('rethrows the ORIGINAL error when the write did not land', async () => {
    const error = unconfirmed();
    const run = vi.fn(async () => {
      throw error;
    });
    const verify = vi.fn(async (): Promise<ProofVerdict> => null);

    await expect(withReconcile(run, verify, NO_DELAY)).rejects.toBe(error);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('rethrows the ORIGINAL error when the verifier itself fails', async () => {
    const error = unconfirmed();
    const run = vi.fn(async () => {
      throw error;
    });
    const verifyError = new Error('the read failed too');
    const verify = vi.fn(async () => {
      throw verifyError;
    });

    const thrown = await withReconcile(run, verify, NO_DELAY).catch((error_: unknown) => error_);
    expect(thrown).toBe(error);
    expect(thrown).not.toBe(verifyError);
  });

  it.each([
    ['a timeout', definitive(ERROR_CODES.TIMEOUT, 0)],
    ['an offline device', definitive(ERROR_CODES.NETWORK, 0)],
    ['a 400 from the server', definitive('VALIDATION_FAILED', 400)],
    ['a 409 from the server', definitive('CONFLICT', 409)],
    ['a plain Error', new Error('boom')],
  ])('does not verify after %s — the answer is already definitive', async (_label, error) => {
    const run = vi.fn(async () => {
      throw error;
    });
    const verify = vi.fn(async (): Promise<ProofVerdict> => COMMITTED);

    await expect(withReconcile(run, verify, NO_DELAY)).rejects.toBe(error);
    expect(verify).not.toHaveBeenCalled();
  });

  it('never re-runs the write, in any branch', async () => {
    const outcomes: (() => Promise<ProofVerdict>)[] = [
      async () => COMMITTED,
      async () => null,
      async () => {
        throw new Error('verify exploded');
      },
    ];

    for (const verify of outcomes) {
      const run = vi.fn(async () => {
        throw unconfirmed();
      });
      await withReconcile(run, verify, NO_DELAY).catch(() => {});
      expect(run).toHaveBeenCalledTimes(1);
    }
  });

  it('waits before verifying so it cannot read a pre-commit state', async () => {
    vi.useFakeTimers();
    try {
      const verify = vi.fn(async (): Promise<ProofVerdict> => COMMITTED);
      const promise = withReconcile(async () => {
        throw unconfirmed();
      }, verify).catch(() => {});

      await vi.advanceTimersByTimeAsync(100);
      expect(verify).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1000);
      expect(verify).toHaveBeenCalledTimes(1);
      await promise;
    } finally {
      vi.useRealTimers();
    }
  });
});
