import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { useLayoutDirection } from './useLayoutDirection';

const store = vi.hoisted(() => ({ locale: 'en' as 'en' | 'ar' }));

// Calls the selector against a fake state: the hook's logic without a renderer.
vi.mock('@/shared/stores/localeStore', () => ({
  useLocaleStore: <T>(selector: (s: { locale: 'en' | 'ar' }) => T): T => selector(store),
}));

vi.mock('@/shared/i18n/rtl', () => ({
  layoutDirectionFor: (locale: string) => (locale === 'ar' ? 'rtl' : 'ltr'),
}));

describe('useLayoutDirection', () => {
  it('follows the locale store', () => {
    store.locale = 'ar';
    expect(useLayoutDirection()).toBe('rtl');
    store.locale = 'en';
    expect(useLayoutDirection()).toBe('ltr');
  });
});

/**
 * Every JS root must carry the direction: the app root, and each RN <Modal>,
 * which is a separate native root that does not inherit it (FM #110 item 2).
 * A source check, because there is no component renderer in this repo.
 */
const ROOTS = [
  'app/_layout.tsx',
  'src/shared/ui/DatePickerModal.tsx',
  'src/shared/ui/ImageViewer.tsx',
];

describe('direction is applied on every root', () => {
  it.each(ROOTS)('%s styles its root with useLayoutDirection()', (file) => {
    const source = readFileSync(path.resolve(__dirname, '../../..', file), 'utf8');
    expect(source).toMatch(/const direction = useLayoutDirection\(\);/);
    expect(source).toMatch(/\{ direction \}\]/);
  });

  it('no other file opens an RN <Modal> without it', () => {
    const hits = execSync('git grep -l -E "<Modal( |$)" -- src app', {
      cwd: path.resolve(__dirname, '../../..'),
      encoding: 'utf8',
    })
      .split('\n')
      .filter((f) => f.endsWith('.tsx'));
    for (const file of hits) expect(ROOTS).toContain(file);
  });
});
