import { useCallback, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  buildingsForProject,
  type ProjectBuildingFilter,
} from '@/shared/lib/project-building-filter';
import { HapticPressable, Icons, type BottomSheetRef } from '@/shared/ui';
import { FilterSheet } from '@/shared/ui/FilterSheet';
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

/**
 * Sticky project + building summary shared by the four community screens.
 * Either chip opens the shared FM `FilterSheet` with a mandatory project;
 * applied picks persist across the screens (`fmScopeStore`).
 */
export function ProjectBuildingScope({
  scope,
  showBuilding = true,
  trailing,
}: ProjectBuildingScopeProps) {
  const { t } = useTranslation();
  const sheet = useRef<BottomSheetRef>(null);
  const { project, building, setProject, setBuilding } = scope;

  const value = useMemo<ProjectBuildingFilter>(
    () => ({
      projectId: project?.projectId ?? null,
      buildingCode: building?.buildingCode ?? null,
    }),
    [project, building],
  );

  const onApply = useCallback(
    (next: ProjectBuildingFilter) => {
      if (next.projectId === null) return;
      // Changing the project clears the stored building, so set it second.
      setProject(String(next.projectId));
      const picked = buildingsForProject(scope.projects, next.projectId).find(
        (b) => b.buildingCode === next.buildingCode,
      );
      setBuilding(picked ? String(picked.buildingId) : null);
    },
    [scope.projects, setProject, setBuilding],
  );

  const open = useCallback(() => sheet.current?.present(), []);
  const projectLabel = project?.projectName ?? t('fm.scope.selectProject');
  const buildingLabel = building?.buildingName ?? t('fm.filters.allBuildings');

  return (
    <View style={styles.row}>
      <View style={styles.chips}>
        <PickerChip
          label={projectLabel}
          placeholder={!project}
          disabled={scope.projects.length === 0}
          accessibilityLabel={t('fm.scope.projectA11y', { value: projectLabel })}
          onPress={open}
        />
        {showBuilding ? (
          <PickerChip
            label={buildingLabel}
            placeholder={!building}
            disabled={!project}
            accessibilityLabel={t('fm.scope.buildingA11y', { value: buildingLabel })}
            onPress={open}
          />
        ) : null}
      </View>
      {trailing}

      <FilterSheet
        ref={sheet}
        value={value}
        onApply={onApply}
        projects={scope.projects}
        loading={scope.isLoading}
        error={scope.isError}
        onRetry={scope.refetch}
        requireProject
        showBuilding={showBuilding}
      />
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
}));
