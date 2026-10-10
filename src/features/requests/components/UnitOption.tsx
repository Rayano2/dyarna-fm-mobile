import { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Badge, HapticPressable, Icons, RTL_INLINE, useIsRtl } from '@/shared/ui';
import type { BuildingUnit } from '../api/mappers';
import { unitOccupancy } from '../lib/units';

export interface UnitOptionProps {
  unit: BuildingUnit;
  selected: boolean;
  onSelect: (unitNumber: string) => void;
}

/** One radio row of the approve sheet's unit list. Occupied units are disabled. */
export const UnitOption = memo(function UnitOption({
  unit,
  selected,
  onSelect,
}: UnitOptionProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const { occupied, selectable, extraOccupants } = unitOccupancy(unit);

  const occupancyText = occupied
    ? [
        unit.residentFullName
          ? t('fm.requests.occupiedBy', { name: unit.residentFullName })
          : t('fm.requests.occupied'),
        extraOccupants > 0 ? t('fm.requests.additionalOccupants', { count: extraOccupants }) : null,
        t('fm.requests.occupiedDisabled'),
      ]
        .filter(Boolean)
        .join(', ')
    : t('fm.requests.vacant');

  return (
    <HapticPressable
      onPress={() => onSelect(unit.unitNumber)}
      disabled={!selectable}
      scaleOnPress={1}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !selectable }}
      accessibilityLabel={`${t('fm.requests.unit')} ${unit.unitNumber}, ${occupancyText}`}
      style={[styles.row, selected && styles.rowSelected, !selectable && styles.rowDisabled]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.unitNumber} numberOfLines={1}>
          {unit.unitNumber}
        </Text>
        {occupied && unit.residentFullName ? (
          <Text style={[styles.occupant, isRtl ? RTL_INLINE : null]} numberOfLines={1}>
            {unit.residentFullName}
          </Text>
        ) : null}
      </View>
      {extraOccupants > 0 ? <Text style={styles.extra}>+{extraOccupants}</Text> : null}
      {occupied ? (
        <Badge
          size="sm"
          tone="neutral"
          label={t('fm.requests.occupied')}
          icon={<Icons.Prohibit size={12} color={theme.colors.textSecondary} weight="bold" />}
        />
      ) : (
        <Badge
          size="sm"
          tone="primarySubtle"
          label={t('fm.requests.vacant')}
          icon={<Icons.CheckCircle size={12} color={theme.colors.primary} weight="bold" />}
        />
      )}
    </HapticPressable>
  );
});

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[12],
    minHeight: 52,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  rowSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryFaint },
  rowDisabled: { opacity: 0.55 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: theme.colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
  body: { flex: 1, gap: theme.spacing[2] },
  unitNumber: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    writingDirection: 'ltr',
  },
  occupant: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  extra: {
    fontSize: theme.type.label.md.size,
    color: theme.colors.textSecondary,
    writingDirection: 'ltr',
  },
}));
