import { forwardRef } from 'react';
import { Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { BottomSheet, HapticPressable, useRtlTextStyle, type BottomSheetRef } from '@/shared/ui';

export interface ActionSheetAction {
  key: string;
  label: string;
  icon?: React.ComponentType<{ size: number; color: string; weight: 'regular' }>;
  destructive?: boolean;
  onPress: () => void;
}

export interface ActionSheetProps {
  title?: string;
  actions: ActionSheetAction[];
}

/**
 * A row's overflow menu as a bottom-sheet list. Alert-based menus cap at three
 * buttons on Android, which is one short of Building info's Edit / Publish /
 * Delete / Cancel. The sheet dismisses itself before running the action.
 */
export const ActionSheet = forwardRef<BottomSheetRef, ActionSheetProps>(function ActionSheet(
  { title, actions },
  ref,
) {
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const dismiss = (): void => {
    if (ref && typeof ref === 'object') ref.current?.dismiss();
  };

  return (
    <BottomSheet ref={ref} snapPoints={['35%']}>
      {title ? (
        <Text style={[styles.title, rtlText]} numberOfLines={2} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {actions.map((action) => {
        const color = action.destructive ? theme.colors.error : theme.colors.textPrimary;
        const Icon = action.icon;
        return (
          <HapticPressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={styles.row}
            onPress={() => {
              dismiss();
              action.onPress();
            }}
          >
            {Icon ? <Icon size={20} color={color} weight="regular" /> : null}
            <Text style={[styles.label, { color }, rtlText]}>{action.label}</Text>
          </HapticPressable>
        );
      })}
    </BottomSheet>
  );
});

const styles = StyleSheet.create((theme) => ({
  title: {
    fontSize: theme.type.label.lg.size,
    lineHeight: theme.type.label.lg.lineHeight,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[8],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[12],
    minHeight: 48,
  },
  label: {
    flex: 1,
    fontSize: theme.type.body.lg.size,
    lineHeight: theme.type.body.lg.lineHeight,
  },
}));
