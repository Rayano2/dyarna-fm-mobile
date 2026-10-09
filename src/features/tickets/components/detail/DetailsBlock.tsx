import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Icons, RiyalSymbol } from '@/shared/ui';
import { categoryLabel, langOf } from '../../lib/labels';
import type { FmTicketDetail } from '../../types';
import { formatAbsolute } from './format-absolute';

type IconName = keyof typeof Icons;

interface Row {
  icon: IconName;
  label: string;
  value: string;
  muted?: boolean;
  riyal?: boolean;
}

/**
 * Ported from dyarna-rn `TicketDetail/DetailsBlock.tsx` (flat icon + label
 * list). FM rows: category, service domain, building, unit, assignee (or
 * Unassigned), created, resolved, repair cost (read-only, with the Riyal sign).
 */
export function DetailsBlock({ ticket }: { ticket: FmTicketDetail }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const lang = langOf(i18n.language);

  const rows: Row[] = [
    { icon: 'Wrench', label: t('fm.tickets.category'), value: categoryLabel(ticket, lang) },
  ];
  if (ticket.serviceDomain) {
    rows.push({
      icon: 'SquaresFour',
      label: t('fm.tickets.serviceDomain'),
      value: t(`fm.tickets.domain.${ticket.serviceDomain}`, { defaultValue: ticket.serviceDomain }),
    });
  }
  if (ticket.buildingName) {
    rows.push({ icon: 'Buildings', label: t('fm.tickets.building'), value: ticket.buildingName });
  }
  if (ticket.unitNumber) {
    rows.push({ icon: 'Door', label: t('fm.tickets.unit'), value: ticket.unitNumber });
  }
  rows.push(
    ticket.assignedTo
      ? { icon: 'User', label: t('fm.tickets.assignedTo'), value: ticket.assignedTo }
      : {
          icon: 'User',
          label: t('fm.tickets.assignedTo'),
          value: t('fm.tickets.unassigned'),
          muted: true,
        },
  );
  const created = formatAbsolute(ticket.createdAt, lang);
  if (created)
    rows.push({ icon: 'CalendarBlank', label: t('fm.tickets.createdAt'), value: created });
  const resolved = formatAbsolute(ticket.resolvedAt ?? undefined, lang);
  if (resolved)
    rows.push({ icon: 'CheckCircle', label: t('fm.tickets.resolvedAt'), value: resolved });
  if (ticket.repairCost !== null) {
    rows.push({
      icon: 'Coins',
      label: t('fm.tickets.repairCost'),
      value: new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(ticket.repairCost),
      riyal: true,
    });
  }

  return (
    <View style={styles.block}>
      {rows.map((r) => {
        const RowIcon = Icons[r.icon] as React.ComponentType<{
          size: number;
          color: string;
          weight: 'regular';
        }>;
        return (
          <View
            key={r.label}
            style={styles.row}
            accessible
            accessibilityLabel={t('fm.tickets.a11y.detailRow', { label: r.label, value: r.value })}
          >
            <RowIcon size={16} color={theme.colors.textMuted} weight="regular" />
            <Text style={styles.label}>{r.label}</Text>
            <View style={styles.valueWrap}>
              <Text style={[styles.value, r.muted && styles.muted]} numberOfLines={2}>
                {r.value}
              </Text>
              {r.riyal ? <RiyalSymbol style={styles.value} /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  block: { gap: theme.spacing[12] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
  },
  label: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textMuted,
    width: 110,
  },
  valueWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4],
  },
  value: {
    flexShrink: 1,
    fontSize: theme.type.body.sm.size,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  muted: { color: theme.colors.textMuted },
}));
