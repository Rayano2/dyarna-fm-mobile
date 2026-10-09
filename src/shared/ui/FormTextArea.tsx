import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export interface FormTextAreaProps extends Omit<TextInputProps, 'style'> {
  error?: string | undefined;
  /** Minimum height of the input box. */
  minHeight?: number;
  /** Render through BottomSheetTextInput so @gorhom/bottom-sheet's
   *  keyboard handling works when the field lives inside a sheet. */
  bottomSheet?: boolean;
}

export function FormTextArea({
  error,
  minHeight = 140,
  bottomSheet,
  placeholderTextColor,
  ...rest
}: FormTextAreaProps) {
  const { theme } = useUnistyles();
  const inputProps = {
    placeholderTextColor: placeholderTextColor ?? theme.colors.textMuted,
    multiline: true,
    style: [styles.textarea, { minHeight }],
    textAlignVertical: 'top' as const,
    ...rest,
  };
  return (
    <View style={styles.wrapper}>
      {bottomSheet ? <BottomSheetTextInput {...inputProps} /> : <TextInput {...inputProps} />}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: { gap: theme.spacing[8] },
  textarea: {
    padding: theme.spacing[12],
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
  },
  errorText: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.error,
  },
}));
