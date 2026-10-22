import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useLocaleStore } from '@/shared/stores/localeStore';
import { HapticPressable, Icons, useIsRtl } from '@/shared/ui';
import { dayKey } from '../lib/booking-dates';
import { dayA11yLabel, formatDayCount, formatWeekRange, weekdayShortKey } from '../lib/week-strip';

/** Caps Dynamic Type inside the fixed-width cells so seven still fit a row. */
const MAX_FONT_SCALE = 1.2;

export interface WeekStripProps {
  /** The 7 local days, already in locale order. The row mirrors itself under RTL. */
  days: Date[];
  counts: Map<string, number>;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  onPrev: () => void;
  onNext: () => void;
  /** The week is loading: cells are disabled and show no counts. */
  loading?: boolean;
}

export function WeekStrip({
  days,
  counts,
  selectedKey,
  onSelect,
  onPrev,
  onNext,
  loading = false,
}: WeekStripProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const locale = useLocaleStore((s) => s.locale);
  const isRtl = useIsRtl();
  const Prev = isRtl ? Icons.CaretRight : Icons.CaretLeft;
  const Next = isRtl ? Icons.CaretLeft : Icons.CaretRight;
  const todayKey = dayKey(new Date());

  return (
    <View style={styles.strip}>
      <View style={styles.header}>
        <HapticPressable
          onPress={onPrev}
          accessibilityRole="button"
          accessibilityLabel={t('fm.bookings.prevWeek')}
          style={styles.nav}
        >
          <Prev size={20} color={theme.colors.textPrimary} weight="regular" />
        </HapticPressable>
        <Text
          style={styles.range}
          numberOfLines={1}
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SCALE}
        >
          {formatWeekRange(days, locale, t)}
        </Text>
        <HapticPressable
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel={t('fm.bookings.nextWeek')}
          style={styles.nav}
        >
          <Next size={20} color={theme.colors.textPrimary} weight="regular" />
        </HapticPressable>
      </View>

      {/* Not reversed: the row mirrors itself under RTL. */}
      <View style={styles.days}>
        {days.map((day) => {
          const key = dayKey(day);
          const count = loading ? 0 : (counts.get(key) ?? 0);
          const selected = key === selectedKey;
          const isToday = key === todayKey;
          // dayKey is zero-padded YYYY-MM-DD, so string order is date order.
          const isPast = key < todayKey;
          return (
            <HapticPressable
              key={key}
              onPress={() => onSelect(selected ? null : key)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={dayA11yLabel(day, locale, { count, isToday, loading }, t)}
              accessibilityState={{ selected, disabled: loading }}
              style={[
                styles.day,
                isToday && styles.dayToday,
                selected && styles.daySelected,
                loading && styles.dayDisabled,
              ]}
            >
              <Text
                style={[styles.weekday, isPast && styles.textPast, selected && styles.textSelected]}
                numberOfLines={1}
                ellipsizeMode="clip"
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {t(weekdayShortKey(day))}
              </Text>
              <Text
                style={[
                  styles.date,
                  isPast && styles.textPast,
                  isToday && styles.dateToday,
                  selected && styles.textSelected,
                ]}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {day.getDate()}
              </Text>
              <View style={styles.indicator}>
                {count > 0 ? (
                  <View style={[styles.pill, selected && styles.pillSelected]}>
                    <Text style={styles.pillText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                      {formatDayCount(count)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </HapticPressable>
          );
        })}
      </View>
    </View>
  );
}

const PILL_SIZE = 18;

const styles = StyleSheet.create((theme) => ({
  strip: { gap: theme.spacing[4] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  range: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  days: { flexDirection: 'row', gap: theme.spacing[4] },
  day: {
    flex: 1,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[8],
    gap: theme.spacing[4],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderHairline,
  },
  dayToday: { borderWidth: 1.5, borderColor: theme.colors.primary },
  // After dayToday: selected wins.
  daySelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayDisabled: { opacity: 0.5 },
  weekday: { fontSize: theme.type.label.md.size, color: theme.colors.textSecondary },
  date: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  dateToday: { color: theme.colors.primary, fontWeight: '700' },
  textPast: { color: theme.colors.textMuted },
  textSelected: { color: theme.colors.textOnPrimary },
  // Fixed height whether or not a pill shows, so every cell lines up.
  indicator: { height: PILL_SIZE, alignItems: 'center', justifyContent: 'center' },
  pill: {
    minWidth: PILL_SIZE,
    height: PILL_SIZE,
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: { backgroundColor: theme.colors.textOnPrimary },
  pillText: {
    fontSize: theme.type.label.md.size,
    fontWeight: '600',
    color: theme.colors.primary,
  },
}));
