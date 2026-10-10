import { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';
import { ShellHeader, useOptionalTabBarHide } from '@/features/shell';
import { useProjectsBuildingsFilter } from '@/shared/hooks/useProjectsBuildingsFilter';
import { useQueryErrorToast } from '@/shared/hooks/useQueryErrorToast';
import {
  activeFilterCount,
  EMPTY_PROJECT_BUILDING_FILTER,
  type ProjectBuildingFilter,
} from '@/shared/lib/project-building-filter';
import { EmptyState, PagedList, Screen, Skeleton, type BottomSheetRef } from '@/shared/ui';
import { FilterButton, FilterSheet } from '@/shared/ui/FilterSheet';
import type { PropertyProject } from '../api/mappers';
import { usePropertiesList } from '../hooks/useProperties';
import { filterProjects } from '../lib/occupancy';
import { AssignPresidentSheet } from './AssignPresidentSheet';
import { ProjectCard } from './ProjectCard';

function PropertiesSkeleton(): React.JSX.Element {
  return (
    <View style={styles.skeletons}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={140} radius={16} />
      ))}
    </View>
  );
}

export function PropertiesScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const tabBar = useOptionalTabBarHide();
  const [filter, setFilter] = useState<ProjectBuildingFilter>(EMPTY_PROJECT_BUILDING_FILTER);
  const [presidentFor, setPresidentFor] = useState<PropertyProject | null>(null);
  const filterSheet = useRef<BottomSheetRef>(null);
  const presidentSheet = useRef<BottomSheetRef>(null);

  const filterOptions = useProjectsBuildingsFilter();
  const query = usePropertiesList();
  useQueryErrorToast(query.error, query.errorUpdatedAt);

  const visible = useMemo(() => filterProjects(query.data ?? [], filter), [query.data, filter]);
  const filterCount = activeFilterCount(filter);
  const firstPageFailed = query.isError && !query.data;

  const openProject = useCallback((project: PropertyProject) => {
    router.push({
      pathname: '/properties/[projectId]',
      params: { projectId: String(project.projectId) },
    } as never);
  }, []);
  const openAssign = useCallback((project: PropertyProject) => {
    setPresidentFor(project);
    presidentSheet.current?.present();
  }, []);

  const empty = firstPageFailed ? (
    <EmptyState
      title={t('fm.properties.loadFailed')}
      cta={{ label: t('common.retry'), onPress: () => void query.refetch() }}
    />
  ) : filterCount > 0 ? (
    <EmptyState
      title={t('fm.properties.emptyFiltered')}
      cta={{
        label: t('fm.properties.clearFilters'),
        onPress: () => setFilter(EMPTY_PROJECT_BUILDING_FILTER),
      }}
    />
  ) : (
    <EmptyState title={t('fm.properties.empty')} />
  );

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-properties-screen">
      <ShellHeader title={t('fm.nav.properties')} showBack />
      <View style={styles.controls}>
        <FilterButton count={filterCount} onPress={() => filterSheet.current?.present()} />
      </View>
      <PagedList
        data={visible}
        keyExtractor={(project) => String(project.projectId)}
        renderItem={({ item }) => (
          <ProjectCard project={item} onOpen={openProject} onAssignPresident={openAssign} />
        )}
        loading={query.isLoading}
        skeleton={<PropertiesSkeleton />}
        empty={empty}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        contentContainerStyle={styles.list}
        scrollHandler={tabBar?.scrollHandler}
      />
      <FilterSheet
        ref={filterSheet}
        value={filter}
        onApply={setFilter}
        projects={filterOptions.data ?? []}
        loading={filterOptions.isLoading}
        error={filterOptions.isError}
        onRetry={() => void filterOptions.refetch()}
      />
      <AssignPresidentSheet
        ref={presidentSheet}
        project={presidentFor}
        onDismiss={() => setPresidentFor(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  controls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[12],
  },
  list: {
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[96],
    gap: theme.spacing[12],
  },
  skeletons: { paddingHorizontal: theme.spacing[16], gap: theme.spacing[12] },
}));
