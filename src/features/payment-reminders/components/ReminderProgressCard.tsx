import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ResidentStat } from '@/features/residents';
import { Badge, Button, Card, Icons, useRtlTextStyle } from '@/shared/ui';
import type { PaymentReminderSend } from '../api/mappers';
import { isTerminalStatus } from '../lib/payment-reminders-logic';

export interface ReminderProgressCardProps {
  status: PaymentReminderSend | undefined;
  /** Server-resolved audience size (status first, then the 202 body). */
  targetedCount: number | undefined;
  pollStopped: boolean;
  /** Stopped because the send is still QUEUED after 3 minutes, not because polls failed. */
  stalled: boolean;
  onCheckAgain: () => void;
  onNewReminder: () => void;
}

export function ReminderProgressCard({
  status,
  targetedCount,
  pollStopped,
  stalled,
  onCheckAgain,
  onNewReminder,
}: ReminderProgressCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const complete = isTerminalStatus(status?.status);

  if (complete && status) {
    const withErrors = status.status === 'COMPLETED_WITH_ERRORS';
    return (
      <Card style={styles.card} accessibilityLiveRegion="polite">
        <View style={styles.headerRow}>
          <Text style={[styles.title, rtlText]} accessibilityRole="header">
            {t('fm.paymentReminders.resultTitle')}
          </Text>
          <Badge
            size="sm"
            tone={withErrors ? 'goldMuted' : 'primarySubtle'}
            label={t(
              withErrors
                ? 'fm.paymentReminders.statusCompletedWithErrors'
                : 'fm.paymentReminders.statusCompleted',
            )}
            icon={
              withErrors ? (
                <Icons.Warning size={12} color={theme.colors.warning} weight="bold" />
              ) : (
                <Icons.CheckCircle size={12} color={theme.colors.success} weight="bold" />
              )
            }
          />
        </View>
        <View style={styles.stats}>
          <ResidentStat
            icon={<Icons.CheckCircle size={20} color={theme.colors.success} weight="regular" />}
            value={status.sentCount ?? 0}
            label={t('fm.paymentReminders.sentCount')}
          />
          <ResidentStat
            icon={<Icons.Users size={20} color={theme.colors.textSecondary} weight="regular" />}
            value={status.noDeviceCount ?? 0}
            label={t('fm.paymentReminders.noDeviceCount')}
          />
          <ResidentStat
            icon={<Icons.XCircle size={20} color={theme.colors.error} weight="regular" />}
            value={status.failedCount ?? 0}
            label={t('fm.paymentReminders.failedCount')}
          />
        </View>
        <Text style={[styles.hint, rtlText]}>{t('fm.paymentReminders.noDeviceHint')}</Text>
        <Button
          label={t('fm.paymentReminders.newReminder')}
          variant="secondary"
          fullWidth
          onPress={onNewReminder}
        />
      </Card>
    );
  }

  if (pollStopped) {
    return (
      <Card style={styles.card}>
        <View style={styles.alert} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <Icons.Warning size={20} color={theme.colors.error} weight="bold" />
          <View style={styles.alertBody}>
            <Text style={[styles.alertTitle, rtlText]}>
              {t(
                stalled ? 'fm.paymentReminders.stalledTitle' : 'fm.paymentReminders.pollErrorTitle',
              )}
            </Text>
            <Text style={[styles.hint, rtlText]}>
              {t(
                stalled
                  ? 'fm.paymentReminders.stalledMessage'
                  : 'fm.paymentReminders.pollErrorMessage',
              )}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label={t('fm.paymentReminders.checkAgain')}
              variant="secondary"
              fullWidth
              onPress={onCheckAgain}
            />
          </View>
          <View style={styles.action}>
            <Button
              label={t('fm.paymentReminders.newReminder')}
              variant="ghost"
              fullWidth
              onPress={onNewReminder}
            />
          </View>
        </View>
      </Card>
    );
  }

  // Web parity: before the first poll lands the badge reads "Sending".
  return (
    <Card style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.headerRow}>
        <Text style={[styles.title, rtlText]} accessibilityRole="header">
          {t('fm.paymentReminders.progressTitle')}
        </Text>
        <Badge
          size="sm"
          tone="primaryMuted"
          label={t(
            status?.status === 'QUEUED'
              ? 'fm.paymentReminders.statusQueued'
              : 'fm.paymentReminders.statusProcessing',
          )}
        />
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
      {targetedCount === undefined ? null : (
        <Text style={[styles.body, rtlText]}>
          {t('fm.paymentReminders.sendingTo', { count: targetedCount })}
        </Text>
      )}
      <Text style={[styles.hint, rtlText]}>{t('fm.paymentReminders.progressHint')}</Text>
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: { gap: theme.spacing[12] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  title: {
    flex: 1,
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  body: { fontSize: theme.type.body.md.size, color: theme.colors.textPrimary },
  hint: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  stats: { flexDirection: 'row', gap: theme.spacing[8] },
  alert: {
    flexDirection: 'row',
    gap: theme.spacing[12],
    padding: theme.spacing[12],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.terracottaSubtle,
  },
  alertBody: { flex: 1, gap: theme.spacing[4] },
  alertTitle: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  actions: { flexDirection: 'row', gap: theme.spacing[12] },
  action: { flex: 1 },
}));
