import { useEffect, useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

export interface OtpBoxesProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpBoxes({
  value,
  onChange,
  onComplete,
  length = 4,
  error,
  disabled,
  autoFocus = true,
}: OtpBoxesProps) {
  const inputRef = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  styles.useVariants({ hasError: !!error });

  useEffect(() => {
    if (error) {
      shake.value = withSequence(
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(-4, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [error, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  function handleChange(text: string) {
    const digits = text.replaceAll(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  }

  function focusInput() {
    inputRef.current?.focus();
  }

  return (
    <Pressable onPress={focusInput} disabled={disabled} accessibilityRole="none">
      <Animated.View
        style={[styles.row, shakeStyle]}
        testID="otp-wrapper"
        accessibilityLabel={error ? 'OTP input — invalid code' : 'OTP input'}
      >
        {Array.from({ length }).map((_, i) => {
          const digit = value[i] ?? '';
          const isCurrent = i === value.length;
          return (
            <View
              key={i}
              testID={`otp-box-${i}`}
              style={[styles.box, isCurrent && styles.boxActive]}
            >
              <Text style={styles.digit}>{digit}</Text>
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={inputRef}
        testID="otp-input"
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        editable={!disabled}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    // An OTP is numeric and always reads left-to-right, even when the UI is
    // Arabic/RTL. Pin the box row to LTR so digit 0 stays on the left;
    // otherwise the native RTL flip reverses the boxes and a code typed
    // "1234" renders as "4 3 2 1".
    direction: 'ltr',
    gap: theme.spacing[12],
    justifyContent: 'center',
  },
  box: {
    width: 56,
    height: 64,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    variants: {
      hasError: {
        true: { borderColor: theme.colors.error },
        false: { borderColor: theme.colors.borderSubtle },
      },
    },
  },
  boxActive: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  digit: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
}));
