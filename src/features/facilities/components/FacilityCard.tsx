import { memo, useCallback } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Badge,
  HapticPressable,
  Icons,
  Skeleton,
  TintedSwitch,
  useRtlTextStyle,
} from '@/shared/ui';
import type { Facility } from '../api/facilities-api';
import { facilityTypeIcon, facilityTypeLabel } from '../lib/facility-meta';

export interface FacilityCardProps {
  facility: Facility;
  /** Display name of the facility's building; undefined = project-wide. */
  buildingName: string | undefined;
  toggling: boolean;
  onPress: (facility: Facility) => void;
  onToggleActive: (facility: Facility, next: boolean) => void;
}

/**
 * Adapted from dyarna-rn `FacilityCard`: adds the FM scope, rules, approval
 * and active badges plus the active switch. Inactive cards are dimmed AND
 * labelled — state is never conveyed by opacity alone.
 */
function FacilityCardImpl({
  facility,
  buildingName,
  toggling,
  onPress,
  onToggleActive,
}: FacilityCardProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const typeLabel = facilityTypeLabel(facility.facilityType, t);
  const TypeIcon = Icons[facilityTypeIcon(facility.facilityType)];
  const handlePress = useCallback(() => onPress(facility), [onPress, facility]);

  const rules =
    facility.advanceBookingDays === null
      ? t('fm.facilities.rulesSummaryNoLimit', { hours: facility.maxDurationHours })
      : t('fm.facilities.rulesSummary', {
          days: facility.advanceBookingDays,
          hours: facility.maxDurationHours,
        });

  return (
    <View style={[styles.card, !facility.isActive && styles.cardInactive]}>
      <HapticPressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={t('fm.facilities.editA11y', { name: facility.name })}
        scaleOnPress={1}
        style={styles.main}
      >
        <View style={styles.topRow}>
          <View style={styles.typeTile}>
            <TypeIcon size={20} color={theme.colors.primary} weight="regular" />
          </View>
          <View style={styles.headText}>
            <Text style={[styles.name, rtlText]} numberOfLines={2}>
              {facility.name}
            </Text>
            <View style={styles.badgeRow}>
              {typeLabel ? <Badge label={typeLabel} tone="neutral" size="sm" /> : null}
              <Badge
                label={buildingName ?? t('fm.facilities.scopeProjectWide')}
                tone="primaryMuted"
                size="sm"
              />
            </View>
          </View>
        </View>

        {facility.capacity === undefined ? null : (
          <View style={styles.metaRow}>
            <Icons.Users size={14} color={theme.colors.textMuted} weight="regular" />
            <Text style={[styles.metaText, rtlText]} numberOfLines={1}>
              {t('fm.facilities.capacityValue', { count: facility.capacity })}
            </Text>
          </View>
        )}
        <View style={styles.metaRow}>
          <Icons.Clock size={14} color={theme.colors.textMuted} weight="regular" />
          <Text style={[styles.metaText, rtlText]} numberOfLines={1}>
            {rules}
          </Text>
        </View>
        <View style={styles.badgeRow}>
          <Badge
            label={
              facility.requiresApproval
                ? t('fm.facilities.requiresApproval')
                : t('fm.facilities.approvalAuto')
            }
            tone={facility.requiresApproval ? 'goldMuted' : 'neutral'}
            size="sm"
            icon={
              facility.requiresApproval ? (
                <Icons.ShieldCheck size={12} color={theme.colors.gold} weight="regular" />
              ) : (
                <Icons.Lightning size={12} color={theme.colors.textSecondary} weight="regular" />
              )
            }
          />
        </View>
      </HapticPressable>

      <View style={styles.activeRow}>
        <View style={styles.activeLabel}>
          {facility.isActive ? (
            <Icons.CheckCircle size={16} color={theme.colors.success} weight="fill" />
          ) : (
            <Icons.Prohibit size={16} color={theme.colors.textMuted} weight="regular" />
          )}
          <Text style={[styles.activeText, rtlText]}>
            {facility.isActive ? t('fm.facilities.active') : t('fm.facilities.inactive')}
          </Text>
        </View>
        <TintedSwitch
          value={facility.isActive}
          disabled={toggling}
          onValueChange={(next) => onToggleActive(facility, next)}
          accessibilityRole="switch"
          accessibilityLabel={t('fm.facilities.activeA11y', { name: facility.name })}
          accessibilityState={{ checked: facility.isActive, busy: toggling, disabled: toggling }}
        />
      </View>
    </View>
  );
}

export const FacilityCard = memo(FacilityCardImpl);

/** Copied from dyarna-rn `FacilityRowSkeleton`. */
export function FacilityRowSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Skeleton height={40} width={40} radius={12} />
        <View style={styles.headText}>
          <Skeleton height={16} width="70%" />
          <Skeleton height={14} width={72} radius={999} />
        </View>
      </View>
      <Skeleton height={13} width="55%" />
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
    minHeight: 56,
  },
  cardInactive: { opacity: 0.6 },
  main: { gap: theme.spacing[8] },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12] },
  typeTile: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headText: { flex: 1, gap: theme.spacing[6] },
  name: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing[6] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  metaText: { flex: 1, fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderHairline,
    paddingTop: theme.spacing[8],
  },
  activeLabel: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[6] },
  activeText: { fontSize: theme.type.label.lg.size, color: theme.colors.textPrimary },
}));
