import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { BottomSheet, Button, useRtlTextStyle, type BottomSheetRef } from '@/shared/ui';

export interface ConfirmSendSheetProps {
  /** Recipients the send will target (the count shown in the copy). */
  count: number;
  sending: boolean;
  onConfirm: () => void;
}

/** Last step before a send: the reminder is a push and cannot be recalled. */
export const ConfirmSendSheet = forwardRef<BottomSheetRef, ConfirmSendSheetProps>(
  function ConfirmSendSheet({ count, sending, onConfirm }, ref) {
    const { t } = useTranslation();
    const rtlText = useRtlTextStyle();

    const dismiss = (): void => {
      if (ref && typeof ref !== 'function') ref.current?.dismiss();
    };

    const footer = (
      <View style={styles.footer}>
        <View style={styles.footerButton}>
          <Button
            label={t('common.cancel')}
            variant="ghost"
            fullWidth
            disabled={sending}
            onPress={dismiss}
          />
        </View>
        <View style={styles.footerButton}>
          <Button
            label={t('fm.paymentReminders.confirmSend')}
            fullWidth
            loading={sending}
            disabled={sending}
            onPress={onConfirm}
          />
        </View>
      </View>
    );

    return (
      <BottomSheet ref={ref} snapPoints={['40%']} footer={footer}>
        <Text style={[styles.title, rtlText]} accessibilityRole="header">
          {t('fm.paymentReminders.confirmTitle')}
        </Text>
        <Text style={[styles.body, rtlText]}>
          {t('fm.paymentReminders.confirmDescription', { count })}
        </Text>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create((theme) => ({
  title: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  body: {
    marginTop: theme.spacing[8],
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
  },
  footer: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
}));
