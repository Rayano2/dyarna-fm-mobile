import { secureStorage } from '@/shared/lib/storage';

/** Keychain / Keystore key for the FM session JWT. Versioned so a format change can migrate. */
export const FM_TOKEN_KEY = 'dyarna.fm.auth.v1.token';

export const tokenStore = {
  read(): Promise<string | null> {
    return secureStorage.getString(FM_TOKEN_KEY);
  },
  write(token: string): Promise<void> {
    return secureStorage.setString(FM_TOKEN_KEY, token);
  },
  clear(): Promise<void> {
    return secureStorage.remove(FM_TOKEN_KEY);
  },
};
