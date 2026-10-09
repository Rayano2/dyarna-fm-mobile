import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { FieldLabel, confirmAction } from '@/features/scope';
import {
  BottomSheet,
  Button,
  FormTextArea,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import type { Booking } from '../api/bookings-api';
import { REJECT_REASON_MAX, rejectReasonError } from '../lib/booking-meta';

export interface RejectReasonSheetProps {
  booking: Booking | null;
  submitting: boolean;
  /** Called with the trimmed reason after the user confirms. */
  onSubmit: (booking: Booking, reason: string) => void;
}

/** Reject needs a reason (trimmed, ≤ 500) and a confirm. The reason goes to the resident. */
export const RejectReasonSheet = forwardRef<BottomSheetRef, RejectReasonSheetProps>(
  function RejectReasonSheet({ booking, submitting, onSubmit }, ref) {
    const { t } = useTranslation();
    const rtlText = useRtlTextStyle();
    const [reason, setReason] = useState('');
    const [touched, setTouched] = useState(false);
    const errorKey = rejectReasonError(reason);

    const submit = (): void => {
      setTouched(true);
      if (!booking || errorKey) return;
      confirmAction({
        title: t('fm.bookings.rejectConfirmTitle'),
        message: t('fm.bookings.rejectConfirmBody', { facility: booking.facilityName }),
        confirmLabel: t('fm.bookings.reject'),
        cancelLabel: t('common.cancel'),
        onConfirm: () => onSubmit(booking, reason.trim()),
      });
    };

    return (
      <BottomSheet
        ref={ref}
        scrollable
        snapPoints={['70%']}
        onDismiss={() => {
          setReason('');
          setTouched(false);
        }}
        footer={
          <Button
            label={t('fm.bookings.reject')}
            variant="destructive"
            fullWidth
            loading={submitting}
            disabled={submitting}
            onPress={submit}
          />
        }
      >
        <View style={styles.body}>
          <Text style={[styles.title, rtlText]} accessibilityRole="header">
            {t('fm.bookings.rejectTitle')}
          </Text>
          {booking ? (
            <Text style={[styles.sub, rtlText]}>
              {t('fm.bookings.rejectDescription', { facility: booking.facilityName })}
            </Text>
          ) : null}
          <FieldLabel
            label={t('fm.bookings.rejectReason')}
            count={reason.length}
            max={REJECT_REASON_MAX}
          />
          <FormTextArea
            bottomSheet
            minHeight={120}
            value={reason}
            onChangeText={setReason}
            onBlur={() => setTouched(true)}
            maxLength={REJECT_REASON_MAX}
            accessibilityLabel={t('fm.bookings.rejectReason')}
            error={touched && errorKey ? t(errorKey) : undefined}
          />
        </View>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create((theme) => ({
  body: { gap: theme.spacing[8] },
  title: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  sub: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[8],
  },
}));
