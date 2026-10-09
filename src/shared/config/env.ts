import { z } from 'zod';

const EnvSchema = z.object({
  UMS_BASE_URL: z.string().url(),
  BMS_BASE_URL: z.string().url(),
  TMS_BASE_URL: z.string().url(),
  COMMUNITY_BASE_URL: z.string().url(),
  ENV: z.enum(['development', 'production']),
  API_TIMEOUT: z.coerce.number().int().positive(),
  DEEP_LINK_SCHEME: z.string().min(1),
  APP_VARIANT: z.enum(['development', 'production']),
  // Public https origin used in the body of shared post links so the
  // resulting URL works even when the recipient doesn't have the app
  // installed. Defaults to Flutter's value; override with
  // EXPO_PUBLIC_SHARE_WEB_BASE_URL or set to "" to fall back to a raw
  // deep-link.
  SHARE_WEB_BASE_URL: z.string().default('https://v0-open-app-link.vercel.app'),
});

const parsed = EnvSchema.safeParse({
  UMS_BASE_URL: process.env.EXPO_PUBLIC_UMS_BASE_URL,
  BMS_BASE_URL: process.env.EXPO_PUBLIC_BMS_BASE_URL,
  TMS_BASE_URL: process.env.EXPO_PUBLIC_TMS_BASE_URL,
  COMMUNITY_BASE_URL: process.env.EXPO_PUBLIC_COMMUNITY_BASE_URL,
  ENV: process.env.EXPO_PUBLIC_ENV,
  API_TIMEOUT: process.env.EXPO_PUBLIC_API_TIMEOUT,
  DEEP_LINK_SCHEME: process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME,
  APP_VARIANT: process.env.EXPO_PUBLIC_APP_VARIANT,
  SHARE_WEB_BASE_URL: process.env.EXPO_PUBLIC_SHARE_WEB_BASE_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const ENV = parsed.data;
export type Env = typeof ENV;
