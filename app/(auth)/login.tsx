import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, Text, View, type TextInput } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
  FM_HOME_HREF,
  loginFm,
  loginResolver,
  useAuthStore,
  type LoginFailureKind,
  type LoginFormValues,
} from '@/features/auth';
import { useZodErrorText } from '@/shared/i18n/zod-error';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  Button,
  HapticPressable,
  Icons,
  Input,
  Logo,
  Screen,
  RTL_INLINE,
  useIsRtl,
} from '@/shared/ui';

// Company signup arrives with T11; the slot is reserved below.
const SHOW_SIGNUP = false;

export default function LoginScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const fieldError = useZodErrorText('fm.login');
  const signIn = useAuthStore((s) => s.signIn);
  const pushToast = useToastStore((s) => s.push);

  const passwordRef = useRef<TextInput>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  // 'storage': the keychain refused the token after a successful sign-in.
  const [serverError, setServerError] = useState<LoginFailureKind | 'storage' | null>(null);
  // True from submit until router.replace (or a failure), so the form never
  // re-enables between the API answering and the keychain write finishing.
  const [signingIn, setSigningIn] = useState(false);
  const [refocusPassword, setRefocusPassword] = useState(false);

  // Validate on submit, then live on change once an error has shown (same as the web form).
  const { control, handleSubmit, setValue } = useForm<LoginFormValues>({
    resolver: loginResolver,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({ mutationFn: loginFm });
  const submitting = login.isPending || signingIn;

  // The password input is not editable while submitting; focus it only once it is again.
  useEffect(() => {
    if (refocusPassword && !submitting) {
      passwordRef.current?.focus();
      setRefocusPassword(false);
    }
  }, [refocusPassword, submitting]);

  const showFailure = (kind: LoginFailureKind | 'storage'): void => {
    setSigningIn(false);
    setServerError(kind);
    AccessibilityInfo.announceForAccessibility(t(`fm.login.errors.${kind}`));
  };

  const onValid = async (values: LoginFormValues): Promise<void> => {
    Keyboard.dismiss();
    setServerError(null);
    setSigningIn(true);
    // loginFm maps every failure itself; the catch only guards the unexpected.
    const outcome = await login.mutateAsync(values).catch(() => ({ kind: 'network' as const }));
    if (outcome.kind === 'success') {
      try {
        await signIn(outcome.token, outcome.user);
      } catch {
        showFailure('storage');
        return;
      }
      pushToast({
        variant: 'success',
        title: t('fm.login.welcomeBack', { name: outcome.user.name }),
      });
      // `signingIn` stays true: this screen is leaving.
      router.replace(FM_HOME_HREF as never);
      return;
    }
    showFailure(outcome.kind);
    if (outcome.kind === 'invalidCredentials') {
      // Keep the email, clear the password and put the cursor back in it.
      setValue('password', '');
      setRefocusPassword(true);
    }
  };

  const onInvalid = (errors: FieldErrors<LoginFormValues>): void => {
    const first = fieldError(errors.email ?? errors.password);
    if (first) AccessibilityInfo.announceForAccessibility(first);
  };

  const submit = (): void => {
    void handleSubmit(onValid, onInvalid)();
  };

  return (
    <Screen scrollable testID="fm-login-screen" contentStyle={styles.content}>
      <View style={styles.logoSlot}>
        <Logo size={96} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {t('fm.login.title')}
      </Text>
      <Text style={styles.subtitle}>{t('fm.login.subtitle')}</Text>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Input
              label={t('fm.login.email')}
              accessibilityLabel={t('fm.login.email')}
              placeholder={t('fm.login.emailPlaceholder')}
              leadingIcon={<Icons.Envelope size={20} color={theme.colors.textMuted} />}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              // Email addresses are always LTR, even in Arabic.
              textAlign="left"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!submitting}
              value={field.value}
              onChangeText={(value) => {
                field.onChange(value);
                // The banner described the last attempt; editing starts a new one.
                if (serverError) setServerError(null);
              }}
              onBlur={field.onBlur}
              error={fieldError(fieldState.error)}
              testID="login-email"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Input
              ref={passwordRef}
              label={t('fm.login.password')}
              accessibilityLabel={t('fm.login.password')}
              placeholder={t('fm.login.passwordPlaceholder')}
              leadingIcon={<Icons.Lock size={20} color={theme.colors.textMuted} />}
              trailingIcon={
                <HapticPressable
                  onPress={() => setPasswordVisible((v) => !v)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    passwordVisible ? 'fm.login.hidePassword' : 'fm.login.showPassword',
                  )}
                  testID="login-password-toggle"
                >
                  {passwordVisible ? (
                    <Icons.EyeSlash size={20} color={theme.colors.textMuted} />
                  ) : (
                    <Icons.Eye size={20} color={theme.colors.textMuted} />
                  )}
                </HapticPressable>
              }
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              // Placeholder sits on the reading side; the masked value has no direction.
              textAlign={isRtl ? 'right' : 'left'}
              returnKeyType="go"
              onSubmitEditing={submit}
              editable={!submitting}
              value={field.value}
              onChangeText={(value) => {
                field.onChange(value);
                // The banner described the last attempt; editing starts a new one.
                if (serverError) setServerError(null);
              }}
              onBlur={field.onBlur}
              error={fieldError(fieldState.error)}
              testID="login-password"
            />
          )}
        />

        {serverError ? (
          <View
            style={styles.banner}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID="login-error-banner"
          >
            <Icons.Warning size={20} color={theme.colors.error} weight="fill" />
            <Text style={[styles.bannerText, isRtl ? RTL_INLINE : null]}>
              {t(`fm.login.errors.${serverError}`)}
            </Text>
          </View>
        ) : null}

        <Button
          label={t(submitting ? 'fm.login.submitting' : 'fm.login.submit')}
          onPress={submit}
          loading={submitting}
          disabled={submitting}
          fullWidth
          testID="login-submit"
        />
      </View>

      {SHOW_SIGNUP ? (
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>{t('fm.login.noAccount')}</Text>
          <Button label={t('fm.login.createAccount')} variant="ghost" size="sm" hitSlop={4} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[24],
    paddingVertical: theme.spacing[32],
  },
  logoSlot: { alignItems: 'center', marginBottom: theme.spacing[24] },
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
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[8],
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[12],
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.terracottaSubtle,
  },
  bannerText: {
    flex: 1,
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.error,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing[4],
    marginTop: theme.spacing[32],
  },
  signupText: { color: theme.colors.textMuted, fontSize: theme.type.body.md.size },
}));
