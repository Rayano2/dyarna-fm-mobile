import { create } from 'zustand';
import { logger } from '@/shared/lib/logger';
import { queryClient } from '@/shared/query';
import { userFromToken, type FmUser } from '../lib/fm-user';
import { tokenStore } from '../lib/token-store';

/** 'booting' until the token has been read from secure storage (splash stays up). */
export type SessionStatus = 'booting' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: SessionStatus;
  token: string | null;
  user: FmUser | null;
  /** Reads the stored token once at boot. Token present -> authenticated. */
  hydrate(): Promise<void>;
  signIn(token: string, user: FmUser): Promise<void>;
  /** Clears the in-memory session, the query cache and the stored token. */
  logout(): Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'booting',
  token: null,
  user: null,

  async hydrate() {
    let token: string | null = null;
    try {
      token = await tokenStore.read();
    } catch (error) {
      // An unreadable keychain must not strand the user on the splash.
      logger.warn('Could not read the stored FM session', error);
    }
    set(
      token
        ? { status: 'authenticated', token, user: userFromToken(token) }
        : { status: 'unauthenticated', token: null, user: null },
    );
  },

  async signIn(token, user) {
    await tokenStore.write(token);
    set({ status: 'authenticated', token, user });
  },

  async logout() {
    // In-memory state first: the 401 interceptor's latch reads
    // `isAuthenticated` to decide whether another logout is needed, and no
    // further request may pick up the old token while the keychain write runs.
    set({ status: 'unauthenticated', token: null, user: null });
    queryClient.clear();
    try {
      await tokenStore.clear();
    } catch (error) {
      logger.warn('Could not clear the stored FM session', error);
    }
  },
}));
