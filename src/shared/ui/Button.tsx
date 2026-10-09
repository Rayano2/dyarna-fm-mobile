import { ActivityIndicator, StyleSheet as RNStyleSheet, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { LinearGradient } from 'expo-linear-gradient';
import { HapticPressable } from './HapticPressable';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  /** Extends the touch target without changing the visual size. The `sm`
   *  variant is only 40px tall, so a small button in a dense row needs this
   *  to clear the 44px minimum. */
  hitSlop?: number;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth = true,
  leadingIcon,
  trailingIcon,
  testID,
  accessibilityLabel,
  hitSlop,
}: ButtonProps) {
  const { theme } = useUnistyles();
  const isDisabled = disabled || loading;
  styles.useVariants({ variant, size, fullWidth, disabled: !!disabled && !loading });
  const isGradient = variant === 'primary' && !isDisabled;

  const content = (
    <View style={styles.innerContent}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.textOnPrimary : undefined} />
      ) : (
        <>
          {leadingIcon ? <View style={styles.iconLeading}>{leadingIcon}</View> : null}
          <Text style={styles.label}>{label}</Text>
          {trailingIcon ? <View style={styles.iconTrailing}>{trailingIcon}</View> : null}
        </>
      )}
    </View>
  );

  return (
    <HapticPressable
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      {...(hitSlop === undefined ? {} : { hitSlop })}
      style={styles.container}
    >
      {/* Gradient is an absolute-positioned background, NOT a flex child,
          so its `flex: 1` can't get into a recursive sizing fight with
          the Pressable when it sits inside a tall flex parent (e.g. an
          empty-state slot with flexGrow: 1). The Pressable sizes to
          `content` only; the gradient just fills whatever the Pressable
          ends up being. */}
      {isGradient ? (
        <LinearGradient
          colors={[theme.colors.primaryMuted, theme.colors.primary, theme.colors.primaryHover]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
          pointerEvents="none"
        />
      ) : null}
      {content}
    </HapticPressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    variants: {
      variant: {
        primary: {
          backgroundColor: theme.colors.primary,
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 4,
        },
        secondary: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.primary,
        },
        ghost: { backgroundColor: 'transparent' },
        destructive: { backgroundColor: 'transparent' },
      },
      size: {
        sm: { minHeight: 40 },
        md: { minHeight: 52 },
        lg: { minHeight: 60 },
      },
      fullWidth: {
        true: { alignSelf: 'stretch' },
        false: { alignSelf: 'center', paddingHorizontal: theme.spacing[32] },
      },
      disabled: {
        true: { opacity: 0.4 },
        false: {},
      },
    },
  },
  gradient: {
    ...RNStyleSheet.absoluteFillObject,
    borderRadius: theme.radius.pill,
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[24],
    paddingVertical: theme.spacing[16],
    gap: theme.spacing[8],
  },
  label: {
    fontSize: theme.type.label.lg.size,
    lineHeight: theme.type.label.lg.lineHeight,
    fontWeight: theme.type.label.lg.weight,
    letterSpacing: theme.type.label.lg.size * theme.type.label.lg.tracking,
    textTransform: 'uppercase',
    variants: {
      variant: {
        primary: { color: theme.colors.textOnPrimary },
        secondary: { color: theme.colors.primary },
        ghost: { color: theme.colors.textPrimary },
        destructive: { color: theme.colors.error },
      },
    },
  },
  iconLeading: { marginEnd: theme.spacing[4] },
  iconTrailing: { marginStart: theme.spacing[4] },
}));
