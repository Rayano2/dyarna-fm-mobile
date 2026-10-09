// Ported from dyarna-rn `features/tickets/components/TicketDetail/format-absolute.ts`.
export function formatAbsolute(dateString: string | undefined, locale: 'en' | 'ar'): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return date.toISOString();
  }
}
