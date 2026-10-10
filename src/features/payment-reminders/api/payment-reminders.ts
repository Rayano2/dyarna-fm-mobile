import { bmsClient } from '@/shared/api/clients';
import {
  mapQueued,
  mapSend,
  type PaymentReminderQueued,
  type PaymentReminderSend,
  type SendPaymentReminderRequest,
} from './mappers';

const BASE = 'api/bms/payment-reminders';

/** 202 Accepted: the audience is locked in, the pushes fan out asynchronously. */
export async function sendPaymentReminder(
  payload: SendPaymentReminderRequest,
): Promise<PaymentReminderQueued> {
  const body = await bmsClient.post(BASE, { json: payload }).json<unknown>();
  return mapQueued(body);
}

export async function fetchPaymentReminderStatus(sendId: string): Promise<PaymentReminderSend> {
  const body = await bmsClient.get(`${BASE}/${encodeURIComponent(sendId)}`).json<unknown>();
  return mapSend(body);
}
