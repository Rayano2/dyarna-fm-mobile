import { useRef, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
  LOGIN_HREF,
  SignupForm,
  SignupOtpStep,
  registerCompanyRep,
  signupFailureMessage,
  verifySignupEmail,
  type SignupFormValues,
} from '@/features/auth';
import { useToastStore } from '@/shared/stores/toastStore';
import { Button, Icons, Logo, Screen } from '@/shared/ui';

type Step = 'form' | 'otp' | 'success';

function backToLogin(): void {
  if (router.canGoBack()) router.back();
  else router.replace(LOGIN_HREF as never);
}

export default function SignupScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const pushToast = useToastStore((s) => s.push);

  const [step, setStep] = useState<Step>('form');
  const [submitted, setSubmitted] = useState<SignupFormValues | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [codeRejected, setCodeRejected] = useState(false);
  // The TEMP token from register. Memory only, never the token store: it is not
  // a session, and it dies with this screen. Sent once, on verify-email.
  const tempTokenRef = useRef<string | null>(null);

  const register = useMutation({ mutationFn: registerCompanyRep });
  const verify = useMutation({
    mutationFn: ({ token, otp }: { token: string; otp: string }) => verifySignupEmail(token, otp),
  });

  const onRegister = async (values: SignupFormValues): Promise<void> => {
    setFormError(null);
    const outcome = await register.mutateAsync(values).catch(() => null);
    if (outcome?.kind === 'success') {
      tempTokenRef.current = outcome.tempToken;
      setSubmitted(values);
      setCode('');
      setOtpError(null);
      setCodeRejected(false);
      setStep('otp');
      pushToast({ variant: 'success', title: t('fm.signup.codeSent') });
      AccessibilityInfo.announceForAccessibility(t('fm.signup.codeSent'));
      return;
    }
    const message = signupFailureMessage(
      outcome ? outcome.failure : { reason: 'other', error: null },
      'register',
      t,
    );
    setFormError(message);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const onVerify = async (): Promise<void> => {
    const token = tempTokenRef.current;
    if (!token) {
      // Nothing to verify with (should not happen): start the form again.
      setStep('form');
      return;
    }
    setOtpError(null);
    setCodeRejected(false);
    const outcome = await verify.mutateAsync({ token, otp: code }).catch(() => null);
    if (outcome?.kind === 'success') {
      tempTokenRef.current = null;
      setStep('success');
      AccessibilityInfo.announceForAccessibility(t('fm.signup.success.title'));
      return;
    }
    const failure = outcome ? outcome.failure : { reason: 'other' as const, error: null };
    const message = signupFailureMessage(failure, 'verify', t);
    setOtpError(message);
    setCodeRejected(failure.reason === 'invalidCode');
    AccessibilityInfo.announceForAccessibility(message);
  };

  const onCodeChange = (value: string): void => {
    setCode(value);
    if (otpError) setOtpError(null);
    if (codeRejected) setCodeRejected(false);
  };

  const onEditDetails = (): void => {
    tempTokenRef.current = null;
    setFormError(null);
    setStep('form');
  };

  const title =
    step === 'form'
      ? t('fm.signup.title')
      : step === 'otp'
        ? t('fm.signup.otp.title')
        : t('fm.signup.success.title');
  const subtitle =
    step === 'form'
      ? t('fm.signup.subtitle')
      : step === 'otp'
        ? t('fm.signup.otp.subtitle')
        : t('fm.signup.success.body');

  return (
    <Screen scrollable testID="fm-signup-screen" contentStyle={styles.content}>
      <View style={styles.logoSlot}>
        {step === 'success' ? (
          <View style={styles.successBadge} testID="signup-success-icon">
            <Icons.CheckCircle size={48} color={theme.colors.success} weight="fill" />
          </View>
        ) : (
          <Logo size={96} />
        )}
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {step === 'form' ? (
        <SignupForm
          defaultValues={submitted}
          submitting={register.isPending}
          serverError={formError}
          onDismissError={() => setFormError(null)}
          onSubmit={(values) => void onRegister(values)}
          onSignIn={backToLogin}
        />
      ) : null}

      {step === 'otp' && submitted ? (
        <SignupOtpStep
          email={submitted.email}
          code={code}
          onCodeChange={onCodeChange}
          submitting={verify.isPending}
          error={otpError}
          codeRejected={codeRejected}
          onSubmit={() => void onVerify()}
          onEditDetails={onEditDetails}
        />
      ) : null}

      {step === 'success' ? (
        <View style={styles.form}>
          <Text style={styles.hint}>{t('fm.signup.success.hint')}</Text>
          <Button
            label={t('fm.signup.success.backToLogin')}
            onPress={backToLogin}
            fullWidth
            testID="signup-back-to-login"
          />
        </View>
      ) : null}
    </Screen>
  );
}

// Same frame as the login screen (app/(auth)/login.tsx).
const styles = StyleSheet.create((theme) => ({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[24],
    paddingVertical: theme.spacing[32],
  },
  logoSlot: { alignItems: 'center', marginBottom: theme.spacing[24] },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySubtle,
  },
  title: {
    fontSize: theme.type.display.lg.size,
    lineHeight: theme.type.display.lg.lineHeight,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'Fraunces-Medium',
  },
  subtitle: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing[8],
    marginBottom: theme.spacing[32],
  },
  form: { gap: theme.spacing[16] },
  hint: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
}));
