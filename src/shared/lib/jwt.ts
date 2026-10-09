// Reads the user id out of the session JWT without verifying it — the
// client only needs its own claims. Full session tokens carry the user id
// in `sub` (with `userId` on TEMP tokens once the profile exists); TEMP
// tokens issued before profile creation have an email `sub` and no userId.

function base64UrlDecode(input: string): string {
  const b64 = input.replaceAll('-', '+').replaceAll('_', '/');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let percentEncoded = '';
  let bits = 0;
  let buffer = 0;
  for (const ch of b64) {
    if (ch === '=') break;
    const value = alphabet.indexOf(ch);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      const byte = (buffer >> bits) & 0xff;
      percentEncoded += `%${byte.toString(16).padStart(2, '0')}`;
    }
  }
  // decodeURIComponent reassembles multi-byte UTF-8 (names in claims can be
  // Arabic); the ids we care about are plain ASCII either way.
  return decodeURIComponent(percentEncoded);
}

export function jwtUserId(token: string | null): string | null {
  if (!token) return null;
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(base64UrlDecode(payload)) as Record<string, unknown>;
    const candidate = claims.userId ?? claims.sub;
    if (typeof candidate !== 'string' || !candidate || candidate.includes('@')) return null;
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Decodes a JWT's claims segment WITHOUT verifying the signature — the client
 * only reads its own token. Returns null for anything that is not a JWT with a
 * JSON-object payload.
 */
export function jwtClaims(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const claims: unknown = JSON.parse(base64UrlDecode(payload));
    return claims && typeof claims === 'object' && !Array.isArray(claims)
      ? (claims as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
