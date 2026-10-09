import { z } from 'zod';

export const ErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string().optional(),
  fields: z.record(z.string(), z.string()).optional(),
});

export const SuccessEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: z.unknown(),
});

export const ErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: ErrorPayloadSchema,
});

export const EnvelopeSchema = z.union([SuccessEnvelopeSchema, ErrorEnvelopeSchema]);

export type SuccessEnvelope<T> = { ok: true; data: T };
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
