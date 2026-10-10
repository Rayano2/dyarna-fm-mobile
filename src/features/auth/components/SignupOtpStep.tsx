import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Button, Icons, OtpBoxes, RTL_INLINE, useIsRtl } from '@/shared/ui';
import { isCompleteOtp } from '../lib/signup-schema';

export const SIGNUP_OTP_LENGTH = 4;

export interface SignupOtpStepProps {
  email: string;
  code: string;
  onCodeChange: (code: string) => void;
  submitting: boolean;
  /** Already-translated error, or null. */
  error: string | null;
  /** True when `error` is about the code itself, so the boxes shake and go red. */
  codeRejected: boolean;
  onSubmit: () => void;
  onEditDetails: () => void;
}

/**
 * The 4-digit email code step. No resend: the web signup has none and BMS
 * exposes no resend endpoint for company reps; "Edit details" re-registers,
 * which sends a fresh code.
 */
export function SignupOtpStep({
  email,
  code,
  onCodeChange,
  submitting,
  error,
  codeRejected,
  onSubmit,
  onEditDetails,
}: SignupOtpStepProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const complete = isCompleteOtp(code);

  return (
    <View style={styles.form}>
      <View style={styles.sentTo}>
        <Text style={[styles.sentToLabel, isRtl ? RTL_INLINE : null]}>
          {t('fm.signup.otp.sentTo')}
        </Text>
        {/* Email addresses are always LTR, even in Arabic. */}
        <Text style={styles.email} testID="signup-otp-email">
          {email}
        </Text>
      </View>

      <View style={styles.boxes} accessibilityLabel={t('fm.signup.otp.codeLabel')}>
        <OtpBoxes
          value={code}
          onChange={onCodeChange}
          length={SIGNUP_OTP_LENGTH}
          error={codeRejected}
          disabled={submitting}
        />
      </View>

      {error ? (
        <View
          style={styles.banner}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID="signup-otp-error-banner"
        >
          <Icons.Warning size={20} color={theme.colors.error} weight="fill" />
          <Text style={[styles.bannerText, isRtl ? RTL_INLINE : null]}>{error}</Text>
        </View>
      ) : null}

      <Button
        label={t(submitting ? 'fm.signup.otp.submitting' : 'fm.signup.otp.submit')}
        onPress={onSubmit}
        loading={submitting}
        disabled={submitting || !complete}
        fullWidth
        testID="signup-otp-submit"
      />
      {code.length > 0 ? (
        <Button
          label={t('fm.signup.otp.clear')}
          variant="secondary"
          onPress={() => onCodeChange('')}
          disabled={submitting}
          fullWidth
          testID="signup-otp-clear"
        />
      ) : null}
      <Button
        label={t('fm.signup.otp.editDetails')}
        variant="ghost"
        size="sm"
        onPress={onEditDetails}
        disabled={submitting}
        testID="signup-otp-edit"
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: { gap: theme.spacing[16] },
  sentTo: { alignItems: 'center', gap: theme.spacing[4] },
  sentToLabel: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  email: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  boxes: { alignItems: 'center', paddingVertical: theme.spacing[8] },
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
}));
