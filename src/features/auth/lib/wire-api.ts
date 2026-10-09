import { registerApiDependencies } from '@/shared/api/registry';
import { useAuthStore } from '../stores/authStore';

/**
 * Connects the session to the shared API layer: every ky client (UMS, BMS,
 * TMS, Community) reads the Bearer token from here, and a 401 logs out through
 * here. The 401 interceptor (shared/api/interceptors/error.ts) owns the
 * single-fire latch, the toast and the redirect.
 */
export function wireSessionToApi(): void {
  registerApiDependencies({
    getActiveToken: () => useAuthStore.getState().token,
    logout: () => useAuthStore.getState().logout(),
    isAuthenticated: () => useAuthStore.getState().status === 'authenticated',
  });
}
