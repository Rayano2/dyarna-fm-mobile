import { forwardRef, useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import type { FilterProject } from '@/shared/api/project-buildings-filter';
import {
  buildingsForProject,
  EMPTY_PROJECT_BUILDING_FILTER,
  selectBuilding,
  selectProject,
  type ProjectBuildingFilter,
} from '@/shared/lib/project-building-filter';
import { BottomSheet, type BottomSheetRef } from './BottomSheet';
import { Button } from './Button';
import { HapticPressable } from './HapticPressable';
import * as Icons from './icons';
import { RTL_INLINE, useIsRtl, useRtlTextStyle } from './useRtl';

export interface FilterSheetLabels {
  title: string;
  project: string;
  building: string;
  allProjects: string;
  allBuildings: string;
  /** Hint under the building list while no project is chosen. */
  chooseProjectFirst: string;
  apply: string;
  reset: string;
}

export interface FilterSheetProps {
  /** The applied filter. The sheet edits a draft copy until Apply. */
  value: ProjectBuildingFilter;
  onApply: (next: ProjectBuildingFilter) => void;
  projects: readonly FilterProject[];
  loading?: boolean;
  /** The options failed to load: shows an inline message with `onRetry`. */
  error?: boolean;
  onRetry?: () => void;
  /** Overrides for the shared `fm.filters.*` copy. */
  labels?: Partial<FilterSheetLabels>;
  /** Extra sections rendered above the project/building pickers (e.g. a status filter). */
  children?: React.ReactNode;
}

/** The shared `fm.filters.*` copy, with any caller overrides applied. */
function useFilterLabels(overrides: Partial<FilterSheetLabels> | undefined): FilterSheetLabels {
  const { t } = useTranslation();
  return {
    title: t('fm.filters.filterTitle'),
    project: t('fm.filters.project'),
    building: t('fm.filters.building'),
    allProjects: t('fm.filters.allProjects'),
    allBuildings: t('fm.filters.allBuildings'),
    chooseProjectFirst: t('fm.filters.chooseProjectFirst'),
    apply: t('fm.filters.apply'),
    reset: t('fm.filters.reset'),
    ...overrides,
  };
}

interface OptionRowProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function OptionRow({ label, selected, disabled = false, onPress }: OptionRowProps) {
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      scaleOnPress={1}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      style={[styles.option, selected && styles.optionSelected, disabled && styles.optionDisabled]}
    >
      <Text
        style={[
          styles.optionLabel,
          selected && styles.optionLabelSelected,
          isRtl ? RTL_INLINE : null,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {selected ? <Icons.Check size={18} color={theme.colors.primary} weight="bold" /> : null}
    </HapticPressable>
  );
}

export interface FilterButtonProps {
  /** Active filter count; shown as a badge when above zero. */
  count: number;
  /** Defaults to `fm.filters.filterTitle`. */
  label?: string;
  onPress: () => void;
}

/** The square filter trigger that sits next to a list's search bar. */
export function FilterButton({ count, label, onPress }: FilterButtonProps): React.JSX.Element {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const title = label ?? t('fm.filters.filterTitle');
  return (
    <HapticPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${title} (${count})` : title}
      hitSlop={4}
      style={styles.filterButton}
    >
      <Icons.FunnelSimple
        size={20}
        color={count > 0 ? theme.colors.primary : theme.colors.textPrimary}
        weight={count > 0 ? 'fill' : 'regular'}
      />
      {count > 0 ? (
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>{count}</Text>
        </View>
      ) : null}
    </HapticPressable>
  );
}

/**
 * Project → building filter for the FM lists. The building list only opens
 * once a project is chosen, and changing the project clears the building
 * (`selectProject`). Edits stay in a draft until Apply.
 */
export const FilterSheet = forwardRef<BottomSheetRef, FilterSheetProps>(function FilterSheet(
  {
    value,
    onApply,
    projects,
    loading = false,
    error = false,
    onRetry,
    labels: overrides,
    children,
  },
  ref,
) {
  const { t } = useTranslation();
  const rtlText = useRtlTextStyle();
  const labels = useFilterLabels(overrides);
  const [draft, setDraft] = useState<ProjectBuildingFilter>(value);

  // Re-seed the draft from the applied value every time the sheet opens, so a
  // dismissed (un-applied) edit never leaks into the next open.
  const onChange = useCallback(
    (index: number) => {
      if (index >= 0) setDraft(value);
    },
    [value],
  );

  const buildings = buildingsForProject(projects, draft.projectId);
  const dismiss = (): void => {
    if (ref && typeof ref !== 'function') ref.current?.dismiss();
  };

  const footer = (
    <View style={styles.footer}>
      <View style={styles.footerButton}>
        <Button
          label={labels.reset}
          variant="ghost"
          fullWidth
          onPress={() => setDraft(EMPTY_PROJECT_BUILDING_FILTER)}
        />
      </View>
      <View style={styles.footerButton}>
        <Button
          label={labels.apply}
          fullWidth
          onPress={() => {
            onApply(draft);
            dismiss();
          }}
        />
      </View>
    </View>
  );

  return (
    <BottomSheet ref={ref} snapPoints={['70%']} scrollable footer={footer} onChange={onChange}>
      <Text style={[styles.title, rtlText]} accessibilityRole="header">
        {labels.title}
      </Text>
      {children}
      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : error ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <Text style={[styles.hint, rtlText]}>{t('fm.filters.loadFailed')}</Text>
          {onRetry ? (
            <Button
              label={t('fm.filters.retry')}
              variant="secondary"
              size="sm"
              hitSlop={4}
              onPress={onRetry}
            />
          ) : null}
        </View>
      ) : (
        <>
          <Text style={[styles.section, rtlText]}>{labels.project}</Text>
          <View accessibilityRole="radiogroup" style={styles.group}>
            <OptionRow
              label={labels.allProjects}
              selected={draft.projectId === null}
              onPress={() => setDraft((d) => selectProject(d, null))}
            />
            {projects.map((p) => (
              <OptionRow
                key={p.projectId}
                label={p.projectName}
                selected={draft.projectId === p.projectId}
                onPress={() => setDraft((d) => selectProject(d, p.projectId))}
              />
            ))}
          </View>

          <Text style={[styles.section, rtlText]}>{labels.building}</Text>
          <View accessibilityRole="radiogroup" style={styles.group}>
            <OptionRow
              label={labels.allBuildings}
              selected={draft.buildingCode === null}
              disabled={draft.projectId === null}
              onPress={() => setDraft((d) => selectBuilding(d, null))}
            />
            {buildings.map((b) => (
              <OptionRow
                key={b.buildingCode}
                label={b.buildingName}
                selected={draft.buildingCode === b.buildingCode}
                onPress={() => setDraft((d) => selectBuilding(d, b.buildingCode))}
              />
            ))}
          </View>
          {draft.projectId === null ? (
            <Text style={[styles.hint, rtlText]}>{labels.chooseProjectFirst}</Text>
          ) : null}
        </>
      )}
    </BottomSheet>
  );
});

const styles = StyleSheet.create((theme) => ({
  title: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[16],
  },
  loader: { marginVertical: theme.spacing[24] },
  error: { gap: theme.spacing[8], alignItems: 'flex-start', marginVertical: theme.spacing[12] },
  section: {
    fontSize: theme.type.label.lg.size,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[8],
    marginBottom: theme.spacing[8],
  },
  group: { gap: theme.spacing[6], marginBottom: theme.spacing[12] },
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
  optionDisabled: { opacity: 0.5 },
  optionLabel: {
    flex: 1,
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
  },
  optionLabelSelected: { fontWeight: '600' },
  hint: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textMuted,
  },
  footer: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    end: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: theme.type.label.md.size,
    fontWeight: '600',
    color: theme.colors.textOnPrimary,
  },
}));
