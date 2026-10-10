import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Badge, Card, Icons, useRtlTextStyle } from '@/shared/ui';
import type { PropertyUnit } from '../api/mappers';
import { isOccupied } from '../lib/occupancy';

export interface UnitTileProps {
  unit: PropertyUnit;
}

/** Read-only: units have no detail screen. */
export function UnitTile({ unit }: UnitTileProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const occupied = isOccupied(unit);

  return (
    <View style={styles.cell}>
      <Card style={styles.card}>
        <Text style={styles.unitNumber} numberOfLines={1}>
          {unit.unitNumber}
        </Text>
        <Text style={[styles.muted, rtlText]}>
          {t('fm.properties.floor', { n: unit.floorNumber })}
        </Text>
        {occupied ? (
          <View style={styles.resident}>
            {unit.residentFullName ? (
              <Text style={[styles.name, rtlText]} numberOfLines={1}>
                {unit.residentFullName}
              </Text>
            ) : null}
            {unit.residentMobile ? (
              <View style={styles.phoneRow}>
                <Icons.Phone size={12} color={theme.colors.textMuted} weight="regular" />
                <Text style={[styles.muted, styles.ltr]} numberOfLines={1}>
                  {unit.residentMobile}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.badgeRow}>
            <Badge
              tone="primarySubtle"
              size="sm"
              icon={<Icons.CheckCircle size={12} color={theme.colors.primary} weight="fill" />}
              label={t('fm.properties.vacant')}
            />
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  cell: { flexBasis: '45%', flexGrow: 1 },
  card: { gap: theme.spacing[4] },
  unitNumber: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    writingDirection: 'ltr',
    alignSelf: 'flex-start',
  },
  muted: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  ltr: { writingDirection: 'ltr' },
  resident: { gap: theme.spacing[2], marginTop: theme.spacing[4] },
  name: { fontSize: theme.type.body.sm.size, fontWeight: '600', color: theme.colors.textPrimary },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4] },
  badgeRow: { flexDirection: 'row', marginTop: theme.spacing[4] },
}));
