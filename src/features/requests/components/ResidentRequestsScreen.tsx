import { useCallback, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  SegmentedPill,
  Skeleton,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import { FilterButton, FilterSheet } from '@/shared/ui/FilterSheet';
import type { ResidentRequest } from '../api/mappers';
import { useResidentRequests } from '../hooks/useResidentRequests';
import { filterRequestsBySearch } from '../lib/search';
import { ApproveSheet } from './ApproveSheet';
import { RejectSheet } from './RejectSheet';
import { RequestCard } from './RequestCard';

type StatusSegment = 'PENDING' | 'ALL';

function RequestsSkeleton(): React.JSX.Element {
  return (
    <View style={styles.skeletons}>
      <Skeleton height={220} radius={16} />
      <Skeleton height={220} radius={16} />
      <Skeleton height={220} radius={16} />
    </View>
  );
}

export function ResidentRequestsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const rtlText = useRtlTextStyle();
  const tabBar = useOptionalTabBarHide();
  const [segment, setSegment] = useState<StatusSegment>('PENDING');
  const [filter, setFilter] = useState<ProjectBuildingFilter>(EMPTY_PROJECT_BUILDING_FILTER);
  const [search, setSearch] = useState('');
  const [approving, setApproving] = useState<ResidentRequest | null>(null);
  const [rejecting, setRejecting] = useState<ResidentRequest | null>(null);
  const filterSheet = useRef<BottomSheetRef>(null);
  const approveSheet = useRef<BottomSheetRef>(null);
  const rejectSheet = useRef<BottomSheetRef>(null);

  const filterOptions = useProjectsBuildingsFilter();
  const query = useResidentRequests({
    status: segment === 'PENDING' ? 'PENDING' : null,
    projectId: filter.projectId,
    buildingCode: filter.buildingCode,
  });
  useQueryErrorToast(query.error, query.errorUpdatedAt);

  const loaded = useMemo(() => query.data?.pages.flatMap((p) => p.content) ?? [], [query.data]);
  const visible = useMemo(() => filterRequestsBySearch(loaded, search), [loaded, search]);
  const filterCount = activeFilterCount(filter);
  const isFiltered = filterCount > 0 || search.trim().length > 0;

  const onApprove = useCallback((request: ResidentRequest) => {
    setApproving(request);
    approveSheet.current?.present();
  }, []);
  const onReject = useCallback((request: ResidentRequest) => {
    setRejecting(request);
    rejectSheet.current?.present();
  }, []);
  const clearFilters = (): void => {
    setFilter(EMPTY_PROJECT_BUILDING_FILTER);
    setSearch('');
  };

  const empty = query.isError ? (
    <EmptyState
      title={t('fm.requests.loadFailed')}
      cta={{ label: t('fm.requests.retry'), onPress: () => void query.refetch() }}
    />
  ) : isFiltered ? (
    <EmptyState
      title={t('fm.requests.emptyFiltered')}
      cta={{ label: t('fm.requests.clearFilters'), onPress: clearFilters }}
    />
  ) : (
    <EmptyState title={t('fm.requests.empty')} />
  );

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-requests-screen">
      <ShellHeader title={t('fm.requests.title')} />
      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder={t('fm.requests.searchPlaceholder')}
              clearLabel={t('common.clear')}
            />
          </View>
          <FilterButton
            count={filterCount}
            label={t('fm.requests.filterTitle')}
            onPress={() => filterSheet.current?.present()}
          />
        </View>
        <SegmentedPill<StatusSegment>
          fullWidth
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'PENDING', label: t('fm.requests.statusPending') },
            { value: 'ALL', label: t('fm.requests.statusAll') },
          ]}
        />
        {search.trim() ? (
          <Text style={[styles.hint, rtlText]}>{t('fm.requests.searchLoadedHint')}</Text>
        ) : null}
      </View>
      <PagedList
        data={visible}
        keyExtractor={(item) => String(item.requestId)}
        renderItem={({ item }) => (
          <RequestCard request={item} onApprove={onApprove} onReject={onReject} />
        )}
        loading={query.isLoading}
        skeleton={<RequestsSkeleton />}
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
        labels={{
          title: t('fm.requests.filterTitle'),
          project: t('fm.requests.project'),
          building: t('fm.requests.building'),
          allProjects: t('fm.requests.allProjects'),
          allBuildings: t('fm.requests.allBuildings'),
          chooseProjectFirst: t('fm.requests.chooseProjectFirst'),
          apply: t('fm.requests.apply'),
          reset: t('fm.requests.reset'),
        }}
      />
      <ApproveSheet ref={approveSheet} request={approving} onDismiss={() => setApproving(null)} />
      <RejectSheet ref={rejectSheet} request={rejecting} onDismiss={() => setRejecting(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  controls: {
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[12],
    gap: theme.spacing[12],
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  search: { flex: 1 },
  hint: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  list: {
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[96],
    gap: theme.spacing[12],
  },
  skeletons: { paddingHorizontal: theme.spacing[16], gap: theme.spacing[12] },
}));
