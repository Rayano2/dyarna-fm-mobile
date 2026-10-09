import { Switch, Text, View, type StyleProp, type SwitchProps, type ViewStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

/** Switch tinted with the app palette (sand track / sage active / cream thumb). */
export function TintedSwitch(props: SwitchProps) {
  const { theme } = useUnistyles();
  return (
    <Switch
      trackColor={{ false: theme.colors.borderSubtle, true: theme.colors.primaryMuted }}
      thumbColor={theme.colors.surface}
      {...props}
    />
  );
}

export type SwitchRowLabelVariant = 'body' | 'strong' | 'label';

export interface SwitchRowProps {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** Optional muted sub-line under the label. */
  hint?: string;
  /** Label typography:
   *  - 'body'   — body.md, primary text (default)
   *  - 'strong' — body.md, semibold, primary text
   *  - 'label'  — label.md, semibold, secondary text */
  labelVariant?: SwitchRowLabelVariant;
  /** Set false to keep the platform-default switch colors. */
  tinted?: boolean;
  /** Container overrides — per-screen padding/gap deltas. */
  style?: StyleProp<ViewStyle>;
}

function labelStyle(variant: SwitchRowLabelVariant) {
  switch (variant) {
    case 'body': {
      return styles.labelBody;
    }
    case 'strong': {
      return styles.labelStrong;
    }
    case 'label': {
      return styles.labelLabel;
    }
  }
}

export function SwitchRow({
  label,
  value,
  onValueChange,
  hint,
  labelVariant = 'body',
  tinted = true,
  style,
}: SwitchRowProps) {
  const SwitchComponent = tinted ? TintedSwitch : Switch;
  return (
    <View style={[styles.row, style]}>
      <View style={styles.textColumn}>
        <Text style={labelStyle(labelVariant)}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <SwitchComponent value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textColumn: { flex: 1, gap: theme.spacing[2] },
  labelBody: {
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
  },
  labelStrong: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  labelLabel: {
    fontSize: theme.type.label.md.size,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  hint: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textMuted,
  },
}));
