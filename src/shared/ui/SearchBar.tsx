import { forwardRef, useEffect, useRef } from 'react';
import { TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { HapticPressable } from './HapticPressable';
import * as Icons from './icons';

export interface SearchBarProps {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  /** Focus the input as soon as the bar mounts. */
  autoFocus?: boolean;
  /** Accessibility label for the clear button. */
  clearLabel?: string;
}

export const SearchBar = forwardRef<TextInput, SearchBarProps>(function SearchBar(
  { value, onChangeText, placeholder, autoFocus = false, clearLabel = 'Clear search' },
  ref,
) {
  const innerRef = useRef<TextInput | null>(null);
  const { theme } = useUnistyles();

  // expo-router caches mounted screens; relying on TextInput's own
  // autoFocus only works on first mount. Re-focus when the bar opens.
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => innerRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [autoFocus]);

  const showClear = value.length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.leading}>
        <Icons.MagnifyingGlass size={16} color={theme.colors.textMuted} weight="regular" />
      </View>
      <TextInput
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
      />
      {showClear ? (
        <HapticPressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          style={styles.clear}
          scaleOnPress={1}
        >
          <Icons.XCircle size={18} color={theme.colors.textMuted} weight="fill" />
        </HapticPressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing[16],
    marginBottom: theme.spacing[8],
    paddingHorizontal: theme.spacing[12],
    minHeight: 36,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  leading: { marginEnd: theme.spacing[8] },
  input: {
    flex: 1,
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  clear: { marginStart: theme.spacing[8] },
}));
