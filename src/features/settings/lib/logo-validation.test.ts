import { describe, expect, it } from 'vitest';
import { MAX_LOGO_BYTES, isPng, logoFileName, validateLogo } from './logo-validation';

describe('validateLogo', () => {
  it('accepts a PNG at exactly 2MB', () => {
    expect(MAX_LOGO_BYTES).toBe(2 * 1024 * 1024);
    expect(validateLogo({ name: 'a.png', mimeType: 'image/png', size: MAX_LOGO_BYTES })).toBeNull();
  });

  it('rejects a PNG one byte over 2MB', () => {
    expect(validateLogo({ name: 'a.png', mimeType: 'image/png', size: MAX_LOGO_BYTES + 1 })).toBe(
      'tooLarge',
    );
  });

  it('rejects anything that is not a PNG', () => {
    expect(validateLogo({ name: 'a.jpg', mimeType: 'image/jpeg', size: 10 })).toBe('notPng');
    expect(validateLogo({ name: 'a.heic', mimeType: 'image/heic', size: 10 })).toBe('notPng');
    expect(validateLogo({ name: 'a.jpg', size: 10 })).toBe('notPng');
    expect(validateLogo({})).toBe('notPng');
  });

  it('checks the type before the size', () => {
    expect(validateLogo({ mimeType: 'image/jpeg', size: MAX_LOGO_BYTES * 3 })).toBe('notPng');
  });

  it('lets the MIME type win over a misleading extension', () => {
    expect(validateLogo({ name: 'a.png', mimeType: 'image/jpeg' })).toBe('notPng');
    expect(isPng({ name: 'photo', mimeType: 'image/png' })).toBe(true);
  });

  it('falls back to the extension when there is no MIME type', () => {
    expect(validateLogo({ name: 'LOGO.PNG', size: 100 })).toBeNull();
  });

  it('passes a PNG of unknown size', () => {
    expect(validateLogo({ mimeType: 'image/png', size: null })).toBeNull();
  });
});

describe('logoFileName', () => {
  it('always ends in .png', () => {
    expect(logoFileName(null)).toBe('logo.png');
    expect(logoFileName('brand.png')).toBe('brand.png');
    expect(logoFileName('IMG_0001')).toBe('IMG_0001.png');
  });
});
