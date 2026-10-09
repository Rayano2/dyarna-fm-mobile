import { isUnconfirmedError } from './errors';

/**
 * Sentinel for a verifier that can prove the write landed but has no value to
 * hand back (the mutation resolves to `void`). Return it instead of `true` so
 * "committed" can never be confused with a falsy-but-real result.
 */
export const COMMITTED = Symbol('committed');

/**
 * Verdict of a verifier that can only answer yes/no: `COMMITTED` or "no proof".
 * Pairs with a mutation that resolves to `void` — there is no value to hand
 * back, so the mutation's own result type stays honest.
 */
export type ProofVerdict = typeof COMMITTED | null;

/**
 * Verdict of a verifier that proves the write landed *by producing the server's
 * own row*: the value itself, or `null` for "no proof". `COMMITTED` is
 * deliberately not part of this union — a mutation that resolves to `T` cannot
 * be satisfied by proof-without-a-value, and the two overloads of
 * `withReconcile` keep that impossible to express.
 */
export type ValueVerdict<T> = T | null;

/** Options shared by both `withReconcile` overloads. */
export interface ReconcileOptions {
  delayMs?: number;
}

// Give the server a moment before asking. The socket that died was very likely
// the response leg of a request the server is still finishing (#26); asking
// instantly can read a database state from before the commit and produce a
// false "not committed" — the exact wrong answer, since it downgrades a
// success back into an error toast.
const DEFAULT_VERIFY_DELAY_MS = 700;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Run a mutation and, if the response was lost, ask the server what actually
 * happened.
 *
 * The problem this solves (#26): a keep-alive socket that the edge already
 * closed makes `fetch` throw with no response *after* the server committed the
 * write. The request is not idempotent, so we must never send it again — the
 * transport retry list deliberately excludes every write verb, and the guard
 * test in `interceptors.test.ts` keeps it that way. Instead we read.
 *
 * Contract:
 * - `run` is called **exactly once, always**. There is no branch that re-runs
 *   it. This is the whole safety property; do not add one.
 * - Any error that is not `REQUEST_FAILED` (offline, timeout, or any HTTP
 *   status — all definitive answers) is rethrown untouched, without verifying.
 * - Committed ⇒ resolve as success, so React Query runs `onSuccess` and its
 *   invalidations and the user sees no error.
 * - Not committed, verdict unclear, or the verifier itself failing ⇒ rethrow
 *   the ORIGINAL `ApiError`. The verify error is never surfaced: the user's
 *   problem is their write, not our follow-up read.
 *
 * Only wire this into mutations whose verifier is unambiguous. "A post with
 * similar text exists" is not proof; `hasVoted === true` is.
 *
 * Two shapes, kept apart by overload so the compiler enforces the pairing:
 * - a `void` mutation with a yes/no verifier (`ProofVerdict`), and
 * - a value mutation whose verifier returns the row itself (`ValueVerdict<T>`).
 *
 * The split exists because `COMMITTED` carries no value: allowing it on a
 * value-returning mutation would mean resolving `T` with `undefined`, and the
 * caller would only find out by crashing on the first property access.
 */
export function withReconcile(
  run: () => Promise<void>,
  verify: () => Promise<ProofVerdict>,
  options?: ReconcileOptions,
): Promise<void>;
export function withReconcile<T>(
  run: () => Promise<T>,
  verify: () => Promise<ValueVerdict<T>>,
  options?: ReconcileOptions,
): Promise<T>;
export async function withReconcile<T>(
  run: () => Promise<T>,
  verify: () => Promise<T | typeof COMMITTED | null>,
  options?: ReconcileOptions,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isUnconfirmedError(error)) throw error;

    await sleep(options?.delayMs ?? DEFAULT_VERIFY_DELAY_MS);

    let verdict: T | typeof COMMITTED | null;
    try {
      verdict = await verify();
    } catch {
      // The read failed too (the connection is having a bad time). We know
      // nothing more than we did — keep the original, honest error.
      throw error;
    }

    // Only the `void` overload can produce `COMMITTED`, so `T` is `void` here
    // and `undefined` is its only inhabitant. The cast is confined to this
    // line; no caller can reach it with a value-returning `T`.
    if (verdict === COMMITTED) return undefined as T;
    // `null`/`undefined` mean "no proof". Inconclusive is NOT success: falling
    // back to the original error leaves the user with today's behaviour plus
    // the Phase-1 refresh, which is the safe direction to be wrong in.
    if (verdict === null || verdict === undefined) throw error;
    return verdict;
  }
}
