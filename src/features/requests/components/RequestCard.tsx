import { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { formatRelativeTime } from '@/shared/lib/format-relative-time';
import { safeToLocaleDateString } from '@/shared/lib/safe-intl';
import { Avatar, Badge, Button, Card, Icons, RTL_INLINE, useIsRtl } from '@/shared/ui';
import type { ResidentRequest } from '../api/mappers';

export interface RequestCardProps {
  request: ResidentRequest;
  onApprove: (request: ResidentRequest) => void;
  onReject: (request: ResidentRequest) => void;
}

function StatusBadge({ status }: { status: ResidentRequest['status'] }): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  if (status === 'PENDING') {
    return (
      <Badge
        size="sm"
        tone="gold"
        label={t('fm.requests.statusPending')}
        icon={<Icons.Clock size={12} color={theme.colors.gold} weight="bold" />}
      />
    );
  }
  if (status === 'APPROVED') {
    return (
      <Badge
        size="sm"
        tone="primarySubtle"
        label={t('fm.requests.statusApproved')}
        icon={<Icons.CheckCircle size={12} color={theme.colors.primary} weight="bold" />}
      />
    );
  }
  if (status === 'REJECTED') {
    return (
      <Badge
        size="sm"
        tone="neutral"
        label={t('fm.requests.statusRejected')}
        icon={<Icons.XCircle size={12} color={theme.colors.error} weight="bold" />}
      />
    );
  }
  return <Badge size="sm" tone="neutral" label="-" />;
}

interface InfoRowProps {
  label: string;
  value: string;
  /** Phone numbers, emails, codes and unit numbers always read LTR. */
  ltr?: boolean;
}

function InfoRow({ label, value, ltr = false }: InfoRowProps): React.JSX.Element {
  const isRtl = useIsRtl();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, isRtl ? RTL_INLINE : null]}>{label}</Text>
      <Text
        style={[styles.infoValue, ltr ? styles.ltrValue : isRtl ? RTL_INLINE : null]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export const RequestCard = memo(function RequestCard({
  request,
  onApprove,
  onReject,
}: RequestCardProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const created = request.createdAt
    ? `${formatRelativeTime(request.createdAt, t)} · ${safeToLocaleDateString(
        new Date(request.createdAt),
        i18n.language,
        { day: 'numeric', month: 'short' },
      )}`
    : '-';
  const building = request.buildingName
    ? `${request.buildingName}${request.buildingCode ? ` (${request.buildingCode})` : ''}`
    : (request.buildingCode ?? '-');

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Avatar name={request.fullName} size={40} />
        <View style={styles.headerText}>
          <Text style={[styles.name, isRtl ? RTL_INLINE : null]} numberOfLines={1}>
            {request.fullName || '-'}
          </Text>
          <Text style={[styles.id, styles.ltrValue]}>#{request.requestId}</Text>
        </View>
        <StatusBadge status={request.status} />
      </View>

      <View style={styles.info}>
        <InfoRow label={t('fm.requests.mobile')} value={request.mobile ?? '-'} ltr />
        <InfoRow label={t('fm.requests.email')} value={request.email ?? '-'} ltr />
        <InfoRow label={t('fm.requests.building')} value={building} />
        <InfoRow label={t('fm.requests.project')} value={request.projectName ?? '-'} />
        <InfoRow label={t('fm.requests.unit')} value={request.unitNumber ?? '-'} ltr />
        <InfoRow label={t('fm.requests.date')} value={created} />
      </View>

      {request.status === 'PENDING' ? (
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label={t('fm.requests.approve')}
              fullWidth
              onPress={() => onApprove(request)}
              leadingIcon={
                <Icons.Check size={16} color={theme.colors.textOnPrimary} weight="bold" />
              }
            />
          </View>
          <View style={styles.action}>
            <Button
              label={t('fm.requests.reject')}
              variant="secondary"
              fullWidth
              onPress={() => onReject(request)}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: { gap: theme.spacing[12] },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12] },
  headerText: { flex: 1, gap: theme.spacing[2] },
  name: {
    fontSize: theme.type.body.lg.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  id: { fontSize: theme.type.label.md.size, color: theme.colors.textMuted },
  info: { gap: theme.spacing[6] },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12] },
  infoLabel: {
    width: 96,
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textMuted,
  },
  infoValue: {
    flex: 1,
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textPrimary,
  },
  // Forced LTR, aligned to the start edge of the row in both directions.
  ltrValue: { writingDirection: 'ltr', textAlign: 'auto' },
  actions: { flexDirection: 'row', gap: theme.spacing[12] },
  action: { flex: 1, minHeight: 44 },
}));
