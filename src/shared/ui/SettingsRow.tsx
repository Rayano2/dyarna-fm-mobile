import { type ReactNode } from 'react';
import { View, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { HapticPressable } from './HapticPressable';
import { useIsRtl, RTL_INLINE } from './useRtl';
// Direct module import — going through the barrel ('./') creates a require
// cycle (index -> SettingsRow -> index) that Metro warns about at runtime.
import * as Icons from './icons';

export interface SettingsRowProps {
  /** Phosphor icon component, e.g. `Icons.Buildings`. Pass `undefined` for no icon. */
  icon?: ReactNode;
  label: string;
  /** Trailing static value (e.g. "Tower A", "Light"). */
  value?: string;
  /** Render a trailing chevron — typically when the row is tappable. */
  chevron?: boolean;
  /**
   * Custom trailing slot (e.g. a `<Switch>`). Takes precedence over
   * `value` and `chevron`. Use this when the row's trailing affordance
   * isn't a plain text + chevron — toggles, picker pills, badges, etc.
   */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Render label + icon in terracotta — for sign-out / delete-style rows. */
  destructive?: boolean;
}

/**
 * iOS-Settings-style row: icon · label · trailing value · chevron.
 * Tappable when `onPress` is provided. The visual contract is consistent
 * across the app's preference / account / about lists, so a single
 * component keeps every settings row visually identical without repeating
 * styles per call site.
 */
export function SettingsRow({
  icon,
  label,
  value,
  chevron,
  trailing,
  onPress,
  destructive,
}: SettingsRowProps) {
  const isRTL = useIsRtl();
  const { theme } = useUnistyles();
  const rtlInline = isRTL ? RTL_INLINE : null;
  const labelStyle = [styles.label, destructive && styles.labelDestructive, rtlInline];
  // In RTL, "next" reads to the left, so a right-pointing chevron looks
  // backwards. Swap to a left-facing caret to mirror iOS Settings on
  // an Arabic device.
  const Chevron = isRTL ? Icons.CaretLeft : Icons.CaretRight;
  const body = (
    <View style={styles.row}>
      {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
      <Text style={labelStyle} numberOfLines={1}>
        {label}
      </Text>
      {trailing ? (
        // Custom trailing slot wins over value/chevron entirely.
        <View style={styles.trailingSlot}>{trailing}</View>
      ) : (
        <>
          {value ? (
            <Text
              style={[styles.value, isRTL ? styles.valueRtl : null]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {value}
            </Text>
          ) : null}
          {chevron ? <Chevron size={16} color={theme.colors.textMuted} weight="regular" /> : null}
        </>
      )}
    </View>
  );

  if (!onPress) return body;
  return (
    <HapticPressable
      onPress={onPress}
      // Skip the press scale animation here — settings rows are subtle
      // and an animation per row would create lots of Reanimated
      // SharedValues. The haptic is enough.
      scaleOnPress={1}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {body}
    </HapticPressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[16],
    paddingVertical: theme.spacing[12],
    gap: theme.spacing[12],
    minHeight: 48,
  },
  iconSlot: { width: 22, alignItems: 'center' },
  label: {
    flex: 1,
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  labelDestructive: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  value: {
    fontSize: theme.type.body.md.size,
    color: theme.colors.textMuted,
    flexShrink: 1,
    maxWidth: '50%',
    textAlign: 'right',
  },
  // In RTL the value sits visually on the left side of the row, so the
  // hardcoded right-align would pull it inward. Flip to left-align so the
  // value still hugs the outer edge.
  valueRtl: {
    textAlign: 'left',
  },
  trailingSlot: {
    flexShrink: 0,
  },
}));
