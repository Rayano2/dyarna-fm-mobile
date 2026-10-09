import { useCallback, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
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
import {
  EmptyState,
  PagedList,
  Screen,
  SearchBar,
  Skeleton,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import { FilterButton, FilterSheet } from '@/shared/ui/FilterSheet';
import type { Resident } from '../api/mappers';
import { useResidents } from '../hooks/useResidents';
import { filterResidentsBySearch, residentRowKey } from '../lib/residents-logic';
import { ResidentRow } from './ResidentRow';

function ResidentsSkeleton(): React.JSX.Element {
  return (
    <View style={styles.skeletons}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={72} radius={16} />
      ))}
    </View>
  );
}

export function ResidentsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const rtlText = useRtlTextStyle();
  const tabBar = useOptionalTabBarHide();
  const [filter, setFilter] = useState<ProjectBuildingFilter>(EMPTY_PROJECT_BUILDING_FILTER);
  const [search, setSearch] = useState('');
  const filterSheet = useRef<BottomSheetRef>(null);

  const filterOptions = useProjectsBuildingsFilter();
  const query = useResidents({ projectId: filter.projectId, buildingCode: filter.buildingCode });
  useQueryErrorToast(query.error, query.errorUpdatedAt);

  const loaded = useMemo(() => query.data?.pages.flatMap((p) => p.content) ?? [], [query.data]);
  const visible = useMemo(() => filterResidentsBySearch(loaded, search), [loaded, search]);
  const total = query.data?.pages[0]?.totalElements;
  const filterCount = activeFilterCount(filter);
  const isFiltered = filterCount > 0 || search.trim().length > 0;

  const openResident = useCallback((resident: Resident) => {
    router.push({
      pathname: '/residents/[id]',
      params: {
        id: resident.userId,
        ...(resident.unitResidentId === undefined
          ? {}
          : { unitResidentId: String(resident.unitResidentId) }),
        ...(resident.unitNumber ? { unit: resident.unitNumber } : {}),
        ...(resident.buildingName ? { building: resident.buildingName } : {}),
      },
    } as never);
  }, []);
  const clearFilters = (): void => {
    setFilter(EMPTY_PROJECT_BUILDING_FILTER);
    setSearch('');
  };

  const empty = query.isError ? (
    <EmptyState
      title={t('fm.residents.loadFailed')}
      cta={{ label: t('common.retry'), onPress: () => void query.refetch() }}
    />
  ) : isFiltered ? (
    <EmptyState
      title={t('fm.residents.emptyFiltered')}
      cta={{ label: t('fm.residents.clearFilters'), onPress: clearFilters }}
    />
  ) : (
    <EmptyState title={t('fm.residents.empty')} />
  );

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-residents-screen">
      <ShellHeader title={t('fm.residents.title')} showBack />
      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder={t('fm.residents.searchPlaceholder')}
              clearLabel={t('common.clear')}
            />
          </View>
          <FilterButton count={filterCount} onPress={() => filterSheet.current?.present()} />
        </View>
        {total === undefined ? null : (
          <Text style={[styles.count, rtlText]}>{t('fm.residents.count', { count: total })}</Text>
        )}
      </View>
      <PagedList
        data={visible}
        keyExtractor={residentRowKey}
        renderItem={({ item }) => <ResidentRow resident={item} onPress={openResident} />}
        loading={query.isLoading}
        skeleton={<ResidentsSkeleton />}
        empty={empty}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => void query.refetch()}
        contentContainerStyle={styles.list}
        scrollHandler={tabBar?.scrollHandler}
        fetchNextPage={() => void query.fetchNextPage()}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
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
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  controls: {
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[12],
    gap: theme.spacing[8],
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  search: { flex: 1 },
  count: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  list: {
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[96],
    gap: theme.spacing[8],
  },
  skeletons: { paddingHorizontal: theme.spacing[16], gap: theme.spacing[8] },
}));
