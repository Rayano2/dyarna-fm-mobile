import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  BottomSheet,
  HapticPressable,
  Icons,
  RTL_INLINE,
  useIsRtl,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';

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
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const rtlText = useRtlTextStyle();
  return (
    <BottomSheet ref={ref} snapPoints={['50%']} scrollable>
      <View style={styles.body}>
        <Text style={[styles.title, rtlText]} accessibilityRole="header">
          {title}
        </Text>
        <View accessibilityRole="radiogroup" style={styles.list}>
          {options.map((option) => {
            const selected = option.key === selectedKey;
            return (
              <HapticPressable
                key={option.key}
                onPress={() => onSelect(option.key)}
                scaleOnPress={1}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={option.label}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    selected && styles.optionLabelSelected,
                    isRtl ? RTL_INLINE : null,
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
                {selected ? (
                  <Icons.Check size={18} color={theme.colors.primary} weight="bold" />
                ) : null}
              </HapticPressable>
            );
          })}
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
  optionLabel: {
    flex: 1,
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
  },
  optionLabelSelected: { fontWeight: '600' },
}));
