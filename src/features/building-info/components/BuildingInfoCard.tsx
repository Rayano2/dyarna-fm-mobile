import { memo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useLocaleStore } from '@/shared/stores/localeStore';
import { safeToLocaleDateString } from '@/shared/lib/safe-intl';
import { Badge, HapticPressable, Icons, Skeleton, useRtlTextStyle } from '@/shared/ui';
import type { BuildingInfoItem } from '../api/building-info-api';
import {
  categoryIconName,
  categoryLabel,
  itemStatus,
  statusIconName,
} from '../lib/building-info-meta';

export interface BuildingInfoCardProps {
  item: BuildingInfoItem;
  /** Building display name; undefined = whole project. */
  buildingName: string | undefined;
  busy: boolean;
  onPress: (item: BuildingInfoItem) => void;
  onMenu: (item: BuildingInfoItem) => void;
}

export function formatExpiry(iso: string, locale: 'en' | 'ar'): string {
  return safeToLocaleDateString(new Date(iso), locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Adapted from dyarna-rn `BuildingInfoCard`: adds scope, status (icon + text),
 * expiry tag, file count and the overflow menu. Expired items carry an accent
 * bar on the start edge, from the server's `isExpired` only.
 */
function BuildingInfoCardImpl({
  item,
  buildingName,
  busy,
  onPress,
  onMenu,
}: BuildingInfoCardProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const locale = useLocaleStore((s) => s.locale);
  const rtlText = useRtlTextStyle();
  const status = itemStatus(item);
  const Glyph = Icons[categoryIconName(item.categoryCode)];
  const StatusIcon = Icons[statusIconName(status)];
  const statusColor =
    status === 'published'
      ? theme.colors.success
      : status === 'expired'
        ? theme.colors.terracotta
        : theme.colors.textMuted;

  return (
    <View style={styles.card}>
      {item.isExpired ? <View style={styles.accent} /> : null}
      <HapticPressable
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={t('fm.buildingInfo.editA11y', { title: item.title })}
        scaleOnPress={1}
        style={styles.main}
      >
        <View style={styles.topRow}>
          <View style={styles.iconTile}>
            <Glyph size={20} color={theme.colors.primary} weight="regular" />
          </View>
          <View style={styles.headText}>
            <Text style={[styles.title, rtlText]} numberOfLines={2}>
              {item.title}
            </Text>
            {item.summary ? (
              <Text style={[styles.summary, rtlText]} numberOfLines={2}>
                {item.summary}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.badgeRow}>
          <Badge label={categoryLabel(item.categoryCode, t)} tone="neutral" size="sm" />
          <Badge
            label={buildingName ?? t('fm.buildingInfo.scopeProjectWide')}
            tone="primaryMuted"
            size="sm"
          />
          {item.attachmentCount > 0 ? (
            <Badge
              label={t('fm.buildingInfo.fileCount', { count: item.attachmentCount })}
              tone="neutral"
              size="sm"
              icon={<Icons.FileText size={10} weight="bold" color={theme.colors.textSecondary} />}
            />
          ) : null}
          {item.expiresAt ? (
            <Badge
              label={t('fm.buildingInfo.expires', { date: formatExpiry(item.expiresAt, locale) })}
              tone={item.isExpired ? 'danger' : 'goldMuted'}
              size="sm"
            />
          ) : null}
        </View>
        <View style={styles.statusRow}>
          <StatusIcon size={14} color={statusColor} weight="regular" />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {t(`fm.buildingInfo.filter.${status}`)}
          </Text>
        </View>
      </HapticPressable>
      {busy ? (
        <ActivityIndicator size="small" color={theme.colors.textMuted} style={styles.menu} />
      ) : (
        <HapticPressable
          onPress={() => onMenu(item)}
          accessibilityRole="button"
          accessibilityLabel={t('fm.buildingInfo.actionsFor', { title: item.title })}
          hitSlop={8}
          style={styles.menu}
        >
          <Icons.DotsThreeVertical size={20} color={theme.colors.textSecondary} weight="bold" />
        </HapticPressable>
      )}
    </View>
  );
}

export const BuildingInfoCard = memo(BuildingInfoCardImpl);

/** Copied from dyarna-rn `BuildingInfoRowSkeleton`. */
export function BuildingInfoRowSkeleton() {
  return (
    <View style={[styles.card, styles.skeleton]}>
      <View style={styles.topRow}>
        <Skeleton height={40} width={40} radius={12} />
        <View style={styles.headText}>
          <Skeleton height={16} width="70%" />
          <Skeleton height={13} width="90%" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderHairline,
    overflow: 'hidden',
    minHeight: 56,
  },
  skeleton: { padding: theme.spacing[16] },
  // Start edge in both directions (row layout mirrors under RTL).
  accent: { width: 4, alignSelf: 'stretch', backgroundColor: theme.colors.terracotta },
  main: { flex: 1, padding: theme.spacing[16], paddingEnd: 0, gap: theme.spacing[8] },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12] },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headText: { flex: 1, gap: theme.spacing[6] },
  title: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  summary: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textSecondary,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing[6] },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[6] },
  statusText: { fontSize: theme.type.label.lg.size, fontWeight: '500' },
  menu: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing[6],
  },
}));
