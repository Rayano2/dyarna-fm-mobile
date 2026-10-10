import { forwardRef, useState } from 'react';
import { TextInput, View, Text, type TextInputProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string | undefined;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  error?: string | undefined;
  helper?: string | undefined;
  testID?: string | undefined;
  /** For values that always read left-to-right (email, phone), even in Arabic. */
  forceLtr?: boolean | undefined;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    leadingIcon,
    trailingIcon,
    error,
    helper,
    onFocus,
    onBlur,
    placeholder,
    forceLtr,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const { theme } = useUnistyles();
  styles.useVariants({ focused: focused && !error, hasError: !!error });

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        {leadingIcon ? <View style={styles.leadingIconSlot}>{leadingIcon}</View> : null}
        <TextInput
          ref={ref}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, forceLtr ? LTR_INPUT : null]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {trailingIcon ? <View style={styles.trailingIconSlot}>{trailingIcon}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helper ? <Text style={styles.helperText}>{helper}</Text> : null}
    </View>
  );
});

const LTR_INPUT = { writingDirection: 'ltr', textAlign: 'left' } as const;

const styles = StyleSheet.create((theme) => ({
  wrapper: { gap: theme.spacing[6] },
  label: {
    fontSize: theme.type.label.md.size,
    lineHeight: theme.type.label.md.lineHeight,
    fontWeight: theme.type.label.md.weight,
    color: theme.colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing[16],
    minHeight: 56,
    variants: {
      focused: {
        true: { borderColor: theme.colors.primary, borderWidth: 2 },
        false: { borderColor: theme.colors.borderSubtle },
      },
      hasError: {
        true: { borderColor: theme.colors.error, borderWidth: 2 },
      },
    },
  },
  leadingIconSlot: { marginEnd: theme.spacing[12] },
  trailingIconSlot: { marginStart: theme.spacing[12] },
  input: {
    flex: 1,
    fontSize: theme.type.body.lg.size,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing[12],
  },
  errorText: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.error,
  },
  helperText: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textMuted,
  },
}));
