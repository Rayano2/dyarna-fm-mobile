// Locale-aware Intl APIs (toLocaleString / toLocaleDateString / Intl.NumberFormat)
// can throw on some Hermes builds and for exotic locales/timezones — the same
// reason src/features/posts/lib/format-date.ts already wraps them. These helpers
// centralise that guard so any screen formatting a date or amount degrades to a
// plain value instead of crashing the render (notably in Arabic/RTL on Android).

export function safeToLocaleString(
  date: Date,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleString(locale, options);
  } catch {
    return date.toISOString();
  }
}

export function safeToLocaleDateString(
  date: Date,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function safeNumberFormat(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale = 'en-US',
): string {
  if (!Number.isFinite(value)) return '';
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return value.toFixed(options?.maximumFractionDigits ?? 0);
  }
}
