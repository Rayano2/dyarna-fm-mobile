// Public API of the FM auth feature.
export { useAuthStore, type AuthState, type SessionStatus } from './stores/authStore';
export { loginFm, TMS_LOGIN_PATH, type LoginOutcome, type LoginFailureKind } from './api/login';
export { loginSchema, loginResolver, type LoginFormValues } from './lib/login-schema';
export { FM_ALLOWED_ROLES, isFmRoleAllowed, userFromToken, type FmUser } from './lib/fm-user';
export { guardRedirect, FM_HOME_HREF, LOGIN_HREF, type RouteGroup } from './lib/boot-guard';
export { wireSessionToApi } from './lib/wire-api';
export { LogoutRow } from './components/LogoutRow';
