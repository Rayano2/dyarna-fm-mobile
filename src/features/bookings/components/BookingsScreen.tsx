import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ShellHeader } from '@/features/shell';
import { ProjectBuildingScope, ScopeGate, useScope } from '@/features/scope';
import { useLocaleStore } from '@/shared/stores/localeStore';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  Button,
  Chip,
  ChipRow,
  EmptyState,
  HapticPressable,
  Icons,
  Screen,
  SegmentedPill,
  showApiErrorToast,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import {
  BOOKING_STATUSES,
  type Booking,
  type BookingQuery,
  type BookingStatus,
} from '../api/bookings-api';
import { useBookingsAgenda, useBookingsWeek, useDecideBooking } from '../hooks/useBookings';
import { countByDay } from '../lib/agenda';
import {
  addDays,
  dayKey,
  toInstantParam,
  weekDays,
  weekFetchRange,
  weekStartDay,
} from '../lib/booking-dates';
import { bookingStatusLabel } from '../lib/booking-meta';
import { BookingAgendaList, BookingRowSkeleton } from './BookingAgendaList';
import { BookingDetailSheet } from './BookingDetailSheet';
import { BookingFilterSheet, type DateRange } from './BookingFilterSheet';
import { RejectReasonSheet } from './RejectReasonSheet';
import { WeekStrip } from './WeekStrip';

type StatusFilter = BookingStatus | 'ALL';
type View_ = 'agenda' | 'week';

const DEFAULT_STATUS: StatusFilter = 'PENDING';
const SKELETON_ROWS = [0, 1, 2, 3, 4];
const STATUS_FILTERS: StatusFilter[] = [...BOOKING_STATUSES, 'ALL'];

function isStatusFilter(value: unknown): value is StatusFilter {
  return typeof value === 'string' && (STATUS_FILTERS as string[]).includes(value);
}

export function BookingsScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const locale = useLocaleStore((s) => s.locale);
  const push = useToastStore((s) => s.push);
  const params = useLocalSearchParams<{ status?: string }>();
  const scope = useScope();
  const { projectId, buildingId } = scope;

  const [view, setView] = useState<View_>('agenda');
  const [status, setStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<Booking | null>(null);

  // Deep link from Facilities ("View bookings" → status=APPROVED).
  useEffect(() => {
    if (isStatusFilter(params.status)) setStatus(params.status);
  }, [params.status]);

  const detailRef = useRef<BottomSheetRef>(null);
  const rejectRef = useRef<BottomSheetRef>(null);
  const filterRef = useRef<BottomSheetRef>(null);
  const decide = useDecideBooking();

  const statusParam = status === 'ALL' ? undefined : status;
  const agendaQuery: BookingQuery | undefined =
    projectId && view === 'agenda'
      ? {
          projectId,
          buildingId,
          status: statusParam,
          from: range.from ? toInstantParam(range.from) : undefined,
          to: range.to ? toInstantParam(range.to) : undefined,
        }
      : undefined;

  const firstDay = weekStartDay(locale);
  const days = useMemo(() => weekDays(anchor, firstDay), [anchor, firstDay]);
  const weekQuery: BookingQuery | undefined =
    projectId && view === 'week'
      ? { projectId, buildingId, status: statusParam, ...weekFetchRange(anchor, firstDay) }
      : undefined;

  const agenda = useBookingsAgenda(agendaQuery);
  const week = useBookingsWeek(weekQuery);

  const weekKeys = useMemo(() => new Set(days.map((d) => dayKey(d))), [days]);
  const weekBookings = useMemo(
    () => (week.data ?? []).filter((b) => b.startTime && weekKeys.has(dayKey(b.startTime))),
    [week.data, weekKeys],
  );
  const counts = useMemo(() => countByDay(weekBookings), [weekBookings]);

  const bookings =
    view === 'agenda'
      ? (agenda.data?.pages.flatMap((p) => p.items) ?? [])
      : selectedDay
        ? weekBookings.filter((b) => b.startTime && dayKey(b.startTime) === selectedDay)
        : weekBookings;

  const active = view === 'agenda' ? agenda : week;
  const busyId = decide.isPending ? decide.variables?.id : undefined;

  const openDetail = useCallback((booking: Booking) => {
    setSelected(booking);
    detailRef.current?.present();
  }, []);

  const approve = (booking: Booking): void => {
    decide.mutate(
      { id: booking.id, status: 'APPROVED' },
      {
        onSuccess: () => {
          push({ variant: 'success', title: t('fm.bookings.approved') });
          detailRef.current?.dismiss();
        },
        onError: (error) =>
          showApiErrorToast(push, error, t, { fallbackTitle: t('fm.bookings.approveFailed') }),
      },
    );
  };

  const startReject = (booking: Booking): void => {
    setSelected(booking);
    detailRef.current?.dismiss();
    rejectRef.current?.present();
  };

  const reject = (booking: Booking, reason: string): void => {
    decide.mutate(
      { id: booking.id, status: 'REJECTED', reason },
      {
        onSuccess: () => {
          push({ variant: 'success', title: t('fm.bookings.rejected') });
          rejectRef.current?.dismiss();
        },
        onError: (error) =>
          showApiErrorToast(push, error, t, { fallbackTitle: t('fm.bookings.rejectFailed') }),
      },
    );
  };

  const hasRange = !!range.from || !!range.to;
  const clearFilters = (): void => {
    setStatus('ALL');
    setRange({ from: null, to: null });
    scope.setBuilding(null);
    setSelectedDay(null);
  };

  const isDefaultQueue = status === DEFAULT_STATUS && !hasRange && !buildingId;
  const isUnfiltered = status === 'ALL' && !hasRange && !buildingId;
  const empty = isDefaultQueue ? (
    <EmptyState title={t('fm.bookings.queueClear')} body={t('fm.bookings.queueClearBody')} />
  ) : isUnfiltered ? (
    <EmptyState title={t('fm.bookings.empty')} />
  ) : (
    <EmptyState
      title={t('fm.bookings.emptyFilter')}
      cta={{ label: t('common.clear'), onPress: clearFilters }}
    />
  );

  const filterButton = (
    <HapticPressable
      onPress={() => filterRef.current?.present()}
      disabled={!projectId || view === 'week'}
      accessibilityRole="button"
      accessibilityLabel={t('fm.bookings.dateRange')}
      accessibilityState={{ selected: hasRange, disabled: !projectId || view === 'week' }}
      hitSlop={4}
      style={[styles.iconButton, hasRange && styles.iconButtonActive]}
    >
      <Icons.CalendarBlank
        size={22}
        color={hasRange ? theme.colors.textOnPrimary : theme.colors.textPrimary}
        weight="regular"
      />
    </HapticPressable>
  );

  const header = (
    <View style={styles.controls}>
      <SegmentedPill<View_>
        options={[
          { value: 'agenda', label: t('fm.bookings.agenda') },
          { value: 'week', label: t('fm.bookings.week') },
        ]}
        value={view}
        onChange={(next) => {
          setView(next);
          setSelectedDay(null);
        }}
        fullWidth
      />
      <ChipRow>
        {STATUS_FILTERS.map((s) => (
          <Chip
            key={s}
            label={s === 'ALL' ? t('fm.bookings.status.all') : bookingStatusLabel(s, t)}
            selected={status === s}
            onPress={() => setStatus(s)}
          />
        ))}
      </ChipRow>
      {view === 'week' ? (
        <>
          <WeekStrip
            days={days}
            counts={counts}
            selectedKey={selectedDay}
            onSelect={setSelectedDay}
            onPrev={() => {
              setAnchor((a) => addDays(a, -7));
              setSelectedDay(null);
            }}
            onNext={() => {
              setAnchor((a) => addDays(a, 7));
              setSelectedDay(null);
            }}
          />
          {status === 'ALL' ? null : (
            <View style={styles.notice}>
              <Text style={[styles.noticeText, rtlText]}>
                {t('fm.bookings.statusFilterNotice', { status: bookingStatusLabel(status, t) })}
              </Text>
              <Button
                label={t('fm.bookings.showAll')}
                variant="ghost"
                size="sm"
                onPress={() => setStatus('ALL')}
              />
            </View>
          )}
        </>
      ) : null}
    </View>
  );

  let body: React.ReactNode;
  if (active.isLoading) {
    body = (
      <View style={styles.padded}>
        {header}
        <View style={styles.skeletons}>
          {SKELETON_ROWS.map((i) => (
            <BookingRowSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  } else if (active.isError && bookings.length === 0) {
    body = (
      <View style={[styles.fill, styles.padded]}>
        {header}
        <EmptyState
          title={t('common.error')}
          cta={{ label: t('common.retry'), onPress: () => void active.refetch() }}
        />
      </View>
    );
  } else {
    body = (
      <BookingAgendaList
        bookings={bookings}
        busyId={busyId}
        onPress={openDetail}
        refreshing={active.isRefetching && !agenda.isFetchingNextPage}
        onRefresh={() => void active.refetch()}
        {...(view === 'agenda'
          ? {
              onEndReached: () => {
                if (agenda.hasNextPage && !agenda.isFetchingNextPage) void agenda.fetchNextPage();
              },
              isFetchingNextPage: agenda.isFetchingNextPage,
            }
          : {})}
        header={header}
        empty={empty}
      />
    );
  }

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-bookings-screen">
      <ShellHeader title={t('fm.bookings.title')} />
      <ProjectBuildingScope scope={scope} trailing={filterButton} />
      <ScopeGate scope={scope}>{body}</ScopeGate>

      <BookingDetailSheet
        ref={detailRef}
        booking={selected}
        approving={decide.isPending && decide.variables?.status === 'APPROVED'}
        onApprove={approve}
        onReject={startReject}
      />
      <RejectReasonSheet
        ref={rejectRef}
        booking={selected}
        submitting={decide.isPending && decide.variables?.status === 'REJECTED'}
        onSubmit={reject}
      />
      <BookingFilterSheet ref={filterRef} value={range} onChange={setRange} />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  fill: { flex: 1 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  controls: { gap: theme.spacing[8], paddingBottom: theme.spacing[8] },
  padded: { paddingHorizontal: theme.spacing[16] },
  skeletons: { gap: theme.spacing[8] },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[8],
    paddingHorizontal: theme.spacing[12],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.infoSubtle,
  },
  noticeText: { flex: 1, fontSize: theme.type.body.sm.size, color: theme.colors.textPrimary },
}));
