import { ScrollView, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, HapticPressable, Icons } from '@/shared/ui';
import { ltr } from '../lib/ltr';
import type { FilterProject, TicketListFilters } from '../types';

export interface FilterChipSummaryProps {
  filters: TicketListFilters;
  projects: readonly FilterProject[];
  onClearStatus: () => void;
  onClearProject: () => void;
  onClearBuilding: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/** One removable pill per active filter, then "Clear all". Renders nothing when no filter is active. */
export function FilterChipSummary({
  filters,
  projects,
  onClearStatus,
  onClearProject,
  onClearBuilding,
  onClearSearch,
  onClearAll,
}: FilterChipSummaryProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  const project = projects.find((p) => p.projectId === filters.projectId);
  const building = project?.buildings.find((b) => b.buildingCode === filters.buildingCode);

  const chips: ActiveChip[] = [];
  if (filters.ticketNo) {
    chips.push({ key: 'search', label: ltr(`#${filters.ticketNo}`), onRemove: onClearSearch });
  }
  if (filters.status !== 'ALL') {
    chips.push({
      key: 'status',
      label: t(`fm.tickets.status.${filters.status}`),
      onRemove: onClearStatus,
    });
  }
  if (filters.projectId !== null) {
    chips.push({
      key: 'project',
      label: project?.projectName ?? t('fm.tickets.project'),
      onRemove: onClearProject,
    });
  }
  if (filters.buildingCode) {
    chips.push({
      key: 'building',
      label: building?.buildingName ?? filters.buildingCode,
      onRemove: onClearBuilding,
    });
  }
  if (chips.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {chips.map((chip) => (
        <HapticPressable
          key={chip.key}
          onPress={chip.onRemove}
          style={styles.chip}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('fm.tickets.a11y.removeFilter', { label: chip.label })}
        >
          <Text style={styles.chipText} numberOfLines={1}>
            {chip.label}
          </Text>
          <Icons.X size={12} color={theme.colors.primary} weight="bold" />
        </HapticPressable>
      ))}
      <Button label={t('fm.tickets.clearAll')} variant="ghost" size="sm" onPress={onClearAll} />
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[8],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[6],
    minHeight: 32,
    paddingHorizontal: theme.spacing[12],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySubtle,
    maxWidth: 220,
  },
  chipText: {
    flexShrink: 1,
    fontSize: theme.type.label.lg.size,
    fontWeight: '500',
    color: theme.colors.primary,
  },
}));
