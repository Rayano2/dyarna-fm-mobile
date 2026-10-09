import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { HapticPressable } from './HapticPressable';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedPillProps<T extends string> {
  options: [SegmentedOption<T>, SegmentedOption<T>];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
  /** When true the pill stretches to fill its parent and each segment
   *  takes an equal share of the width. Default keeps the legacy compact
   *  flex-start sizing used by older callers. */
  fullWidth?: boolean;
}

export function SegmentedPill<T extends string>({
  options,
  value,
  onChange,
  testID,
  fullWidth,
}: SegmentedPillProps<T>) {
  return (
    <View style={[styles.container, fullWidth && styles.containerFull]} testID={testID}>
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <HapticPressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              fullWidth && styles.segmentFull,
              isSelected && styles.segmentSelected,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            testID={testID ? `${testID}-${opt.value}` : undefined}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{opt.label}</Text>
          </HapticPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    padding: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  containerFull: {
    alignSelf: 'stretch',
  },
  segment: {
    paddingHorizontal: theme.spacing[20],
    paddingVertical: theme.spacing[8],
    borderRadius: theme.radius.pill,
    minWidth: 64,
    alignItems: 'center',
  },
  segmentFull: {
    flex: 1,
    paddingHorizontal: theme.spacing[12],
  },
  segmentSelected: {
    backgroundColor: theme.colors.textPrimary,
  },
  label: {
    fontSize: theme.type.label.md.size,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  labelSelected: {
    color: theme.colors.bg,
  },
}));
