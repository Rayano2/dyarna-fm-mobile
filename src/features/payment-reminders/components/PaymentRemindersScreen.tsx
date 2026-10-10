import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { filterResidentsBySearch, useResidents } from '@/features/residents';
import { useProjectsBuildingsFilter } from '@/shared/hooks/useProjectsBuildingsFilter';
import { ltr } from '@/shared/lib/bidi';
import {
  activeFilterCount,
  EMPTY_PROJECT_BUILDING_FILTER,
  type ProjectBuildingFilter,
} from '@/shared/lib/project-building-filter';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  Badge,
  Button,
  Card,
  ComposeScaffold,
  DatePickerModal,
  EmptyState,
  FormTextArea,
  HapticPressable,
  Icons,
  Input,
  RiyalSymbol,
  SearchBar,
  Skeleton,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import { FilterButton, FilterSheet } from '@/shared/ui/FilterSheet';
import type { PaymentReminderQueued, PaymentReminderTargetMode } from '../api/mappers';
import { usePaymentReminderStatus, useSendPaymentReminder } from '../hooks/usePaymentReminders';
import {
  buildPaymentReminderPayload,
  dedupeResidents,
  deriveTargetMode,
  isDueDateInPast,
  isDueDateRejection,
  isTerminalStatus,
  parseAmount,
  REMINDER_CURRENCY,
  startOfLocalDay,
  toggleSelection,
} from '../lib/payment-reminders-logic';
import { ConfirmSendSheet } from './ConfirmSendSheet';
import { ReminderProgressCard } from './ReminderProgressCard';
import { SelectableResidentRow } from './SelectableResidentRow';

const MODE_COPY: Record<PaymentReminderTargetMode, { label: string; hint: string }> = {
  ALL: { label: 'fm.paymentReminders.modeAll', hint: 'fm.paymentReminders.modeHintAll' },
  FILTERED: {
    label: 'fm.paymentReminders.modeFiltered',
    hint: 'fm.paymentReminders.modeHintFiltered',
  },
  SELECTED: {
    label: 'fm.paymentReminders.modeSelected',
    hint: 'fm.paymentReminders.modeHintSelected',
  },
};

const pad2 = (n: number): string => String(n).padStart(2, '0');
/** Numeric dd/MM/yyyy, shown LTR (web parity with its confirm dialog). */
const displayDate = (d: Date): string =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

function sameFilter(a: ProjectBuildingFilter, b: ProjectBuildingFilter): boolean {
  return a.projectId === b.projectId && a.buildingCode === b.buildingCode;
}

export function PaymentRemindersScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const push = useToastStore((s) => s.push);
  const filterSheet = useRef<BottomSheetRef>(null);
  const confirmSheet = useRef<BottomSheetRef>(null);

  // Audience
  const [filter, setFilter] = useState<ProjectBuildingFilter>(EMPTY_PROJECT_BUILDING_FILTER);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());

  // Compose
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [dueDateServerRejected, setDueDateServerRejected] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Send
  const [sendId, setSendId] = useState<string | null>(null);
  const [queued, setQueued] = useState<PaymentReminderQueued | null>(null);
  const toastedSendId = useRef<string | null>(null);

  const filterOptions = useProjectsBuildingsFilter();
  const residents = useResidents({
    projectId: filter.projectId,
    buildingCode: filter.buildingCode,
  });
  const sendMutation = useSendPaymentReminder();
  const poll = usePaymentReminderStatus(sendId);
  const sendStatus = poll.query.data;

  const loaded = useMemo(
    () => dedupeResidents(residents.data?.pages.flatMap((p) => p.content) ?? []),
    [residents.data],
  );
  const visible = useMemo(() => filterResidentsBySearch(loaded, search), [loaded, search]);
  const total = residents.data?.pages[0]?.totalElements;
  const filterCount = activeFilterCount(filter);
  const hasFilter = filterCount > 0;

  const targetMode = deriveTargetMode(selected.size, filter);
  // SELECTED is exact client-side; ALL / FILTERED use the server total, since the
  // list is paged. Undefined means "still counting".
  const recipientCount = selected.size > 0 ? selected.size : total;

  const complete = isTerminalStatus(sendStatus?.status);
  const inFlight = sendId !== null && !complete && !poll.stopped;
  const locked = sendMutation.isPending || inFlight;

  const amountValid = parseAmount(amount) !== null;
  const dueDateInPast = dueDate !== undefined && isDueDateInPast(dueDate);
  const payload = useMemo(
    () =>
      buildPaymentReminderPayload({
        selectedUserIds: selected,
        filter,
        title,
        message,
        amount,
        dueDate,
      }),
    [selected, filter, title, message, amount, dueDate],
  );
  const canSend = payload !== null && !locked && recipientCount !== undefined && recipientCount > 0;

  // Completion toast, once per send.
  useEffect(() => {
    if (!sendStatus || !isTerminalStatus(sendStatus.status)) return;
    if (toastedSendId.current === sendStatus.sendId) return;
    toastedSendId.current = sendStatus.sendId;
    if ((sendStatus.failedCount ?? 0) === 0) {
      push({
        variant: 'success',
        title: t('fm.paymentReminders.successTitle'),
        body: t('fm.paymentReminders.successMessage', { count: sendStatus.sentCount ?? 0 }),
      });
    } else {
      push({ variant: 'warning', title: t('fm.paymentReminders.partialTitle') });
    }
  }, [sendStatus, push, t]);

  const applyFilter = useCallback(
    (next: ProjectBuildingFilter) => {
      if (sameFilter(next, filter)) return;
      setFilter(next);
      // A different audience: ticked residents may no longer be in it.
      setSelected(new Set());
    },
    [filter],
  );

  const clearFilters = (): void => {
    applyFilter(EMPTY_PROJECT_BUILDING_FILTER);
    setSearch('');
  };

  const toggle = useCallback(
    (userId: string) => setSelected((s) => toggleSelection(s, userId)),
    [],
  );

  const dismissConfirm = (): void => confirmSheet.current?.dismiss();

  const onConfirm = (): void => {
    if (!payload) return;
    setDueDateServerRejected(false);
    sendMutation.mutate(payload, {
      onSuccess: (result) => {
        setQueued(result);
        setSendId(result.sendId);
        dismissConfirm();
      },
      onError: (error) => {
        // Form values are kept so the FM can retry.
        dismissConfirm();
        const dueDateRejected = isDueDateRejection(error);
        if (dueDateRejected) setDueDateServerRejected(true);
        push({
          variant: 'error',
          title: t('fm.paymentReminders.errorTitle'),
          body: t(
            dueDateRejected
              ? 'fm.paymentReminders.dueDateInPast'
              : 'fm.paymentReminders.errorMessage',
          ),
        });
      },
    });
  };

  const newReminder = (): void => {
    setSendId(null);
    setQueued(null);
    setTitle('');
    setMessage('');
    setAmount('');
    setAmountTouched(false);
    setDueDate(undefined);
    setDueDateServerRejected(false);
    setSelected(new Set());
    sendMutation.reset();
  };

  const mode = MODE_COPY[targetMode];
  const showDueDateError = dueDateInPast || dueDateServerRejected;
  const searchOrFilter = hasFilter || search.trim().length > 0;

  const recipientsLine =
    recipientCount === undefined
      ? t('fm.paymentReminders.recipientsCountLoading')
      : recipientCount === 0
        ? t('fm.paymentReminders.noRecipients')
        : t('fm.paymentReminders.recipientsCount', { count: recipientCount });

  let list: React.ReactNode;
  if (residents.isLoading) {
    list = (
      <View style={styles.skeletons}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={48} radius={12} />
        ))}
      </View>
    );
  } else if (residents.isError) {
    list = (
      <EmptyState
        title={t('fm.paymentReminders.loadResidentsError')}
        cta={{ label: t('common.retry'), onPress: () => void residents.refetch() }}
      />
    );
  } else if (visible.length === 0) {
    list = searchOrFilter ? (
      <EmptyState
        title={t('fm.paymentReminders.noResidentsForFilter')}
        body={t('fm.paymentReminders.noResidentsForFilterDescription')}
        cta={{ label: t('fm.paymentReminders.clearFilters'), onPress: clearFilters }}
      />
    ) : (
      <EmptyState
        title={t('fm.paymentReminders.noResidents')}
        body={t('fm.paymentReminders.noResidentsDescription')}
      />
    );
  } else {
    // Rendered inline, not as a FlatList: ComposeScaffold already scrolls, and a
    // nested VirtualizedList would break windowing and onEndReached.
    list = (
      <View>
        {visible.map((resident) => (
          <SelectableResidentRow
            key={resident.userId}
            resident={resident}
            selected={selected.has(resident.userId)}
            disabled={locked}
            onToggle={toggle}
          />
        ))}
        {residents.hasNextPage ? (
          <Button
            label={t('fm.paymentReminders.loadMore')}
            variant="ghost"
            size="sm"
            hitSlop={4}
            loading={residents.isFetchingNextPage}
            disabled={residents.isFetchingNextPage}
            onPress={() => void residents.fetchNextPage()}
          />
        ) : null}
      </View>
    );
  }

  const today = startOfLocalDay(new Date());

  return (
    <View style={styles.screen} testID="fm-payment-reminders-screen">
      <ComposeScaffold
        title={t('fm.paymentReminders.title')}
        backAccessibilityLabel={t('common.back')}
        contentContainerStyle={styles.content}
        submitLabel={t(
          sendMutation.isPending ? 'fm.paymentReminders.sending' : 'fm.paymentReminders.send',
        )}
        onSubmit={() => confirmSheet.current?.present()}
        submitting={sendMutation.isPending}
        submitDisabled={!canSend}
      >
        <Text style={[styles.description, rtlText]}>
          {t('fm.paymentReminders.pageDescription')}
        </Text>

        {sendId === null ? null : (
          <ReminderProgressCard
            status={sendStatus}
            targetedCount={sendStatus?.totalTargeted ?? queued?.totalTargeted}
            pollStopped={poll.stopped}
            onCheckAgain={poll.resume}
            onNewReminder={newReminder}
          />
        )}

        {/* Audience */}
        <Card style={styles.card}>
          <View style={styles.searchRow}>
            <View style={styles.search}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder={t('fm.paymentReminders.searchPlaceholder')}
                clearLabel={t('common.clear')}
              />
            </View>
            <FilterButton count={filterCount} onPress={() => filterSheet.current?.present()} />
          </View>
          <Text style={[styles.muted, rtlText]}>{t('fm.paymentReminders.searchHint')}</Text>

          <View style={styles.modeRow}>
            <Badge size="sm" tone="primaryMuted" label={t(mode.label)} />
            <Text style={[styles.modeHint, rtlText]}>{t(mode.hint)}</Text>
          </View>

          {list}

          {selected.size > 0 || hasFilter ? (
            <View style={styles.clearRow}>
              {selected.size > 0 ? (
                <Button
                  label={t('fm.paymentReminders.clearSelection')}
                  variant="ghost"
                  size="sm"
                  hitSlop={4}
                  disabled={locked}
                  onPress={() => setSelected(new Set())}
                />
              ) : null}
              {hasFilter ? (
                <Button
                  label={t('fm.paymentReminders.clearFilters')}
                  variant="ghost"
                  size="sm"
                  hitSlop={4}
                  disabled={locked}
                  onPress={clearFilters}
                />
              ) : null}
            </View>
          ) : null}

          <Text style={[styles.count, rtlText]} accessibilityLiveRegion="polite">
            {recipientsLine}
          </Text>
        </Card>

        {/* Compose */}
        <Card style={styles.card}>
          <Input
            label={t('fm.paymentReminders.titleLabel')}
            placeholder={t('fm.paymentReminders.titlePlaceholder')}
            value={title}
            onChangeText={setTitle}
            maxLength={255}
            editable={!locked}
          />
          <View style={styles.field}>
            <Text style={[styles.label, rtlText]} nativeID="reminder-message-label">
              {t('fm.paymentReminders.messageLabel')}
            </Text>
            <FormTextArea
              value={message}
              onChangeText={setMessage}
              maxLength={1000}
              placeholder={t('fm.paymentReminders.messagePlaceholder')}
              accessibilityLabel={t('fm.paymentReminders.messageLabel')}
              accessibilityLabelledBy="reminder-message-label"
              editable={!locked}
              minHeight={100}
            />
          </View>
          <View style={styles.amountRow}>
            <View style={styles.amountInput}>
              <Input
                label={t('fm.paymentReminders.amountLabel')}
                value={amount}
                onChangeText={setAmount}
                onBlur={() => setAmountTouched(true)}
                keyboardType="decimal-pad"
                leadingIcon={<RiyalSymbol style={styles.riyal} />}
                error={
                  amountTouched && !amountValid
                    ? t('fm.paymentReminders.amountRequired')
                    : undefined
                }
                editable={!locked}
              />
            </View>
            <Badge
              size="md"
              tone="neutral"
              label={ltr(REMINDER_CURRENCY)}
              style={styles.currency}
              textStyle={styles.ltrText}
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, rtlText]}>{t('fm.paymentReminders.dueDateLabel')}</Text>
            <HapticPressable
              onPress={() => setPickerOpen(true)}
              disabled={locked}
              accessibilityRole="button"
              accessibilityLabel={`${t('fm.paymentReminders.dueDateLabel')}, ${
                dueDate ? displayDate(dueDate) : t('fm.paymentReminders.selectDueDate')
              }`}
              accessibilityState={{ disabled: locked }}
              style={[styles.dateField, showDueDateError ? styles.dateFieldError : null]}
            >
              <Icons.CalendarBlank size={18} color={theme.colors.textSecondary} weight="regular" />
              <Text style={[dueDate ? styles.dateValue : styles.datePlaceholder, rtlText]}>
                {dueDate ? ltr(displayDate(dueDate)) : t('fm.paymentReminders.selectDueDate')}
              </Text>
            </HapticPressable>
            {showDueDateError ? (
              <Text style={[styles.error, rtlText]} accessibilityLiveRegion="polite">
                {t('fm.paymentReminders.dueDateInPast')}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.muted, rtlText]}>{t('fm.paymentReminders.sameAmountNotice')}</Text>
        </Card>
      </ComposeScaffold>

      <DatePickerModal
        visible={pickerOpen}
        value={dueDate ?? today}
        mode="date"
        variant="centered"
        minimumDate={today}
        doneLabel={t('common.done')}
        onClose={() => setPickerOpen(false)}
        onChange={(date, type) => {
          if (type !== 'set') return;
          setDueDate(startOfLocalDay(date));
          setDueDateServerRejected(false);
        }}
      />
      <FilterSheet
        ref={filterSheet}
        value={filter}
        onApply={applyFilter}
        projects={filterOptions.data ?? []}
        loading={filterOptions.isLoading}
        error={filterOptions.isError}
        onRetry={() => void filterOptions.refetch()}
      />
      <ConfirmSendSheet
        ref={confirmSheet}
        count={recipientCount ?? 0}
        sending={sendMutation.isPending}
        onConfirm={onConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: theme.spacing[16], paddingTop: theme.spacing[8] },
  description: { fontSize: theme.type.body.md.size, color: theme.colors.textSecondary },
  card: { gap: theme.spacing[12] },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  search: { flex: 1 },
  muted: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  modeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing[8] },
  modeHint: { flex: 1, fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  skeletons: { gap: theme.spacing[8] },
  clearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8] },
  count: { fontSize: theme.type.body.sm.size, fontWeight: '600', color: theme.colors.textPrimary },
  field: { gap: theme.spacing[6] },
  label: {
    fontSize: theme.type.label.md.size,
    lineHeight: theme.type.label.md.lineHeight,
    fontWeight: theme.type.label.md.weight,
    color: theme.colors.textSecondary,
  },
  amountRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[8] },
  amountInput: { flex: 1 },
  currency: { marginTop: theme.spacing[32] },
  riyal: { fontSize: theme.type.body.lg.size, color: theme.colors.textSecondary },
  ltrText: { writingDirection: 'ltr' },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[12],
    minHeight: 56,
    paddingHorizontal: theme.spacing[16],
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  dateFieldError: { borderColor: theme.colors.error, borderWidth: 2 },
  dateValue: { flex: 1, fontSize: theme.type.body.lg.size, color: theme.colors.textPrimary },
  datePlaceholder: { flex: 1, fontSize: theme.type.body.lg.size, color: theme.colors.textMuted },
  error: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.error,
  },
}));
