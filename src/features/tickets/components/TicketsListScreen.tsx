import { useCallback, useMemo, useRef } from 'react';
import { Text, View, type ListRenderItem } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { ShellHeader, useOptionalTabBarHide } from '@/features/shell';
import { useProjectsBuildingsFilter } from '@/shared/hooks/useProjectsBuildingsFilter';
import { useQueryErrorToast } from '@/shared/hooks/useQueryErrorToast';
import { Button, EmptyState, PagedList, Screen, type BottomSheetRef } from '@/shared/ui';
import { useTickets } from '../hooks/useTickets';
import {
  activeFilterCount,
  hasAnyFilter,
  useTicketFiltersStore,
} from '../lib/ticket-filters-store';
import type { FmTicket } from '../types';
import { FilterChipSummary } from './FilterChipSummary';
import { FmTicketCard } from './FmTicketCard';
import { useSlaTickerWhileFocused } from './SlaChip';
import { TicketFilterSheet } from './TicketFilterSheet';
import { TicketRowSkeleton } from './TicketRowSkeleton';
import { TicketSearchRow } from './TicketSearchRow';
import { TicketSortSheet } from './TicketSortSheet';

/** List rows plus one trailing footer row (PagedList has no footer slot of its own). */
type Row = { kind: 'ticket'; ticket: FmTicket } | { kind: 'footer'; variant: 'error' | 'end' };

const SKELETON_ROWS = [0, 1, 2, 3];

export function ticketDetailHref(ticketNumber: string): string {
  return `/tickets/${encodeURIComponent(ticketNumber)}`;
}

export function TicketsListScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const tabBar = useOptionalTabBarHide();
  useSlaTickerWhileFocused();

  const filters = useTicketFiltersStore((s) => s.filters);
  const store = useTicketFiltersStore.getState;
  const filterSheet = useRef<BottomSheetRef>(null);
  const sortSheet = useRef<BottomSheetRef>(null);

  const list = useTickets(filters);
  const projectsQuery = useProjectsBuildingsFilter();
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  useQueryErrorToast(list.error, list.errorUpdatedAt);

  const isInitialLoading = list.isPending;
  const hasData = list.tickets.length > 0;
  const firstPageFailed = list.isError && !list.data;

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = list.tickets.map((ticket) => ({ kind: 'ticket', ticket }));
    if (out.length === 0) return out;
    if (list.isFetchNextPageError) out.push({ kind: 'footer', variant: 'error' });
    else if (!list.hasNextPage) out.push({ kind: 'footer', variant: 'end' });
    return out;
  }, [list.tickets, list.isFetchNextPageError, list.hasNextPage]);

  const fetchedAt = list.dataUpdatedAt;
  const openTicket = useCallback((ticket: FmTicket) => {
    router.push(ticketDetailHref(ticket.tktNumber) as never);
  }, []);
  const { fetchNextPage, refetch } = list;

  const renderItem = useCallback<ListRenderItem<Row>>(
    ({ item }) => {
      if (item.kind === 'ticket') {
        return <FmTicketCard ticket={item.ticket} fetchedAt={fetchedAt} onPress={openTicket} />;
      }
      if (item.variant === 'error') {
        return (
          <View style={styles.footer}>
            <Button
              label={t('fm.tickets.error.more')}
              variant="ghost"
              onPress={() => void fetchNextPage()}
            />
          </View>
        );
      }
      return (
        <View style={styles.footer}>
          <Text style={styles.endHint}>{t('fm.tickets.endOfList')}</Text>
        </View>
      );
    },
    [fetchedAt, openTicket, fetchNextPage, t],
  );

  const filtered = hasAnyFilter(filters);
  const empty = useMemo(() => {
    if (firstPageFailed) {
      return (
        <EmptyState
          title={t('fm.tickets.error.load')}
          cta={{ label: t('common.retry'), onPress: () => void refetch() }}
        />
      );
    }
    return (
      <EmptyState
        title={filtered ? t('fm.tickets.empty.filtered') : t('fm.tickets.empty.title')}
        {...(filtered
          ? { cta: { label: t('fm.tickets.clearFilters'), onPress: () => store().clearAll() } }
          : {})}
      />
    );
  }, [firstPageFailed, filtered, refetch, store, t]);

  const skeleton = useMemo(
    () => (
      <View style={styles.listContent}>
        {SKELETON_ROWS.map((i) => (
          <TicketRowSkeleton key={i} />
        ))}
      </View>
    ),
    [],
  );

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-tickets-screen">
      <ShellHeader title={t('fm.tickets.title')} />
      <TicketSearchRow
        value={filters.ticketNo}
        onSubmit={(v) => store().setTicketNo(v)}
        filterCount={activeFilterCount(filters)}
        onFilterPress={() => filterSheet.current?.present()}
        onSortPress={() => sortSheet.current?.present()}
        disabled={isInitialLoading}
      />
      <FilterChipSummary
        filters={filters}
        projects={projects}
        onClearStatus={() => store().clearStatus()}
        onClearProject={() => store().clearProject()}
        onClearBuilding={() => store().clearBuilding()}
        onClearSearch={() => store().setTicketNo('')}
        onClearAll={() => store().clearAll()}
      />
      <View style={styles.fill}>
        <PagedList<Row>
          data={rows}
          renderItem={renderItem}
          keyExtractor={(row) =>
            row.kind === 'ticket' ? row.ticket.tktNumber : `footer-${row.variant}`
          }
          loading={isInitialLoading}
          skeleton={skeleton}
          empty={empty}
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          onRefresh={() => void list.refetch()}
          contentContainerStyle={styles.listContent}
          scrollHandler={tabBar?.scrollHandler}
          // A failed page waits for the inline retry instead of re-firing on every scroll.
          fetchNextPage={list.isFetchNextPageError ? undefined : () => void fetchNextPage()}
          hasNextPage={hasData && list.hasNextPage}
          isFetchingNextPage={list.isFetchingNextPage}
        />
      </View>
      <TicketFilterSheet
        ref={filterSheet}
        filters={filters}
        projects={projects}
        projectsLoading={projectsQuery.isPending}
        onApply={(next) => store().applyFilters(next)}
      />
      <TicketSortSheet
        ref={sortSheet}
        field={filters.sortField}
        dir={filters.sortDir}
        onApply={(field, dir) => store().setSort(field, dir)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  fill: { flex: 1 },
  listContent: {
    gap: theme.spacing[12],
    paddingHorizontal: theme.spacing[16],
    paddingTop: theme.spacing[4],
    // Clears the absolutely positioned tab bar.
    paddingBottom: theme.spacing[96],
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[16],
  },
  endHint: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textMuted,
  },
}));
