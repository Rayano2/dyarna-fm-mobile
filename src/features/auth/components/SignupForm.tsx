import { useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, Text, View, type TextInput } from 'react-native';
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useZodErrorText } from '@/shared/i18n/zod-error';
import {
  Button,
  HapticPressable,
  Icons,
  Input,
  RTL_INLINE,
  SegmentedPill,
  useIsRtl,
} from '@/shared/ui';
import {
  PASSWORD_RULES,
  signupResolver,
  type GenderCode,
  type SignupFormValues,
} from '../lib/signup-schema';

const EMPTY_VALUES: SignupFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  genderCode: 'MALE',
  password: '',
};

// Field order for announcing the first invalid field (matches the screen order).
const FIELD_ORDER = ['firstName', 'lastName', 'email', 'mobile', 'genderCode', 'password'] as const;

export interface SignupFormProps {
  /** Restores what the user typed when they come back from the code step. */
  defaultValues?: SignupFormValues | undefined;
  submitting: boolean;
  /** Already-translated server error, or null. */
  serverError: string | null;
  onDismissError: () => void;
  onSubmit: (values: SignupFormValues) => void;
  onSignIn: () => void;
}

export function SignupForm({
  defaultValues,
  submitting,
  serverError,
  onDismissError,
  onSubmit,
  onSignIn,
}: SignupFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const fieldError = useZodErrorText('fm.signup');

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const mobileRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Validate on submit, then live on change once an error has shown (same as login).
  const { control, handleSubmit } = useForm<SignupFormValues>({
    resolver: signupResolver,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: defaultValues ?? EMPTY_VALUES,
  });
  const password = useWatch({ control, name: 'password' });

  const textAlign = isRtl ? 'right' : 'left';

  // Every edit starts a new attempt, so the banner about the last one goes.
  const clearBanner = (): void => {
    if (serverError) onDismissError();
  };

  const onInvalid = (errors: FieldErrors<SignupFormValues>): void => {
    const field = FIELD_ORDER.find((name) => errors[name]);
    const first = field ? fieldError(errors[field]) : undefined;
    if (first) AccessibilityInfo.announceForAccessibility(first);
  };

  const submit = (): void => {
    Keyboard.dismiss();
    void handleSubmit(onSubmit, onInvalid)();
  };

  const genderOptions: [
    { value: GenderCode; label: string },
    { value: GenderCode; label: string },
  ] = [
    { value: 'MALE', label: t('fm.signup.male') },
    { value: 'FEMALE', label: t('fm.signup.female') },
  ];

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="firstName"
        render={({ field, fieldState }) => (
          <Input
            label={t('fm.signup.firstName')}
            accessibilityLabel={t('fm.signup.firstName')}
            placeholder={t('fm.signup.firstNamePlaceholder')}
            leadingIcon={<Icons.User size={20} color={theme.colors.textMuted} />}
            autoComplete="given-name"
            textContentType="givenName"
            textAlign={textAlign}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => lastNameRef.current?.focus()}
            editable={!submitting}
            value={field.value}
            onChangeText={(value) => {
              field.onChange(value);
              clearBanner();
            }}
            onBlur={field.onBlur}
            error={fieldError(fieldState.error)}
            testID="signup-first-name"
          />
        )}
      />
      <Controller
        control={control}
        name="lastName"
        render={({ field, fieldState }) => (
          <Input
            ref={lastNameRef}
            label={t('fm.signup.lastName')}
            accessibilityLabel={t('fm.signup.lastName')}
            placeholder={t('fm.signup.lastNamePlaceholder')}
            leadingIcon={<Icons.User size={20} color={theme.colors.textMuted} />}
            autoComplete="family-name"
            textContentType="familyName"
            textAlign={textAlign}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => emailRef.current?.focus()}
            editable={!submitting}
            value={field.value}
            onChangeText={(value) => {
              field.onChange(value);
              clearBanner();
            }}
            onBlur={field.onBlur}
            error={fieldError(fieldState.error)}
            testID="signup-last-name"
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Input
            ref={emailRef}
            label={t('fm.signup.email')}
            accessibilityLabel={t('fm.signup.email')}
            placeholder={t('fm.signup.emailPlaceholder')}
            leadingIcon={<Icons.Envelope size={20} color={theme.colors.textMuted} />}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            // Email addresses are always LTR, even in Arabic.
            textAlign="left"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => mobileRef.current?.focus()}
            editable={!submitting}
            value={field.value}
            onChangeText={(value) => {
              field.onChange(value);
              clearBanner();
            }}
            onBlur={field.onBlur}
            error={fieldError(fieldState.error)}
            testID="signup-email"
          />
        )}
      />
      <Controller
        control={control}
        name="mobile"
        render={({ field, fieldState }) => (
          <Input
            ref={mobileRef}
            label={t('fm.signup.mobile')}
            accessibilityLabel={t('fm.signup.mobile')}
            placeholder={t('fm.signup.mobilePlaceholder')}
            helper={t('fm.signup.mobileHint')}
            leadingIcon={<Icons.Phone size={20} color={theme.colors.textMuted} />}
            keyboardType="number-pad"
            maxLength={9}
            autoComplete="tel"
            textContentType="telephoneNumber"
            // Phone numbers are always LTR, even in Arabic.
            textAlign="left"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!submitting}
            value={field.value}
            onChangeText={(value) => {
              field.onChange(value);
              clearBanner();
            }}
            onBlur={field.onBlur}
            error={fieldError(fieldState.error)}
            testID="signup-mobile"
          />
        )}
      />
      <Controller
        control={control}
        name="genderCode"
        render={({ field, fieldState }) => {
          const error = fieldError(fieldState.error);
          return (
            <View style={styles.fieldGroup} accessibilityLabel={t('fm.signup.gender')}>
              <Text style={[styles.fieldLabel, isRtl ? RTL_INLINE : null]}>
                {t('fm.signup.gender')}
              </Text>
              <SegmentedPill
                options={genderOptions}
                value={field.value}
                onChange={(value) => {
                  if (submitting) return;
                  field.onChange(value);
                  clearBanner();
                }}
                fullWidth
                testID="signup-gender"
              />
              {error ? <Text style={styles.fieldError}>{error}</Text> : null}
            </View>
          );
        }}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <Input
            ref={passwordRef}
            label={t('fm.signup.password')}
            accessibilityLabel={t('fm.signup.password')}
            placeholder={t('fm.signup.passwordPlaceholder')}
            leadingIcon={<Icons.Lock size={20} color={theme.colors.textMuted} />}
            trailingIcon={
              <HapticPressable
                onPress={() => setPasswordVisible((v) => !v)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t(
                  passwordVisible ? 'fm.signup.hidePassword' : 'fm.signup.showPassword',
                )}
                testID="signup-password-toggle"
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
            autoComplete="new-password"
            textContentType="newPassword"
            // Placeholder sits on the reading side; the masked value has no direction.
            textAlign={textAlign}
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!submitting}
            value={field.value}
            onChangeText={(value) => {
              field.onChange(value);
              clearBanner();
            }}
            onBlur={field.onBlur}
            error={fieldError(fieldState.error)}
            testID="signup-password"
          />
        )}
      />

      {password ? (
        <View style={styles.rules} testID="signup-password-rules">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            const label = t(`fm.signup.rules.${rule.key}`);
            return (
              <View
                key={rule.key}
                style={styles.ruleRow}
                accessible
                accessibilityLabel={`${label}, ${t(met ? 'fm.signup.rules.met' : 'fm.signup.rules.unmet')}`}
              >
                {met ? (
                  <Icons.Check size={14} color={theme.colors.success} weight="bold" />
                ) : (
                  <Icons.X size={14} color={theme.colors.textMuted} />
                )}
                <Text
                  style={[styles.ruleText, met && styles.ruleTextMet, isRtl ? RTL_INLINE : null]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {serverError ? (
        <View
          style={styles.banner}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID="signup-error-banner"
        >
          <Icons.Warning size={20} color={theme.colors.error} weight="fill" />
          <Text style={[styles.bannerText, isRtl ? RTL_INLINE : null]}>{serverError}</Text>
        </View>
      ) : null}

      <Button
        label={t(submitting ? 'fm.signup.submitting' : 'fm.signup.submit')}
        onPress={submit}
        loading={submitting}
        disabled={submitting}
        fullWidth
        testID="signup-submit"
      />

      <View style={styles.signInRow}>
        <Text style={styles.signInText}>{t('fm.signup.haveAccount')}</Text>
        <Button
          label={t('fm.signup.signIn')}
          variant="ghost"
          size="sm"
          hitSlop={4}
          onPress={onSignIn}
          disabled={submitting}
          testID="signup-sign-in"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: { gap: theme.spacing[16] },
  fieldGroup: { gap: theme.spacing[6] },
  // Same as Input's label / error text so the pill reads as one more field.
  fieldLabel: {
    fontSize: theme.type.label.md.size,
    lineHeight: theme.type.label.md.lineHeight,
    fontWeight: theme.type.label.md.weight,
    color: theme.colors.textSecondary,
  },
  fieldError: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.error,
  },
  rules: { gap: theme.spacing[4], marginTop: -theme.spacing[8] },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[6] },
  ruleText: {
    flex: 1,
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textMuted,
  },
  ruleTextMet: { color: theme.colors.success },
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
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing[4],
    marginTop: theme.spacing[16],
  },
  signInText: { color: theme.colors.textMuted, fontSize: theme.type.body.md.size },
}));
