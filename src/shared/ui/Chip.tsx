import { ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { HapticPressable } from './HapticPressable';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Forwarded to HapticPressable. Filter rows pass 1 to disable the bouncy
   *  press scale — the spring overshoots above 1.0 on release and reads as
   *  the pill momentarily "expanding". Chips are small targets where the
   *  haptic alone is sufficient feedback. */
  scaleOnPress?: number;
  numberOfLines?: number;
  testID?: string;
}

export function Chip({
  label,
  selected,
  onPress,
  disabled,
  scaleOnPress,
  numberOfLines,
  testID,
}: ChipProps) {
  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      {...(scaleOnPress === undefined ? {} : { scaleOnPress })}
      style={[styles.chip, selected && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={disabled ? { selected, disabled } : { selected }}
      testID={testID}
    >
      <Text
        style={[styles.chipText, selected && styles.chipTextActive]}
        {...(numberOfLines === undefined ? {} : { numberOfLines })}
      >
        {label}
      </Text>
    </HapticPressable>
  );
}

export interface ChipRowProps {
  children: React.ReactNode;
  /** Render as a wrapping row (no horizontal scroll) — used when the full
   *  set of chips should stay visible, e.g. building pickers. */
  wrap?: boolean;
  /** Extra style for the outer ScrollView (scroll mode only). */
  style?: StyleProp<ViewStyle>;
  /** Extra style for the content row — horizontal padding etc. */
  contentStyle?: StyleProp<ViewStyle>;
}

export function ChipRow({ children, wrap, style, contentStyle }: ChipRowProps) {
  if (wrap) {
    return <View style={[styles.wrapRow, contentStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Without flexGrow: 0, the horizontal ScrollView eats vertical space
      // from the parent's flex column, which then stretches the chips
      // (alignItems defaults to stretch in flex rows) into giant ovals.
      style={[styles.scroll, style]}
      contentContainerStyle={[styles.row, contentStyle]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[8],
  },
  chip: {
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[6],
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    // Prevent the chip from being compressed by flex siblings or growing
    // taller than its single text line.
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: theme.type.body.sm.size,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipTextActive: { color: theme.colors.textOnPrimary },
}));
