import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useLocaleStore } from '@/shared/stores/localeStore';
import { HapticPressable, Icons, useIsRtl } from '@/shared/ui';
import { dayKey } from '../lib/booking-dates';
import { formatDayHeader, formatWeekday } from '../lib/format-booking-time';

export interface WeekStripProps {
  /** The 7 local days, already in locale order. The row mirrors itself under RTL. */
  days: Date[];
  counts: Map<string, number>;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function WeekStrip({ days, counts, selectedKey, onSelect, onPrev, onNext }: WeekStripProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const locale = useLocaleStore((s) => s.locale);
  const isRtl = useIsRtl();
  const Prev = isRtl ? Icons.CaretRight : Icons.CaretLeft;
  const Next = isRtl ? Icons.CaretLeft : Icons.CaretRight;
  const todayKey = dayKey(new Date());

  return (
    <View style={styles.row}>
      <HapticPressable
        onPress={onPrev}
        accessibilityRole="button"
        accessibilityLabel={t('fm.bookings.prevWeek')}
        style={styles.nav}
      >
        <Prev size={20} color={theme.colors.textPrimary} weight="regular" />
      </HapticPressable>
      <View style={styles.days}>
        {days.map((day) => {
          const key = dayKey(day);
          const count = counts.get(key) ?? 0;
          const selected = key === selectedKey;
          return (
            <HapticPressable
              key={key}
              onPress={() => onSelect(selected ? null : key)}
              accessibilityRole="button"
              accessibilityLabel={t('fm.bookings.dayA11y', {
                day: formatDayHeader(day, locale),
                count,
              })}
              accessibilityState={{ selected }}
              style={[styles.day, selected && styles.daySelected]}
            >
              <Text style={[styles.weekday, selected && styles.textSelected]} numberOfLines={1}>
                {formatWeekday(day, locale)}
              </Text>
              <Text
                style={[
                  styles.date,
                  key === todayKey && styles.today,
                  selected && styles.textSelected,
                ]}
              >
                {day.getDate()}
              </Text>
              {count > 0 ? (
                <Text style={[styles.count, selected && styles.textSelected]}>{count}</Text>
              ) : (
                <View style={styles.countSpacer} />
              )}
            </HapticPressable>
          );
        })}
      </View>
      <HapticPressable
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={t('fm.bookings.nextWeek')}
        style={styles.nav}
      >
        <Next size={20} color={theme.colors.textPrimary} weight="regular" />
      </HapticPressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[8],
  },
  nav: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  days: { flex: 1, flexDirection: 'row', gap: theme.spacing[4] },
  day: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderHairline,
  },
  daySelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  weekday: { fontSize: theme.type.label.md.size, color: theme.colors.textSecondary },
  date: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  today: { color: theme.colors.primary, textDecorationLine: 'underline' },
  count: {
    fontSize: theme.type.label.md.size,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  countSpacer: { height: theme.type.label.md.lineHeight },
  textSelected: { color: theme.colors.textOnPrimary },
}));
