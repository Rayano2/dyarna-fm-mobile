// Runtime registry for cross-cutting callbacks the API interceptors need.
// Registered once at app boot by the root layout, read lazily by interceptors.
// This avoids circular imports between api/ and stores/services.

type TokenGetter = () => string | null;
type LogoutFn = () => Promise<void>;
type ToastFn = (msg: {
  variant: 'success' | 'error' | 'info' | 'warning';
  title: string;
  body?: string;
}) => void;
type NavigateFn = (href: string) => void;
type AuthCheck = () => boolean;
type OfflineCheck = () => Promise<boolean>;

interface ApiRegistry {
  getActiveToken: TokenGetter;
  logout: LogoutFn;
  pushToast: ToastFn;
  navigate: NavigateFn;
  isAuthenticated: AuthCheck;
  // Answers "is the device definitely offline right now?" at the moment a
  // request fails. Lives here rather than importing networkService directly
  // so the interceptors stay free of native modules (and testable in node).
  isDeviceOffline: OfflineCheck;
}

const noop = async () => {};

export const apiRegistry: ApiRegistry = {
  getActiveToken: () => null,
  logout: noop,
  pushToast: () => {},
  navigate: () => {},
  isAuthenticated: () => false,
  // Default is "not offline": never accuse the user's connection unless
  // something authoritative (networkService) says so.
  isDeviceOffline: async () => false,
};

export function registerApiDependencies(deps: Partial<ApiRegistry>): void {
  Object.assign(apiRegistry, deps);
}
