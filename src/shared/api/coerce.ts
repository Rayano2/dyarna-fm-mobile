// Defensive JSON coercion helpers shared by the feature API mappers.
//
// Several variants coexist on purpose: different backend surfaces are sloppy
// in different ways (e.g. marketplace ships numeric strings for prices), and
// the RN mappers must stay byte-compatible with what each Flutter model
// tolerated. Strict variants accept only the exact JSON type; the *Loose
// variants also parse string (and for booleans, number) forms. Do NOT swap a
// call site from one variant to another — it changes mapped output for
// malformed payloads.

export function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export function asStringOrUndef(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Strict: only a JSON number passes; anything else yields the fallback. */
export function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' ? v : fallback;
}

/** Loose: numbers pass through; numeric strings are parsed with parseFloat. */
export function asNumberLoose(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/**
 * Integer flavour (polls): numbers must be finite to pass through, and
 * numeric strings are parsed as base-10 integers.
 */
export function asIntLoose(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  if (typeof v === 'string') {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Strict: only a JSON boolean passes; anything else yields the fallback. */
export function asBoolean(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/**
 * Loose: also accepts "true"/"1" strings (any other string is false,
 * ignoring the fallback) and treats non-zero numbers as true.
 */
export function asBooleanLoose(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.toLowerCase();
    return s === 'true' || s === '1';
  }
  if (typeof v === 'number') return v !== 0;
  return fallback;
}

export function asBooleanOrUndef(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

/**
 * Unwrap a list-endpoint envelope: a bare array passes through, otherwise the
 * first entry in `keys` holding an array wins. Key order matters — each call
 * site passes the exact list (and order) its endpoint has always tried.
 */
export function extractArray(res: unknown, keys: readonly string[]): unknown[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>;
    for (const key of keys) {
      const value = obj[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}
