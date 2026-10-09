import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { useLocaleStore } from '@/shared/stores/localeStore';
import { BottomSheet, Button, useRtlTextStyle, type BottomSheetRef } from '@/shared/ui';
import type { Booking } from '../api/bookings-api';
import { durationMinutes } from '../lib/booking-dates';
import { formatDate, formatDayHeader, formatTimeRange } from '../lib/format-booking-time';
import { BookingStatusBadge } from './BookingStatusBadge';

export interface BookingDetailSheetProps {
  booking: Booking | null;
  approving: boolean;
  onApprove: (booking: Booking) => void;
  onReject: (booking: Booking) => void;
}

function Field({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  const rtlText = useRtlTextStyle();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, rtlText]}>{label}</Text>
      <Text style={[styles.fieldValue, ltr ? styles.ltr : rtlText]}>{value}</Text>
    </View>
  );
}

export const BookingDetailSheet = forwardRef<BottomSheetRef, BookingDetailSheetProps>(
  function BookingDetailSheet({ booking, approving, onApprove, onReject }, ref) {
    const { t } = useTranslation();
    const locale = useLocaleStore((s) => s.locale);
    const rtlText = useRtlTextStyle();
    const pending = booking?.status === 'PENDING';
    const minutes = booking ? durationMinutes(booking.startTime, booking.endTime) : undefined;
    const decidedAt = booking?.approvedAt ? formatDate(booking.approvedAt, locale) : undefined;

    const footer =
      booking && pending ? (
        <View style={styles.footerRow}>
          <View style={styles.footerButton}>
            <Button
              label={t('fm.bookings.reject')}
              variant="destructive"
              fullWidth
              disabled={approving}
              accessibilityLabel={t('fm.bookings.rejectA11y', { title: booking.facilityName })}
              onPress={() => onReject(booking)}
            />
          </View>
          <View style={styles.footerButton}>
            <Button
              label={t('fm.bookings.approve')}
              fullWidth
              loading={approving}
              disabled={approving}
              accessibilityLabel={t('fm.bookings.approveA11y', { title: booking.facilityName })}
              onPress={() => onApprove(booking)}
            />
          </View>
        </View>
      ) : undefined;

    return (
      <BottomSheet ref={ref} scrollable snapPoints={['75%']} {...(footer ? { footer } : {})}>
        {booking ? (
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, rtlText]} accessibilityRole="header">
                {booking.title || booking.facilityName}
              </Text>
              <BookingStatusBadge status={booking.status} size="md" />
            </View>
            <Field label={t('fm.bookings.facility')} value={booking.facilityName} />
            <Field
              label={t('fm.bookings.resident')}
              value={booking.residentName ?? t('fm.bookings.unknownResident')}
            />
            {booking.startTime ? (
              <Field
                label={t('fm.bookings.time')}
                value={`${formatDayHeader(booking.startTime, locale)}  ${formatTimeRange(
                  booking.startTime,
                  booking.endTime,
                  locale,
                )}`}
                ltr
              />
            ) : null}
            {minutes === undefined ? null : (
              <Field
                label={t('fm.bookings.duration')}
                value={t('fm.bookings.minutes', { count: minutes })}
                ltr
              />
            )}
            {booking.guestCount === undefined ? null : (
              <Field label={t('fm.bookings.guests')} value={String(booking.guestCount)} ltr />
            )}
            {booking.notes ? <Field label={t('fm.bookings.notes')} value={booking.notes} /> : null}
            {booking.rejectionReason ? (
              <Field label={t('fm.bookings.rejectReason')} value={booking.rejectionReason} />
            ) : null}
            {decidedAt ? (
              // `approvedBy` is a bare user UUID (no name on the DTO), so only the
              // date is shown — in its own LTR span rather than inside the sentence.
              <View style={styles.decided}>
                <Text style={[styles.decidedText, rtlText]}>{t('fm.bookings.decidedOn')}</Text>
                <Text style={[styles.decidedText, styles.ltr]}>{decidedAt}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create((theme) => ({
  body: { gap: theme.spacing[12] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  title: {
    flex: 1,
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  field: { gap: 2 },
  fieldLabel: { fontSize: theme.type.label.md.size, color: theme.colors.textMuted },
  fieldValue: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textPrimary,
  },
  ltr: { writingDirection: 'ltr' },
  decided: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[4] },
  decidedText: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  footerRow: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
}));
