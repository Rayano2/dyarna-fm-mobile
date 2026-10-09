import type { TFunction } from 'i18next';
import type { FmTicket } from '../types';

type Lang = 'ar' | 'en';

export function langOf(language: string): Lang {
  return language.startsWith('ar') ? 'ar' : 'en';
}

/** Server display name first (`statusNameAr/En`), then our label for the code, then the raw code. */
export function statusLabel(
  t: TFunction,
  ticket: Pick<FmTicket, 'statusCode' | 'statusNameAr' | 'statusNameEn'>,
  lang: Lang,
): string {
  const server = lang === 'ar' ? ticket.statusNameAr : ticket.statusNameEn;
  if (server) return server;
  return t(`fm.tickets.status.${ticket.statusCode}`, { defaultValue: ticket.statusCode });
}

export function categoryLabel(
  ticket: Pick<FmTicket, 'categoryCode' | 'categoryNameAr' | 'categoryNameEn'>,
  lang: Lang,
): string {
  const server = lang === 'ar' ? ticket.categoryNameAr : ticket.categoryNameEn;
  return server || ticket.categoryNameEn || ticket.categoryCode;
}

export function priorityLabel(t: TFunction, code: string): string {
  return t(`fm.tickets.priority.${code}`, { defaultValue: code });
}
