// Public API of the FM auth feature.
export { useAuthStore, type AuthState, type SessionStatus } from './stores/authStore';
export { loginFm, TMS_LOGIN_PATH, type LoginOutcome, type LoginFailureKind } from './api/login';
export { loginSchema, loginResolver, type LoginFormValues } from './lib/login-schema';
export { FM_ALLOWED_ROLES, isFmRoleAllowed, userFromToken, type FmUser } from './lib/fm-user';
export {
  guardRedirect,
  FM_HOME_HREF,
  LOGIN_HREF,
  SIGNUP_HREF,
  type RouteGroup,
} from './lib/boot-guard';
export { wireSessionToApi } from './lib/wire-api';
export { LogoutRow } from './components/LogoutRow';
export {
  registerCompanyRep,
  verifySignupEmail,
  signupFailureMessage,
  COMPANY_REP_REGISTER_PATH,
  COMPANY_REP_VERIFY_EMAIL_PATH,
  type SignupFailure,
  type RegisterOutcome,
  type VerifyOutcome,
} from './api/signup';
export { signupSchema, signupResolver, type SignupFormValues } from './lib/signup-schema';
export { SignupForm } from './components/SignupForm';
export { SignupOtpStep } from './components/SignupOtpStep';
