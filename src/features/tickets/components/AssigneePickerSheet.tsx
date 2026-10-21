import { forwardRef, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  EmptyState,
  HapticPressable,
  Icons,
  RTL_INLINE,
  Skeleton,
  useIsRtl,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import { useAssignableUsers } from '../hooks/useAssignableUsers';
import { buildAssigneeRows, type AssigneeRow } from '../lib/assignee-rows';

export interface AssigneePickerSheetProps {
  ticketNumber: string;
  /** Signed-in FM (JWT `sub`); pinned first as "(Me)" only if the server lists them. */
  myId: string | null;
  /** The FM's display name, used when the server can't resolve their own. */
  myName: string | null;
  /** From the ticket detail; backs up the server's `isCurrentAssignee`. */
  currentAssigneeId: string | null;
  submitting: boolean;
  onAssign: (userId: string) => void;
}

/**
 * Assign / reassign picker (FM #110). Pick a row, then confirm. Mirrors
 * AssignPresidentSheet / ResolveTicketSheet: shared BottomSheet, title +
 * description, Cancel / confirm footer. Fetches only while open.
 */
export const AssigneePickerSheet = forwardRef<BottomSheetRef, AssigneePickerSheetProps>(
  function AssigneePickerSheet(
    { ticketNumber, myId, myName, currentAssigneeId, submitting, onAssign },
    ref,
  ) {
    const { t } = useTranslation();
    const rtlText = useRtlTextStyle();
    const [open, setOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const users = useAssignableUsers(ticketNumber, open);

    const rows = useMemo(
      () => buildAssigneeRows(users.data ?? [], myId, currentAssigneeId, myName),
      [users.data, myId, currentAssigneeId, myName],
    );
    // A refetch can drop the chosen person; the selection must not outlive it.
    const selected = rows.find((r) => r.userId === selectedId) ?? null;
    const canConfirm = !!selected && !selected.isCurrent && !submitting;

    const dismiss = (): void => {
      if (ref && typeof ref !== 'function') ref.current?.dismiss();
    };

    const footer = (
      <View style={styles.footerWrap}>
        {selected?.isCurrent ? (
          // Why Assign is disabled: picking the current assignee changes nothing.
          <Text
            style={[styles.hint, rtlText]}
            accessibilityLiveRegion="polite"
            testID="assignee-picker-current-hint"
          >
            {t('fm.tickets.assignee.alreadyAssigned')}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <View style={styles.footerButton}>
            <Button
              label={t('common.cancel')}
              variant="ghost"
              fullWidth
              disabled={submitting}
              onPress={dismiss}
              testID="assignee-picker-cancel"
            />
          </View>
          <View style={styles.footerButton}>
            <Button
              label={t('fm.tickets.assignee.confirm')}
              fullWidth
              loading={submitting}
              disabled={!canConfirm}
              onPress={() => {
                if (selected) onAssign(selected.userId);
              }}
              testID="assignee-picker-confirm"
            />
          </View>
        </View>
      </View>
    );

    const renderRow = (row: AssigneeRow): React.ReactNode => (
      <AssigneeOption
        key={row.userId}
        row={row}
        selected={selected?.userId === row.userId}
        disabled={submitting}
        onPress={() => setSelectedId(row.userId)}
      />
    );

    const renderBody = (): React.ReactNode => {
      // Rows (Me included) appear only once the list has loaded: whether I am
      // assignable is the server's call (review B1).
      let rest: React.ReactNode;
      if (users.isLoading) {
        rest = (
          <View style={styles.list} testID="assignee-picker-loading">
            <Skeleton height={56} radius={12} />
            <Skeleton height={56} radius={12} />
            <Skeleton height={56} radius={12} />
          </View>
        );
      } else if (users.isError) {
        rest = (
          <View
            style={styles.error}
            accessibilityLiveRegion="polite"
            testID="assignee-picker-error"
          >
            <Text style={[styles.hint, rtlText]}>{t('fm.tickets.assignee.loadFailed')}</Text>
            <Button
              label={t('common.retry')}
              variant="secondary"
              size="sm"
              hitSlop={4}
              onPress={() => void users.refetch()}
              testID="assignee-picker-retry"
            />
          </View>
        );
      } else if (rows.length === 0) {
        rest = (
          <View testID="assignee-picker-empty">
            <EmptyState title={t('fm.tickets.assignee.empty')} />
          </View>
        );
      } else {
        rest = rows.map((row) => renderRow(row));
      }
      return (
        <View
          style={styles.list}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('fm.tickets.assignee.title')}
        >
          {rest}
        </View>
      );
    };

    return (
      <BottomSheet
        ref={ref}
        snapPoints={['70%']}
        scrollable
        footer={footer}
        onChange={(index) => {
          if (index >= 0) setOpen(true);
        }}
        onDismiss={() => {
          setOpen(false);
          setSelectedId(null);
        }}
      >
        <View testID="assignee-picker">
          <Text style={[styles.title, rtlText]} accessibilityRole="header">
            {t('fm.tickets.assignee.title')}
          </Text>
          <Text style={[styles.description, rtlText]}>
            {t('fm.tickets.assignee.description', { number: ticketNumber })}
          </Text>
          <View style={styles.body}>{renderBody()}</View>
        </View>
      </BottomSheet>
    );
  },
);

interface AssigneeOptionProps {
  row: AssigneeRow;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}

function AssigneeOption({ row, selected, disabled, onPress }: AssigneeOptionProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const isRtl = useIsRtl();
  const baseName = row.fullName ?? t('fm.tickets.assignee.nameUnavailable');
  const name = row.isMe ? `${baseName} ${t('fm.tickets.assignee.meSuffix')}` : baseName;
  const role = t(`fm.tickets.assignee.role.${row.role}`);
  // Real initials; an unnamed person gets the blank avatar, not initials of the fallback.
  const avatarName = row.fullName;
  const a11yKey = row.isCurrent
    ? 'fm.tickets.assignee.rowA11yCurrent'
    : 'fm.tickets.assignee.rowA11y';
  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      scaleOnPress={1}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={t(a11yKey, { name, role })}
      style={[styles.option, selected && styles.optionSelected, disabled && styles.optionDisabled]}
      testID={row.isMe ? 'assignee-option-me' : `assignee-option-${row.userId}`}
    >
      <Avatar {...(avatarName ? { name: avatarName } : {})} size={36} />
      <View style={styles.optionText}>
        <Text
          style={[
            styles.optionName,
            row.fullName === null && styles.optionNameMissing,
            isRtl ? RTL_INLINE : null,
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <View style={styles.optionMeta}>
          <Badge
            label={role}
            tone={row.role === 'PRESIDENT' ? 'primarySubtle' : 'gold'}
            size="xs"
          />
          {row.isCurrent ? (
            <Text style={styles.currentText}>{t('fm.tickets.assignee.current')}</Text>
          ) : null}
        </View>
      </View>
      {row.isCurrent ? (
        <View testID={`assignee-current-${row.userId}`}>
          <Icons.CheckCircle size={22} color={theme.colors.primary} weight="fill" />
        </View>
      ) : null}
      {/* Selection is a radio mark, not colour alone (review W5). */}
      <View testID={`assignee-radio-${row.userId}${selected ? '-selected' : ''}`}>
        {selected ? (
          <Icons.RadioButton size={22} color={theme.colors.primary} weight="fill" />
        ) : (
          <Icons.Circle size={22} color={theme.colors.textMuted} weight="regular" />
        )}
      </View>
    </HapticPressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  title: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  description: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[4],
  },
  body: { marginTop: theme.spacing[16] },
  list: { gap: theme.spacing[6] },
  error: { gap: theme.spacing[8], alignItems: 'flex-start', paddingVertical: theme.spacing[8] },
  hint: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[12],
    minHeight: 56,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
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
  optionText: { flex: 1, gap: theme.spacing[4] },
  optionName: {
    fontSize: theme.type.body.md.size,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  optionNameMissing: { color: theme.colors.textMuted, fontStyle: 'italic' },
  optionMeta: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  currentText: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  footerWrap: { gap: theme.spacing[8] },
  footer: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
}));
