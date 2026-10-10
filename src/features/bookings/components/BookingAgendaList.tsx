import { memo, useMemo } from 'react';
import { ActivityIndicator, SectionList, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useLocaleStore } from '@/shared/stores/localeStore';
import { HapticPressable, Skeleton, useRtlTextStyle } from '@/shared/ui';
import type { Booking } from '../api/bookings-api';
import { groupAgenda } from '../lib/agenda';
import { durationMinutes } from '../lib/booking-dates';
import { formatDayHeader, formatTimeRange } from '../lib/format-booking-time';
import { BookingStatusBadge } from './BookingStatusBadge';

interface RowProps {
  booking: Booking;
  busy: boolean;
  onPress: (booking: Booking) => void;
}

/** Adapted from dyarna-rn `BookingRequestRow`: facility + resident + exact duration for FM. */
const BookingAgendaRow = memo(function BookingAgendaRow({ booking, busy, onPress }: RowProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const locale = useLocaleStore((s) => s.locale);
  const rtlText = useRtlTextStyle();
  const range = formatTimeRange(booking.startTime, booking.endTime, locale);
  const minutes = durationMinutes(booking.startTime, booking.endTime);

  return (
    <HapticPressable
      onPress={() => onPress(booking)}
      accessibilityRole="button"
      accessibilityLabel={t('fm.bookings.rowA11y', {
        facility: booking.facilityName,
        resident: booking.residentName ?? t('fm.bookings.unknownResident'),
        time: range,
      })}
      accessibilityState={{ busy }}
      scaleOnPress={1}
    >
      <View style={styles.row}>
        <View style={styles.topRow}>
          <Text style={styles.time}>{range || t('fm.bookings.timeUnknown')}</Text>
          {busy ? (
            <ActivityIndicator size="small" color={theme.colors.textMuted} />
          ) : (
            <BookingStatusBadge status={booking.status} />
          )}
        </View>
        <Text style={[styles.facility, rtlText]} numberOfLines={1}>
          {booking.facilityName}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, rtlText]} numberOfLines={1}>
            {booking.residentName ?? t('fm.bookings.unknownResident')}
          </Text>
          {minutes === undefined ? null : (
            <Text style={styles.metaLtr}>{t('fm.bookings.minutes', { count: minutes })}</Text>
          )}
        </View>
      </View>
    </HapticPressable>
  );
});

export interface BookingAgendaListProps {
  bookings: Booking[];
  busyId: string | undefined;
  onPress: (booking: Booking) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
  empty: React.ReactElement;
  header?: React.ReactElement;
}

export function BookingAgendaList({
  bookings,
  busyId,
  onPress,
  refreshing,
  onRefresh,
  onEndReached,
  isFetchingNextPage,
  empty,
  header,
}: BookingAgendaListProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const rtlText = useRtlTextStyle();
  const sections = useMemo(() => groupAgenda(bookings), [bookings]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(b) => b.id}
      renderItem={({ item }) => (
        <BookingAgendaRow booking={item} busy={busyId === item.id} onPress={onPress} />
      )}
      renderSectionHeader={({ section }) => (
        <Text style={[styles.dayHeader, rtlText]} accessibilityRole="header">
          {section.date ? formatDayHeader(section.date, locale) : t('fm.bookings.timeUnknown')}
        </Text>
      )}
      stickySectionHeadersEnabled={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      {...(onEndReached ? { onEndReached, onEndReachedThreshold: 0.4 } : {})}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={empty}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null}
      contentContainerStyle={styles.content}
    />
  );
}

export function BookingRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton height={16} width="45%" />
      <Skeleton height={14} width="70%" />
      <Skeleton height={12} width="35%" />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  // Clears the absolutely positioned tab bar.
  content: { padding: theme.spacing[16], paddingBottom: theme.spacing[96], gap: theme.spacing[8] },
  dayHeader: {
    fontSize: theme.type.label.lg.size,
    lineHeight: theme.type.label.lg.lineHeight,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[8],
  },
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderHairline,
    padding: theme.spacing[12],
    gap: theme.spacing[6],
    minHeight: 56,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[8],
  },
  // Times read left-to-right in both locales.
  time: {
    writingDirection: 'ltr',
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  facility: { fontSize: theme.type.body.md.size, color: theme.colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  meta: { flex: 1, fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  metaLtr: {
    writingDirection: 'ltr',
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textMuted,
  },
  footer: { marginVertical: theme.spacing[16] },
}));
