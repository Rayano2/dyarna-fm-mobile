import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useRtlTextStyle } from '@/shared/ui';

export interface OccupancyBarProps {
  /** occupied / total in [0, 1]. */
  ratio: number;
  /** Always shown, so occupancy is never signalled by colour alone. */
  caption: string;
}

export function OccupancyBar({ ratio, caption }: OccupancyBarProps): React.JSX.Element {
  const rtlText = useRtlTextStyle();
  const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <View style={styles.wrapper}>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        accessibilityLabel={caption}
      >
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text style={[styles.caption, rtlText]}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: { gap: theme.spacing[4] },
  track: {
    height: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.borderSubtle,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  fill: { height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary },
  caption: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
}));
