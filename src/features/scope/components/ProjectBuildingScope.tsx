import { useCallback, useRef } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  BottomSheet,
  HapticPressable,
  Icons,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import type { ScopeValue } from '../hooks/useScope';

export interface ProjectBuildingScopeProps {
  scope: ScopeValue;
  /** Announcements are project-scoped only; the other screens filter by building too. */
  showBuilding?: boolean;
  /** Rendered at the end of the row — the screen's "+" action. */
  trailing?: React.ReactNode;
}

interface PickerChipProps {
  label: string;
  placeholder: boolean;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}

function PickerChip({
  label,
  placeholder,
  accessibilityLabel,
  disabled,
  onPress,
}: PickerChipProps) {
  const { theme } = useUnistyles();
  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={styles.chip}
    >
      <Text style={[styles.chipText, placeholder && styles.chipPlaceholder]} numberOfLines={1}>
        {label}
      </Text>
      <Icons.CaretDown size={14} color={theme.colors.textSecondary} weight="bold" />
    </HapticPressable>
  );
}

interface OptionRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function OptionRow({ label, selected, onPress }: OptionRowProps) {
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  return (
    <HapticPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={styles.option}
    >
      <Text style={[styles.optionText, rtlText]} numberOfLines={2}>
        {label}
      </Text>
      {selected ? <Icons.Check size={18} color={theme.colors.primary} weight="bold" /> : null}
    </HapticPressable>
  );
}

/**
 * Sticky project + building picker shared by the four community screens.
 * Each chip opens a bottom-sheet list; picks persist across the screens.
 */
export function ProjectBuildingScope({
  scope,
  showBuilding = true,
  trailing,
}: ProjectBuildingScopeProps) {
  const { t } = useTranslation();
  const projectSheet = useRef<BottomSheetRef>(null);
  const buildingSheet = useRef<BottomSheetRef>(null);

  const pickProject = useCallback(
    (projectId: string) => {
      scope.setProject(projectId);
      projectSheet.current?.dismiss();
    },
    [scope],
  );
  const pickBuilding = useCallback(
    (buildingId: string | null) => {
      scope.setBuilding(buildingId);
      buildingSheet.current?.dismiss();
    },
    [scope],
  );

  const projectLabel = scope.project?.projectName ?? t('fm.scope.selectProject');
  const buildingLabel = scope.building?.buildingName ?? t('fm.scope.allBuildings');

  return (
    <View style={styles.row}>
      <View style={styles.chips}>
        <PickerChip
          label={projectLabel}
          placeholder={!scope.project}
          disabled={scope.projects.length === 0}
          accessibilityLabel={t('fm.scope.projectA11y', { value: projectLabel })}
          onPress={() => projectSheet.current?.present()}
        />
        {showBuilding ? (
          <PickerChip
            label={buildingLabel}
            placeholder={!scope.building}
            disabled={!scope.project}
            accessibilityLabel={t('fm.scope.buildingA11y', { value: buildingLabel })}
            onPress={() => buildingSheet.current?.present()}
          />
        ) : null}
      </View>
      {trailing}

      <BottomSheet ref={projectSheet} scrollable snapPoints={['50%', '85%']}>
        <Text style={styles.sheetTitle} accessibilityRole="header">
          {t('fm.scope.project')}
        </Text>
        {scope.projects.map((p) => (
          <OptionRow
            key={p.projectId}
            label={p.projectName}
            selected={p.projectId === scope.projectId}
            onPress={() => pickProject(p.projectId)}
          />
        ))}
      </BottomSheet>

      {showBuilding ? (
        <BottomSheet ref={buildingSheet} scrollable snapPoints={['50%', '85%']}>
          <Text style={styles.sheetTitle} accessibilityRole="header">
            {t('fm.scope.building')}
          </Text>
          <OptionRow
            label={t('fm.scope.allBuildings')}
            selected={!scope.buildingId}
            onPress={() => pickBuilding(null)}
          />
          {(scope.project?.buildings ?? []).map((b) => (
            <OptionRow
              key={b.buildingId}
              label={b.buildingName}
              selected={b.buildingId === scope.buildingId}
              onPress={() => pickBuilding(b.buildingId)}
            />
          ))}
        </BottomSheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
    paddingHorizontal: theme.spacing[16],
    paddingVertical: theme.spacing[8],
    backgroundColor: theme.colors.bg,
  },
  chips: { flex: 1, flexDirection: 'row', gap: theme.spacing[8] },
  chip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[6],
    minHeight: 44,
    paddingHorizontal: theme.spacing[12],
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  chipText: {
    flexShrink: 1,
    fontSize: theme.type.label.lg.size,
    lineHeight: theme.type.label.lg.lineHeight,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  chipPlaceholder: { color: theme.colors.textSecondary },
  sheetTitle: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[8],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[12],
    minHeight: 48,
    paddingVertical: theme.spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderHairline,
  },
  optionText: {
    flex: 1,
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textPrimary,
  },
}));
