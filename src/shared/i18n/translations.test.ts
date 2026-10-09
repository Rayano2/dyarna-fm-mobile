import { describe, expect, it } from 'vitest';
import ar from './translations/ar.json';
import en from './translations/en.json';

function leafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      return leafKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe('translation key parity', () => {
  it('en and ar expose exactly the same keys', () => {
    const enKeys = new Set(leafKeys(en));
    const arKeys = new Set(leafKeys(ar));
    const missingFromAr = [...enKeys].filter((k) => !arKeys.has(k));
    const missingFromEn = [...arKeys].filter((k) => !enKeys.has(k));
    expect({ missingFromAr, missingFromEn }).toEqual({
      missingFromAr: [],
      missingFromEn: [],
    });
  });
});
