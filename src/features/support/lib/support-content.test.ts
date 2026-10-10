import { describe, expect, it } from 'vitest';
import en from '@/shared/i18n/translations/en.json';
import ar from '@/shared/i18n/translations/ar.json';
import {
  SUPPORT_CONTACTS,
  SUPPORT_FAQ_IDS,
  getSupportChannels,
  getWhatsAppDisplay,
  getWhatsAppUrl,
  type SupportContacts,
} from './support-content';

const NONE: SupportContacts = { whatsappNumber: null, email: null, phone: null };

describe('getSupportChannels', () => {
  it('ships email only today, as a mailto link', () => {
    expect(getSupportChannels('hi')).toEqual([
      { id: 'email', url: 'mailto:support@dyarna.co', display: 'support@dyarna.co' },
    ]);
    expect(SUPPORT_CONTACTS.whatsappNumber).toBeNull();
    expect(SUPPORT_CONTACTS.phone).toBeNull();
  });

  it('hides every null channel', () => {
    expect(getSupportChannels('hi', NONE)).toEqual([]);
  });

  it('hides blank and digit-less channels too', () => {
    expect(getSupportChannels('hi', { whatsappNumber: '+ -', email: '  ', phone: '' })).toEqual([]);
  });

  it('renders all three in web order when configured', () => {
    const channels = getSupportChannels('Hello & bye', {
      whatsappNumber: '+966 50-123-4567',
      email: 'a@b.co',
      phone: '+966501234567',
    });
    expect(channels.map((c) => c.id)).toEqual(['whatsapp', 'email', 'phone']);
    expect(channels[0]).toEqual({
      id: 'whatsapp',
      url: 'https://wa.me/966501234567?text=Hello%20%26%20bye',
      display: '+966501234567',
    });
    expect(channels[2]?.url).toBe('tel:+966501234567');
  });
});

describe('WhatsApp helpers', () => {
  it('return null when unconfigured', () => {
    expect(getWhatsAppUrl('x', NONE)).toBeNull();
    expect(getWhatsAppDisplay(NONE)).toBeNull();
  });

  it('never emit a double plus', () => {
    expect(getWhatsAppDisplay({ ...NONE, whatsappNumber: '+966 5' })).toBe('+9665');
  });
});

describe('FAQ copy', () => {
  type Faq = Record<string, { question?: string; answer?: string }>;
  const items = (locale: unknown): Faq =>
    (locale as { fm: { support: { faq: { items: Faq } } } }).fm.support.faq.items;

  it('has a question and an answer for every id in both locales', () => {
    for (const locale of [en, ar]) {
      for (const id of SUPPORT_FAQ_IDS) {
        expect(items(locale)[id]?.question).toBeTruthy();
        expect(items(locale)[id]?.answer).toBeTruthy();
      }
    }
  });
});
