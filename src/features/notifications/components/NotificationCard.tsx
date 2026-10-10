import { memo, useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { HapticPressable, Icons, RTL_INLINE, useIsRtl } from '@/shared/ui';
import { formatRelativeTime } from '@/shared/lib/format-relative-time';
import type { AppNotification } from '@/types/notification';
import {
  notificationBody,
  notificationDestination,
  notificationIconName,
  notificationTitle,
  isUrgentNotification,
} from '../lib/notification-meta';

export interface NotificationCardProps {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
}

/**
 * Ported from dyarna-rn. FM spec: type glyph (error colour for escalations and
 * SLA warnings), and unread shown three ways (a dot, a bold title, a tinted
 * background) so colour is never the only signal.
 */
function NotificationCardImpl({ notification, onPress }: NotificationCardProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const rtlInline = isRtl ? RTL_INLINE : null;

  const unread = !notification.isRead;
  const title = useMemo(() => notificationTitle(notification, t), [notification, t]);
  const body = useMemo(() => notificationBody(notification, t), [notification, t]);
  const when = useMemo(
    () => formatRelativeTime(notification.createdAt, t),
    [notification.createdAt, t],
  );
  const destination = useMemo(() => notificationDestination(notification), [notification]);

  const Glyph = Icons[notificationIconName(notification.type)];
  const glyphColor = isUrgentNotification(notification.type)
    ? theme.colors.error
    : unread
      ? theme.colors.primary
      : theme.colors.textMuted;
  const handlePress = useCallback(() => onPress(notification), [onPress, notification]);

  // Read state is spoken, not just shown.
  const accessibilityLabel = [
    title,
    body,
    when,
    t(unread ? 'notifications.a11y.unread' : 'notifications.a11y.read'),
  ]
    .filter((part) => part.length > 0)
    .join(', ');

  const hint =
    destination === null
      ? undefined
      : destination.href.startsWith('/requests')
        ? t('notifications.a11y.opensRequests')
        : t('notifications.a11y.opensTicket');

  return (
    <HapticPressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...(hint === undefined ? {} : { accessibilityHint: hint })}
      scaleOnPress={1}
    >
      <View style={[styles.card, unread ? styles.cardUnread : null]}>
        <View style={styles.iconBox}>
          <Glyph size={20} color={glyphColor} weight="regular" />
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text
              style={[styles.title, unread ? styles.titleUnread : null, rtlInline]}
              numberOfLines={2}
            >
              {title}
            </Text>
            {unread ? <View style={styles.dot} testID="notification-unread-dot" /> : null}
          </View>
          {body.length > 0 ? (
            <Text style={[styles.bodyText, rtlInline]} numberOfLines={2}>
              {body}
            </Text>
          ) : null}
          {when.length > 0 ? (
            <Text style={[styles.time, rtlInline]} numberOfLines={1}>
              {when}
            </Text>
          ) : null}
        </View>
      </View>
    </HapticPressable>
  );
}

export const NotificationCard = memo(NotificationCardImpl);

const styles = StyleSheet.create((theme) => ({
  card: {
    flexDirection: 'row',
    gap: theme.spacing[12],
    minHeight: 44,
    padding: theme.spacing[16],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderHairline,
  },
  cardUnread: {
    backgroundColor: theme.colors.primaryFaint,
    borderColor: theme.colors.primarySubtle,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: theme.spacing[4],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
  },
  title: {
    flex: 1,
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  titleUnread: {
    fontWeight: '700',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  bodyText: {
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
