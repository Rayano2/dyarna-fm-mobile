import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { BottomSheet, OptionRow, useRtlTextStyle, type BottomSheetRef } from '@/shared/ui';

export interface PickerOption {
  key: string;
  label: string;
}

export interface PickerSheetProps {
  title: string;
  options: PickerOption[];
  selectedKey: string | undefined;
  /** Called with the tapped key; the host applies it and dismisses the sheet. */
  onSelect: (key: string) => void;
}

/** A single-choice list in a bottom sheet. A tap applies; there is no footer. */
export const PickerSheet = forwardRef<BottomSheetRef, PickerSheetProps>(function PickerSheet(
  { title, options, selectedKey, onSelect },
  ref,
) {
  const rtlText = useRtlTextStyle();
  return (
    <BottomSheet ref={ref} snapPoints={['50%']} scrollable>
      <View style={styles.body}>
        <Text style={[styles.title, rtlText]} accessibilityRole="header">
          {title}
        </Text>
        <View accessibilityRole="radiogroup" style={styles.list}>
          {options.map((option) => (
            <OptionRow
              key={option.key}
              label={option.label}
              selected={option.key === selectedKey}
              onPress={() => onSelect(option.key)}
            />
          ))}
        </View>
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create((theme) => ({
  body: {
    paddingHorizontal: theme.spacing[20],
    paddingTop: theme.spacing[8],
    paddingBottom: theme.spacing[32],
    gap: theme.spacing[12],
  },
  title: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  list: { gap: theme.spacing[8] },
}));
