import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useLocaleStore } from '@/shared/stores/localeStore';
import {
  BottomSheet,
  Button,
  DatePickerModal,
  HapticPressable,
  Icons,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import { formatDate } from '../lib/format-booking-time';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface BookingFilterSheetProps {
  value: DateRange;
  onChange: (next: DateRange) => void;
}

/** from/to dates for the agenda. `from` is inclusive, `to` exclusive — same as the web. */
export const BookingFilterSheet = forwardRef<BottomSheetRef, BookingFilterSheetProps>(
  function BookingFilterSheet({ value, onChange }, ref) {
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const locale = useLocaleStore((s) => s.locale);
    const rtlText = useRtlTextStyle();
    const [picking, setPicking] = useState<'from' | 'to' | null>(null);

    const row = (which: 'from' | 'to', label: string) => {
      const date = value[which];
      return (
        <View style={styles.row}>
          <HapticPressable
            onPress={() => setPicking(which)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${date ? formatDate(date, locale) : t('fm.bookings.anyDate')}`}
            style={styles.dateButton}
          >
            <Icons.CalendarBlank size={18} color={theme.colors.textSecondary} weight="regular" />
            <Text style={[styles.label, rtlText]}>{label}</Text>
            <Text style={[styles.value, date ? styles.ltr : null]}>
              {date ? formatDate(date, locale) : t('fm.bookings.anyDate')}
            </Text>
          </HapticPressable>
          {date ? (
            <HapticPressable
              onPress={() => onChange({ ...value, [which]: null })}
              accessibilityRole="button"
              accessibilityLabel={t('fm.bookings.clearDate', { label })}
              hitSlop={8}
              style={styles.clear}
            >
              <Icons.X size={18} color={theme.colors.textMuted} weight="bold" />
            </HapticPressable>
          ) : null}
        </View>
      );
    };

    const current = picking ? (value[picking] ?? new Date()) : new Date();

    return (
      <BottomSheet
        ref={ref}
        snapPoints={['45%']}
        footer={
          <Button
            label={t('common.clear')}
            variant="secondary"
            fullWidth
            disabled={!value.from && !value.to}
            onPress={() => onChange({ from: null, to: null })}
          />
        }
      >
        <View style={styles.body}>
          <Text style={[styles.title, rtlText]} accessibilityRole="header">
            {t('fm.bookings.dateRange')}
          </Text>
          {row('from', t('fm.bookings.fromDate'))}
          {row('to', t('fm.bookings.toDate'))}
        </View>
        <DatePickerModal
          visible={picking !== null}
          value={current}
          mode="date"
          {...(picking === 'to' && value.from ? { minimumDate: value.from } : {})}
          doneLabel={t('common.done')}
          onClose={() => setPicking(null)}
          onChange={(date, type) => {
            if (type === 'dismissed' || !picking) return;
            const next = { ...value, [picking]: date };
            // A `to` before the new `from` would be an empty window; drop it.
            if (picking === 'from' && next.to && next.to < date) next.to = null;
            onChange(next);
          }}
        />
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create((theme) => ({
  body: { gap: theme.spacing[12] },
  title: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
    minHeight: 48,
    paddingHorizontal: theme.spacing[12],
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  label: { fontSize: theme.type.label.lg.size, color: theme.colors.textSecondary },
  value: {
    marginStart: 'auto',
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
  },
  ltr: { writingDirection: 'ltr' },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
}));
