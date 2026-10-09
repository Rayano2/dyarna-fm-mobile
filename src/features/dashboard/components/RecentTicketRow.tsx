import { View, Text, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { Badge, HapticPressable, RTL_INLINE, useIsRtl } from '@/shared/ui';
import { formatRelativeTime } from '@/shared/lib/format-relative-time';
import { fmTicketDestination } from '@/shared/lib/fm-routes';
import { goTo } from '@/shared/lib/go-to';
import type { DashboardTicket } from '../api/dashboard-api';
import { priorityBadge, priorityLabel, statusBadge, statusLabel } from '../lib/badge-tone';

export interface RecentTicketRowProps {
  ticket: DashboardTicket;
}

/** A ticket number is an identifier, not prose: LTR in both locales. */
const LTR_TEXT: TextStyle = { writingDirection: 'ltr' };

export function RecentTicketRow({ ticket }: RecentTicketRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const isRtl = useIsRtl();
  const rtlInline = isRtl ? RTL_INLINE : null;

  const status = statusBadge(ticket.statusCode);
  const priority = priorityBadge(ticket.priorityCode);
  const statusText = statusLabel(ticket.statusCode, ticket, t, isRtl);
  const priorityText = priorityLabel(ticket.priorityCode, t);
  const number = ticket.tktNumber ? `#${ticket.tktNumber}` : `#${ticket.ticketId}`;
  const when = formatRelativeTime(ticket.createdAt, t);

  return (
    <HapticPressable
      onPress={() => goTo(fmTicketDestination(ticket.ticketId))}
      accessibilityRole="button"
      accessibilityLabel={t('fm.dashboard.recent.rowA11y', {
        number,
        title: ticket.title,
        status: statusText,
      })}
      scaleOnPress={1}
      style={styles.row}
    >
      <View style={styles.metaRow}>
        <Badge label={number} tone="neutral" size="xs" textStyle={LTR_TEXT} />
        {ticket.buildingName ? (
          <Text style={[styles.building, rtlInline]} numberOfLines={1}>
            {ticket.buildingName}
          </Text>
        ) : (
          <View style={styles.spacer} />
        )}
        {statusText ? <Badge label={statusText} tone={status.tone} size="xs" /> : null}
        {priorityText ? <Badge label={priorityText} tone={priority.tone} size="xs" /> : null}
      </View>
      {ticket.title ? (
        <Text style={[styles.title, rtlInline]} numberOfLines={1}>
          {ticket.title}
        </Text>
      ) : null}
      {ticket.description ? (
        <Text style={[styles.description, rtlInline]} numberOfLines={2}>
          {ticket.description}
        </Text>
      ) : null}
      {when ? <Text style={[styles.time, rtlInline]}>{when}</Text> : null}
    </HapticPressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    minHeight: 44,
    paddingVertical: theme.spacing[12],
    gap: theme.spacing[4],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[6],
  },
  building: {
    flex: 1,
    fontSize: theme.type.label.md.size,
    lineHeight: theme.type.label.md.lineHeight,
    color: theme.colors.textMuted,
  },
  spacer: { flex: 1 },
  title: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  description: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textSecondary,
  },
  time: {
    fontSize: theme.type.label.md.size,
    lineHeight: theme.type.label.md.lineHeight,
    color: theme.colors.textMuted,
  },
}));
