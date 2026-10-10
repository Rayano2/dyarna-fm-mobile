import { Share, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Badge, Button, HapticPressable, Icons, useIsRtl, useRtlTextStyle } from '@/shared/ui';
import { logger } from '@/shared/lib/logger';
import type { PropertyBuilding, PropertyUnit } from '../api/mappers';
import { UnitTile } from './UnitTile';

export interface BuildingSectionProps {
  building: PropertyBuilding;
  /** The units left after the occupancy filter. */
  units: readonly PropertyUnit[];
  expanded: boolean;
  onToggle: (buildingCode: string) => void;
  onAddUnit: (building: PropertyBuilding) => void;
}

export function BuildingSection({
  building,
  units,
  expanded,
  onToggle,
  onAddUnit,
}: BuildingSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const rtlText = useRtlTextStyle();
  const Chevron = expanded ? Icons.CaretDown : isRtl ? Icons.CaretLeft : Icons.CaretRight;

  const share = (): void => {
    // The OS share sheet; a cancel resolves normally, only real failures land here.
    Share.share({ message: building.buildingCode }).catch((error: unknown) => {
      logger.warn(`[properties] share failed: ${String(error)}`);
    });
  };

  const renderBody = (): React.ReactNode => {
    if (building.units.length === 0) {
      return (
        <View style={styles.noUnits}>
          <Text style={[styles.muted, rtlText]}>{t('fm.properties.noUnits')}</Text>
          <Button
            label={t('fm.properties.addUnit')}
            variant="ghost"
            size="sm"
            hitSlop={4}
            onPress={() => onAddUnit(building)}
          />
        </View>
      );
    }
    return (
      <>
        {units.length === 0 ? (
          <Text style={[styles.muted, rtlText]}>{t('fm.properties.noFilteredUnits')}</Text>
        ) : (
          <View style={styles.grid}>
            {units.map((unit) => (
              <UnitTile key={unit.unitNumber} unit={unit} />
            ))}
          </View>
        )}
        <View style={styles.addRow}>
          <Button
            label={t('fm.properties.addUnit')}
            variant="secondary"
            size="sm"
            hitSlop={4}
            leadingIcon={<Icons.Plus size={16} color={theme.colors.primary} />}
            onPress={() => onAddUnit(building)}
            testID={`add-unit-${building.buildingCode}`}
          />
        </View>
      </>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <HapticPressable
          onPress={() => onToggle(building.buildingCode)}
          scaleOnPress={1}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${building.buildingName}, ${building.buildingCode}, ${t(
            'fm.properties.units',
            { count: building.units.length },
          )}`}
          style={styles.toggle}
          testID={`building-${building.buildingCode}`}
        >
          <Chevron size={18} color={theme.colors.textSecondary} weight="regular" />
          <View style={styles.titleBlock}>
            <Text style={[styles.name, rtlText]} numberOfLines={1}>
              {building.buildingName}
            </Text>
            <Text style={styles.code} numberOfLines={1}>
              {building.buildingCode}
            </Text>
          </View>
          <Badge
            tone="neutral"
            size="sm"
            label={t('fm.properties.units', { count: building.units.length })}
          />
        </HapticPressable>
        <HapticPressable
          onPress={share}
          accessibilityRole="button"
          accessibilityLabel={t('fm.properties.shareBuildingCode')}
          hitSlop={10}
          style={styles.iconButton}
        >
          <Icons.Share size={20} color={theme.colors.textSecondary} weight="regular" />
        </HapticPressable>
      </View>
      {expanded ? <View style={styles.body}>{renderBody()}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  section: { gap: theme.spacing[8] },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4] },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
    minHeight: 44,
  },
  titleBlock: { flex: 1, gap: theme.spacing[2] },
  name: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  code: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textMuted,
    writingDirection: 'ltr',
    alignSelf: 'flex-start',
  },
  iconButton: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  body: { gap: theme.spacing[12] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[12] },
  muted: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  noUnits: { gap: theme.spacing[8], alignItems: 'flex-start' },
  addRow: { flexDirection: 'row' },
}));
