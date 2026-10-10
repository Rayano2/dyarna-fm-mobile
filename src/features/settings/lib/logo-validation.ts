/**
 * Local pre-checks for the company logo, mirroring the FM web settings page:
 * PNG only, at most 2MB. They run before any network call so a doomed upload
 * never leaves the device. BMS stays the authority.
 */

export const MAX_LOGO_MB = 2;
export const MAX_LOGO_BYTES = MAX_LOGO_MB * 1024 * 1024;
export const LOGO_MIME = 'image/png';

export interface LogoCandidate {
  /** File name from the picker, if it reported one. */
  name?: string | null | undefined;
  /** MIME type from the picker, if it reported one. */
  mimeType?: string | null | undefined;
  /** Size in bytes, if the picker reported one. */
  size?: number | null | undefined;
}

export type LogoProblem = 'notPng' | 'tooLarge';

/**
 * PNG when the picker's MIME type says so (the web's `type.includes('png')`).
 * Only when the picker gives no MIME type does the file extension decide.
 */
export function isPng(file: LogoCandidate): boolean {
  const mime = file.mimeType?.trim().toLowerCase();
  if (mime) return mime.includes('png');
  return (file.name ?? '').trim().toLowerCase().endsWith('.png');
}

/**
 * Null when the file may be uploaded. An unknown size passes (some pickers
 * don't report one); the type check never does.
 */
export function validateLogo(file: LogoCandidate): LogoProblem | null {
  if (!isPng(file)) return 'notPng';
  if (typeof file.size === 'number' && file.size > MAX_LOGO_BYTES) return 'tooLarge';
  return null;
}

/** A name ending in `.png`, so the multipart part matches its content type. */
export function logoFileName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'logo.png';
  return trimmed.toLowerCase().endsWith('.png') ? trimmed : `${trimmed}.png`;
}
