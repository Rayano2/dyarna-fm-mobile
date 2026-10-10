/**
 * The Help & Support content contract, ported from the FM web
 * (`client/src/lib/support-content.ts`): who a facility manager can reach,
 * and which questions the FAQ answers.
 *
 * Every channel is nullable on purpose. `null` is a shipping value, not a
 * placeholder: a channel that is `null` renders no row at all, which beats
 * dialling a number nobody answers. Only email is supplied today. Filling one
 * in later is a one-line change here, with no screen changes.
 *
 * Only labels live in i18n (`fm.support.*`). The addresses are
 * locale-independent and belong here.
 */

export type SupportChannelId = 'whatsapp' | 'email' | 'phone';

export interface SupportContacts {
  /**
   * An international WhatsApp number in any human-written shape
   * (`9665XXXXXXXX`, `+966 5XX XXX XXX`). Non-digits are stripped before use:
   * `wa.me` 404s on a leading `+`, while the displayed number needs one.
   */
  whatsappNumber: string | null;
  /** A plain mailbox address, shown as-is and used for `mailto:`. */
  email: string | null;
  /** E.164 including the leading `+`, valid for `tel:` and for display. */
  phone: string | null;
}

export const SUPPORT_CONTACTS: SupportContacts = {
  whatsappNumber: null,
  email: 'support@dyarna.co',
  phone: null,
};

function whatsAppDigits(contacts: SupportContacts): string | null {
  const digits = contacts.whatsappNumber?.replaceAll(/\D/g, '');
  return digits || null;
}

/**
 * The WhatsApp deep link, or `null` when WhatsApp is unconfigured. The only
 * place that can build a `wa.me` URL, so `wa.me/null` is impossible.
 *
 * `prefillText` is a translated static string. Never pass user, company or
 * ticket data into it.
 */
export function getWhatsAppUrl(
  prefillText: string,
  contacts: SupportContacts = SUPPORT_CONTACTS,
): string | null {
  const digits = whatsAppDigits(contacts);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(prefillText)}`;
}

/** The on-screen WhatsApp number (`+` and digits), or `null` when unconfigured. */
export function getWhatsAppDisplay(contacts: SupportContacts = SUPPORT_CONTACTS): string | null {
  const digits = whatsAppDigits(contacts);
  return digits ? `+${digits}` : null;
}

export interface SupportChannel {
  id: SupportChannelId;
  /** What `Linking.openURL` receives. */
  url: string;
  /** The address/number shown on the row. Always rendered left-to-right. */
  display: string;
}

/**
 * The contact rows to render, in the web's order (WhatsApp, email, phone).
 * Any channel whose constant is null or blank is left out entirely.
 */
export function getSupportChannels(
  whatsappPrefill: string,
  contacts: SupportContacts = SUPPORT_CONTACTS,
): SupportChannel[] {
  const channels: SupportChannel[] = [];
  const whatsappUrl = getWhatsAppUrl(whatsappPrefill, contacts);
  const whatsappDisplay = getWhatsAppDisplay(contacts);
  if (whatsappUrl && whatsappDisplay) {
    channels.push({ id: 'whatsapp', url: whatsappUrl, display: whatsappDisplay });
  }
  const email = contacts.email?.trim();
  if (email) channels.push({ id: 'email', url: `mailto:${email}`, display: email });
  const phone = contacts.phone?.trim();
  if (phone) channels.push({ id: 'phone', url: `tel:${phone}`, display: phone });
  return channels;
}

/**
 * The FAQ, in render order. Ids are semantic, not positional, so reordering or
 * removing one never repoints a translation at a different question. Each id
 * resolves to `fm.support.faq.items.<id>.question` and `.answer`.
 */
export const SUPPORT_FAQ_IDS = [
  'approveResidentRequest',
  'startProgressMissing',
  'slaTimerAndBreach',
  'buildingCodeAndJoining',
  'bookingStuckPending',
  'facilitySetup',
  'offboardResident',
  'paymentReminderRecipients',
] as const;

export type SupportFaqId = (typeof SUPPORT_FAQ_IDS)[number];
