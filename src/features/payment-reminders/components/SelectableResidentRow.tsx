import { memo } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import type { Resident } from '@/features/residents';
import { HapticPressable, Icons, RTL_INLINE, useIsRtl } from '@/shared/ui';

export interface SelectableResidentRowProps {
  resident: Resident;
  selected: boolean;
  disabled: boolean;
  onToggle: (userId: string) => void;
}

/** A resident with a leading checkbox. The whole row toggles the selection. */
export const SelectableResidentRow = memo(function SelectableResidentRow({
  resident,
  selected,
  disabled,
  onToggle,
}: SelectableResidentRowProps): React.JSX.Element {
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const meta = [resident.buildingName, resident.unitNumber].filter(Boolean).join(' · ');

  return (
    <HapticPressable
      onPress={() => onToggle(resident.userId)}
      disabled={disabled}
      haptic="selection"
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={[resident.fullName, meta].filter(Boolean).join(', ')}
      style={[styles.row, disabled ? styles.rowDisabled : null]}
    >
      <View style={[styles.box, selected ? styles.boxChecked : null]}>
        {selected ? (
          <Icons.Check size={14} color={theme.colors.textOnPrimary} weight="bold" />
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, isRtl ? RTL_INLINE : null]} numberOfLines={1}>
          {resident.fullName || '-'}
        </Text>
        {meta ? (
          <Text style={[styles.meta, isRtl ? RTL_INLINE : null]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </HapticPressable>
  );
});

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[12],
    minHeight: 48,
    paddingVertical: theme.spacing[8],
  },
  // Same disabled treatment as the shared OptionRow.
  rowDisabled: { opacity: 0.5 },
  box: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.sm / 2,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  body: { flex: 1, gap: theme.spacing[2] },
  name: { fontSize: theme.type.body.md.size, fontWeight: '600', color: theme.colors.textPrimary },
  meta: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
}));
