import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Card, HapticPressable, Icons, useIsRtl } from '@/shared/ui';
import { goTo } from '@/shared/lib/go-to';
import type { KpiTileSpec } from '../lib/kpis';

export interface KpiTileProps {
  tile: KpiTileSpec;
  /** null = unknown, rendered as an en dash. */
  value: number | null;
}

const UNKNOWN = '–';

export function KpiTile({ tile, value }: KpiTileProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const Glyph = Icons[tile.icon];
  const Caret = isRtl ? Icons.CaretLeft : Icons.CaretRight;
  const label = t(tile.labelKey);
  const display = value === null ? UNKNOWN : String(value);

  return (
    <HapticPressable
      style={styles.pressable}
      onPress={() => goTo(tile.destination)}
      accessibilityRole="button"
      accessibilityLabel={t('fm.dashboard.kpi.a11y', { label, count: display })}
      accessibilityHint={t(tile.descKey)}
      testID={`kpi-${tile.kind}`}
    >
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.iconBox}>
            <Glyph size={20} color={theme.colors.primary} weight="regular" />
          </View>
          <Caret size={16} color={theme.colors.textMuted} weight="regular" />
        </View>
        <Text style={styles.value} numberOfLines={1}>
          {display}
        </Text>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      </Card>
    </HapticPressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  pressable: {
    flexBasis: '45%',
    flexGrow: 1,
  },
  card: {
    minHeight: 110,
    gap: theme.spacing[4],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: theme.type.heading.xl.size,
    lineHeight: theme.type.heading.xl.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textSecondary,
  },
}));
