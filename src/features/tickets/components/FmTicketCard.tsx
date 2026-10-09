import { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { formatRelativeTime } from '@/shared/lib/format-relative-time';
import { HapticPressable } from '@/shared/ui';
import { categoryLabel, langOf, priorityLabel, statusLabel } from '../lib/labels';
import type { FmTicket } from '../types';
import { PriorityBadge, usePriorityColor } from './PriorityBadge';
import { SlaChip } from './SlaChip';
import { StatusBadge } from './StatusBadge';
import { computeSlaView, formatCountdown } from '../lib/sla';
import { ltr } from '../lib/ltr';

export interface FmTicketCardProps {
  ticket: FmTicket;
  fetchedAt: number;
  onPress: (ticket: FmTicket) => void;
}

function FmTicketCardImpl({ ticket, fetchedAt, onPress }: FmTicketCardProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const lang = langOf(i18n.language);
  const priorityColor = usePriorityColor();
  // The a11y label is computed at render, NOT from the per-second tick: only
  // the SlaChip re-renders every second, never the whole card.
  const createdMs = Date.parse(ticket.createdAt);
  const sla = computeSlaView(
    ticket.sla,
    Date.now(),
    fetchedAt,
    Number.isFinite(createdMs) ? createdMs : null,
  );
  const slaText =
    sla.tone === 'breached'
      ? t('fm.tickets.sla.breached')
      : sla.remainingSeconds === null
        ? ''
        : t('fm.tickets.sla.a11y', { time: formatCountdown(sla.remainingSeconds) });
  const place = [ticket.buildingName, ticket.unitNumber].filter(Boolean).join(' · ');

  return (
    <HapticPressable
      onPress={() => onPress(ticket)}
      accessibilityRole="button"
      accessibilityLabel={t('fm.tickets.a11y.card', {
        number: ticket.tktNumber,
        status: statusLabel(t, ticket, lang),
        priority: ticket.priorityCode ? priorityLabel(t, ticket.priorityCode) : '',
        sla: slaText,
      })}
      style={styles.card}
      testID={`fm-ticket-card-${ticket.tktNumber}`}
    >
      <View style={[styles.accentBar, { backgroundColor: priorityColor(ticket.priorityCode) }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.number} numberOfLines={1}>
            {ltr(`#${ticket.tktNumber}`)}
          </Text>
          <Text style={styles.time}>{formatRelativeTime(ticket.createdAt, t)}</Text>
        </View>
        {ticket.residentFullName ? (
          <Text style={styles.resident} numberOfLines={1}>
            {ticket.residentFullName}
          </Text>
        ) : null}
        <Text style={styles.meta} numberOfLines={1}>
          {categoryLabel(ticket, lang)}
        </Text>
        {place ? (
          <Text style={styles.meta} numberOfLines={1}>
            {place}
          </Text>
        ) : null}
        <View style={styles.badges}>
          <StatusBadge ticket={ticket} />
          <PriorityBadge code={ticket.priorityCode} />
          <SlaChip sla={ticket.sla} fetchedAt={fetchedAt} createdAt={ticket.createdAt} />
        </View>
      </View>
    </HapticPressable>
  );
}

export const FmTicketCard = memo(FmTicketCardImpl);

const styles = StyleSheet.create((theme) => ({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderHairline,
    overflow: 'hidden',
  },
  accentBar: { width: 4 },
  body: {
    flex: 1,
    padding: theme.spacing[16],
    gap: theme.spacing[6],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
  },
  // Ticket numbers are codes: always LTR.
  number: {
    flex: 1,
    fontSize: theme.type.body.lg.size,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  time: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textMuted,
  },
  resident: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  meta: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing[6],
    marginTop: theme.spacing[4],
  },
}));
