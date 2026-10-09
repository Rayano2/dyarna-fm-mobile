import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export interface ResidentStatProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

/** A ticket-count tile on the resident detail (icon, number, label). */
export function ResidentStat({ icon, value, label }: ResidentStatProps): React.JSX.Element {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      {icon}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing[4],
    paddingVertical: theme.spacing[12],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  value: {
    fontSize: theme.type.heading.lg.size,
    lineHeight: theme.type.heading.lg.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    writingDirection: 'ltr',
  },
  label: { fontSize: theme.type.label.md.size, color: theme.colors.textSecondary },
}));
