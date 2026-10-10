import { memo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Badge, HapticPressable, Icons, Skeleton, useRtlTextStyle } from '@/shared/ui';
import { formatRelativeTime } from '@/shared/lib/format-relative-time';
import type { Announcement } from '../api/announcements-api';

export interface AnnouncementCardProps {
  announcement: Announcement;
  busy: boolean;
  onMenu: (announcement: Announcement) => void;
}

/** Trimmed-down dyarna-rn `PostCard`: no media, reactions or comments — an FM announcement row. */
function AnnouncementCardImpl({ announcement, busy, onMenu }: AnnouncementCardProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const when = formatRelativeTime(announcement.createdAt, t);
  const byline = [
    announcement.authorName ? t('fm.announcements.by', { name: announcement.authorName }) : '',
    when,
  ]
    .filter((s) => s.length > 0)
    .join(' · ');

  return (
    <View style={[styles.card, announcement.isPinned && styles.cardPinned]}>
      <View style={styles.topRow}>
        <View style={styles.head}>
          {announcement.isPinned ? (
            <Badge
              label={t('fm.announcements.pinned')}
              tone="gold"
              size="sm"
              icon={<Icons.PushPin size={12} color={theme.colors.gold} weight="fill" />}
            />
          ) : null}
          <Text style={[styles.title, rtlText]} numberOfLines={2}>
            {announcement.title}
          </Text>
        </View>
        {busy ? (
          <ActivityIndicator size="small" color={theme.colors.textMuted} style={styles.menu} />
        ) : (
          <HapticPressable
            onPress={() => onMenu(announcement)}
            accessibilityRole="button"
            accessibilityLabel={t('fm.announcements.actionsFor', { title: announcement.title })}
            hitSlop={8}
            style={styles.menu}
          >
            <Icons.DotsThreeVertical size={20} color={theme.colors.textSecondary} weight="bold" />
          </HapticPressable>
        )}
      </View>
      {announcement.body ? (
        <Text style={[styles.body, rtlText]} numberOfLines={3}>
          {announcement.body}
        </Text>
      ) : null}
      {byline ? (
        <Text style={[styles.meta, rtlText]} numberOfLines={1}>
          {byline}
        </Text>
      ) : null}
    </View>
  );
}

export const AnnouncementCard = memo(AnnouncementCardImpl);

export function AnnouncementRowSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={16} width="60%" />
      <Skeleton height={13} width="95%" />
      <Skeleton height={13} width="80%" />
      <Skeleton height={12} width="35%" />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderHairline,
    padding: theme.spacing[16],
    gap: theme.spacing[8],
  },
  cardPinned: { borderColor: theme.colors.goldSubtle },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[8] },
  head: { flex: 1, gap: theme.spacing[6], alignItems: 'flex-start' },
  title: {
    alignSelf: 'stretch',
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  menu: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    marginEnd: -10,
  },
  body: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textSecondary,
  },
  meta: { fontSize: theme.type.label.md.size, color: theme.colors.textMuted },
}));
