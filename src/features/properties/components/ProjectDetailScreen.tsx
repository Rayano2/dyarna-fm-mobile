import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';
import { ShellHeader } from '@/features/shell';
import { useQueryErrorToast } from '@/shared/hooks/useQueryErrorToast';
import { Chip, ChipRow, EmptyState, Screen, Skeleton, type BottomSheetRef } from '@/shared/ui';
import type { PropertyBuilding } from '../api/mappers';
import { usePropertiesList } from '../hooks/useProperties';
import { filterUnits, type UnitFilter } from '../lib/occupancy';
import { AddUnitSheet } from './AddUnitSheet';
import { BuildingSection } from './BuildingSection';

const UNIT_FILTERS: readonly { value: UnitFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'fm.properties.filterAll' },
  { value: 'occupied', labelKey: 'fm.properties.filterOccupied' },
  { value: 'vacant', labelKey: 'fm.properties.filterVacant' },
];

export function ProjectDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const query = usePropertiesList();
  useQueryErrorToast(query.error, query.errorUpdatedAt);
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [addTo, setAddTo] = useState<PropertyBuilding | null>(null);
  const [addOpenCount, setAddOpenCount] = useState(0);
  const addSheet = useRef<BottomSheetRef>(null);

  const project = useMemo(
    () => query.data?.find((p) => String(p.projectId) === params.projectId),
    [query.data, params.projectId],
  );

  const toggle = useCallback((buildingCode: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(buildingCode)) next.delete(buildingCode);
      else next.add(buildingCode);
      return next;
    });
  }, []);
  const openAddUnit = useCallback((building: PropertyBuilding) => {
    setAddTo(building);
    setAddOpenCount((n) => n + 1);
    addSheet.current?.present();
  }, []);

  const renderBody = (): React.ReactNode => {
    if (query.isLoading) {
      return (
        <View style={styles.content}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={140} radius={16} />
          ))}
        </View>
      );
    }
    if (query.isError && !query.data) {
      return (
        <EmptyState
          title={t('fm.properties.loadFailed')}
          cta={{ label: t('common.retry'), onPress: () => void query.refetch() }}
        />
      );
    }
    if (!project) return <EmptyState title={t('fm.properties.projectNotFound')} />;
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
      >
        <ChipRow>
          {UNIT_FILTERS.map((f) => (
            <Chip
              key={f.value}
              label={t(f.labelKey)}
              selected={unitFilter === f.value}
              onPress={() => setUnitFilter(f.value)}
            />
          ))}
        </ChipRow>
        {project.buildings.length === 0 ? (
          <EmptyState title={t('fm.properties.noBuildings')} />
        ) : (
          project.buildings.map((building) => (
            <BuildingSection
              key={building.buildingCode}
              building={building}
              units={filterUnits(building.units, unitFilter)}
              expanded={!collapsed.has(building.buildingCode)}
              onToggle={toggle}
              onAddUnit={openAddUnit}
            />
          ))
        )}
      </ScrollView>
    );
  };

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-property-detail-screen">
      <ShellHeader
        title={project?.projectName || t('fm.nav.properties')}
        showBack
        showBell={false}
      />
      {renderBody()}
      <AddUnitSheet
        ref={addSheet}
        buildingCode={addTo?.buildingCode ?? null}
        buildingName={addTo?.buildingName}
        openCount={addOpenCount}
        onDismiss={() => setAddTo(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: {
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[96],
    gap: theme.spacing[16],
  },
}));
