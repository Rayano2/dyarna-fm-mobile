import { useCallback, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Icons } from '@/shared/ui';
import { computeSlaView, formatCountdown, type SlaView } from '../lib/sla';
import { slaTicker } from '../lib/sla-ticker';
import { ltr } from '../lib/ltr';
import type { TicketSla } from '../types';

/** Current time from the ONE shared SLA interval. */
export function useSlaTick(): number {
  return useSyncExternalStore(slaTicker.subscribe, slaTicker.getNow, slaTicker.getNow);
}

/** Keeps the shared SLA interval running only while the calling screen is focused. */
export function useSlaTickerWhileFocused(): void {
  useFocusEffect(useCallback(() => slaTicker.activate(), []));
}

export interface SlaChipProps {
  sla: TicketSla | null;
  /** When the query answered, for the `remainingSeconds` fallback. */
  fetchedAt: number;
  /** Ticket creation, used as the phase start for the 25% warning. */
  createdAt: string;
}

export function useSlaView({ sla, fetchedAt, createdAt }: SlaChipProps): SlaView {
  const now = useSlaTick();
  const started = Date.parse(createdAt);
  return computeSlaView(sla, now, fetchedAt, Number.isFinite(started) ? started : null);
}

/**
 * Countdown of the active SLA phase. Breach is the backend's call (red, alert
 * icon, "Breached"); the countdown just clamps at 0. Not a live region: a
 * screen reader must not announce every second.
 */
export function SlaChip(props: SlaChipProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const view = useSlaView(props);
  if (view.tone === 'done') return null;

  if (view.tone === 'breached') {
    return (
      <View
        style={[styles.chip, styles.breached]}
        accessibilityLiveRegion="none"
        accessible
        accessibilityLabel={t('fm.tickets.sla.breached')}
      >
        <Icons.Warning size={12} color={theme.colors.textOnPrimary} weight="bold" />
        <Text style={styles.breachedText}>{t('fm.tickets.sla.breached')}</Text>
      </View>
    );
  }

  const warn = view.tone === 'warning';
  const color = warn ? theme.colors.warning : theme.colors.textSecondary;
  const countdown = ltr(formatCountdown(view.remainingSeconds ?? 0));
  return (
    <View
      style={[styles.chip, warn ? styles.warning : styles.normal]}
      accessibilityLiveRegion="none"
      accessible
      accessibilityLabel={t('fm.tickets.sla.a11y', { time: countdown })}
    >
      <Icons.Clock size={12} color={color} weight="bold" />
      <Text style={[styles.countdown, { color }]}>{countdown}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4],
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
  },
  normal: { backgroundColor: theme.colors.borderHairline },
  warning: { backgroundColor: theme.colors.goldSubtle },
  breached: { backgroundColor: theme.colors.error },
  breachedText: {
    fontSize: theme.type.label.md.size,
    fontWeight: '700',
    color: theme.colors.textOnPrimary,
  },
  // Digits are always LTR, whatever the UI direction.
  countdown: {
    fontSize: theme.type.label.md.size,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
}));
