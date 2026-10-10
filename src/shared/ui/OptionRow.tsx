import { Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { HapticPressable } from './HapticPressable';
import * as Icons from './icons';
import { RTL_INLINE, useIsRtl } from './useRtl';

export interface OptionRowProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** One single-choice option (radio semantics) for filter and picker sheets. */
export function OptionRow({ label, selected, disabled = false, onPress }: OptionRowProps) {
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      scaleOnPress={1}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      style={[styles.option, selected && styles.optionSelected, disabled && styles.optionDisabled]}
    >
      <Text
        style={[
          styles.optionLabel,
          selected && styles.optionLabelSelected,
          isRtl ? RTL_INLINE : null,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {selected ? <Icons.Check size={18} color={theme.colors.primary} weight="bold" /> : null}
    </HapticPressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[12],
    minHeight: 44,
    paddingHorizontal: theme.spacing[12],
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaint,
  },
  optionDisabled: { opacity: 0.5 },
  optionLabel: {
    flex: 1,
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
  },
  optionLabelSelected: { fontWeight: '600' },
}));
