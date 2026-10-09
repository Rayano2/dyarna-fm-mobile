import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { HapticPressable, Icons, useIsRtl } from '@/shared/ui';
import { useUnreadNotificationCount } from '@/features/notifications';
import { formatBellBadge } from '../lib/bell-badge';

export interface ShellHeaderProps {
  title: string;
  /** Optional one-line subtitle rendered under the title (e.g. "Updated 2m ago"). */
  subtitle?: string | undefined;
  showBell?: boolean;
  /** Render a back button in the start slot. Takes precedence over leftContent. */
  showBack?: boolean;
  /**
   * Override for the bell badge count. When omitted the header fetches the
   * unread count itself (hidden while loading or on error).
   */
  bellBadge?: number;
  /** Optional content rendered in the header's start slot (e.g. a language chip). */
  leftContent?: React.ReactNode;
}

/**
 * Copied from dyarna-rn `src/features/shell/components/ShellHeader.tsx`.
 * FM changes: no search slot (unused in FM), title on the start side, 44px icon buttons, localized a11y
 * labels, back caret flipped in RTL, and `bellBadge` overrides the
 * self-fetched unread count.
 */
export function ShellHeader({
  title,
  subtitle,
  showBell = true,
  showBack = false,
  bellBadge,
  leftContent,
}: ShellHeaderProps) {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRtl = useIsRtl();
  const BackCaret = isRtl ? Icons.CaretRight : Icons.CaretLeft;
  const unreadQuery = useUnreadNotificationCount(showBell && bellBadge === undefined);
  // Loading and error both hide the badge: a stale or guessed count is worse than none.
  const fetchedCount = unreadQuery.isError ? undefined : unreadQuery.data;
  const bellCount = bellBadge ?? fetchedCount ?? 0;
  const bellText = formatBellBadge(bellCount);
  const startContent = showBack ? (
    <HapticPressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      style={styles.iconButton}
    >
      <BackCaret size={22} color={theme.colors.textPrimary} weight="regular" />
    </HapticPressable>
  ) : (
    leftContent
  );

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {startContent ? <View style={styles.leftSlot}>{startContent}</View> : null}
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightSlot}>
          {showBell ? (
            <HapticPressable
              onPress={() => router.push('/notifications' as never)}
              accessibilityRole="button"
              accessibilityLabel={
                bellText === null
                  ? t('notifications.bellA11y')
                  : t('notifications.bellA11yUnread', { count: bellCount })
              }
              style={styles.iconButton}
              testID="shell-bell"
            >
              <Icons.Bell size={22} color={theme.colors.textPrimary} weight="regular" />
              {bellText === null ? null : (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{bellText}</Text>
                </View>
              )}
            </HapticPressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    backgroundColor: theme.colors.bg,
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[12],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
    minHeight: 44,
  },
  leftSlot: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  rightSlot: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing[4],
  },
  titleBlock: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    fontSize: theme.type.heading.xl.size,
    lineHeight: theme.type.heading.xl.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: 'InterTight-SemiBold',
  },
  subtitle: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textMuted,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    end: 6,
    backgroundColor: theme.colors.error,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: theme.colors.textOnPrimary,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
}));
