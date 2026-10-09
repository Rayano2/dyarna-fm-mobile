import { describe, expect, it } from 'vitest';
import i18next from 'i18next';
import en from '@/shared/i18n/translations/en.json';
import ar from '@/shared/i18n/translations/ar.json';
import { priorityLabel, statusLabel } from './labels';

const NO_NAMES = { statusNameAr: '', statusNameEn: '' };

async function makeT(lng: 'en' | 'ar') {
  const instance = i18next.createInstance();
  await instance.init({
    lng,
    resources: { en: { translation: en }, ar: { translation: ar } },
    interpolation: { escapeValue: false },
  });
  return instance.t;
}

describe('ticket labels for the bms-tms V6 lookup codes', () => {
  it('labels ON_HOLD, CANCELLED and CRITICAL in both languages', async () => {
    const tEn = await makeT('en');
    const tAr = await makeT('ar');
    expect(statusLabel(tEn, { statusCode: 'ON_HOLD', ...NO_NAMES }, 'en')).toBe('On hold');
    expect(statusLabel(tEn, { statusCode: 'CANCELLED', ...NO_NAMES }, 'en')).toBe('Cancelled');
    expect(priorityLabel(tEn, 'CRITICAL')).toBe('Critical');
    expect(statusLabel(tAr, { statusCode: 'ON_HOLD', ...NO_NAMES }, 'ar')).toBe('معلّقة');
    expect(priorityLabel(tAr, 'CRITICAL')).toBe('حرجة');
  });

  it('prefers the server status name, and falls back to the raw code when unknown', async () => {
    const tEn = await makeT('en');
    const names = { statusNameAr: 'قيد المراجعة', statusNameEn: 'Under review' };
    expect(statusLabel(tEn, { statusCode: 'UNDER_REVIEW', ...names }, 'en')).toBe('Under review');
    expect(statusLabel(tEn, { statusCode: 'UNDER_REVIEW', ...names }, 'ar')).toBe('قيد المراجعة');
    expect(statusLabel(tEn, { statusCode: 'UNDER_REVIEW', ...NO_NAMES }, 'en')).toBe(
      'UNDER_REVIEW',
    );
    expect(priorityLabel(tEn, 'P0')).toBe('P0');
  });
});
