import { Linking } from 'react-native';

/**
 * Normalise a phone number for the wa.me URL host. Mirrors the logic in
 * Flutter's marketplace + complaints flows: keep digits and a leading +,
 * default a missing country code to Saudi (+966), strip the leading 0
 * that local-format numbers often carry, then drop the + since wa.me
 * wants digits only.
 */
export function normalizeSaudiPhone(input: string): string {
  const cleaned = input.replaceAll(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  return `966${cleaned.replace(/^0+/, '')}`;
}

/**
 * Open a WhatsApp chat with the given phone number. Uses the wa.me HTTPS
 * host so the OS resolves to the WhatsApp app when installed and falls
 * back to the App/Play Store otherwise. Returns false when the phone is
 * empty so callers can keep the button hidden in that case.
 */
export async function openWhatsapp(phone: string | undefined | null): Promise<boolean> {
  const normalized = phone ? normalizeSaudiPhone(phone) : '';
  if (!normalized) return false;
  await Linking.openURL(`https://wa.me/${normalized}`);
  return true;
}
