import { useCallback, useRef, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { withTiming } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useAuthStore } from '@/features/auth';
import { ShellHeader, useOptionalTabBarHide } from '@/features/shell';
import { openWhatsapp } from '@/shared/lib/whatsapp';
import {
  Avatar,
  Card,
  EmptyState,
  HapticPressable,
  Icons,
  Screen,
  type BottomSheetRef,
} from '@/shared/ui';
import type { ResolutionStatus } from '../api/update-status';
import { assignErrorKind } from '../api/assign-ticket';
import { useAssignTicket } from '../hooks/useAssignTicket';
import { useTicket } from '../hooks/useTicket';
import { useTicketComments } from '../hooks/useTicketComments';
import { useResolveTicket, useUpdateTicketStatus } from '../hooks/useUpdateTicketStatus';
import { ltr } from '../lib/ltr';
import {
  assigneeDisplayName,
  getActionButtons,
  getTicketAction,
  needsAssignment,
  needsTakeOverConfirm,
} from '../lib/ticket-status';
import type { FmTicketDetail } from '../types';
import { AttachmentsGallery } from './detail/AttachmentsGallery';
import { CommentsSection } from './detail/CommentsSection';
import { DetailsBlock } from './detail/DetailsBlock';
import { LoadingSkeleton } from './detail/LoadingSkeleton';
import { TicketTimeline } from './detail/TicketTimeline';
import { PriorityBadge } from './PriorityBadge';
import { AssigneePickerSheet } from './AssigneePickerSheet';
import { ResolveTicketSheet } from './ResolveTicketSheet';
import { SlaChip, useSlaTickerWhileFocused } from './SlaChip';
import { StatusBadge } from './StatusBadge';
import { TakeOverSheet } from './TakeOverSheet';
import { TicketActionBar } from './TicketActionBar';

/** Far enough to slide the tab bar fully off-screen (its own hide offset is 80). */
const TAB_BAR_HIDDEN_OFFSET = 160;

/** The detail owns the bottom edge (sticky action bar), so the tab bar slides away while it is focused. */
function useHideTabBarWhileFocused(): void {
  const tabBar = useOptionalTabBarHide();
  useFocusEffect(
    useCallback(() => {
      if (!tabBar) return;
      tabBar.translateY.value = withTiming(TAB_BAR_HIDDEN_OFFSET, { duration: 180 });
      return () => {
        tabBar.translateY.value = withTiming(0, { duration: 180 });
      };
    }, [tabBar]),
  );
}

export function TicketDetailScreen({ ticketNumber }: { ticketNumber: string }): React.JSX.Element {
  const { t } = useTranslation();
  useSlaTickerWhileFocused();
  useHideTabBarWhileFocused();
  const query = useTicket(ticketNumber);

  let body: React.ReactNode;
  if (query.isPending && ticketNumber) {
    body = (
      <View style={styles.padded}>
        <LoadingSkeleton />
      </View>
    );
  } else if (query.isNotFound || !ticketNumber) {
    body = (
      <View style={styles.center}>
        <EmptyState
          title={t('fm.tickets.notFound')}
          cta={{ label: t('common.back'), onPress: () => router.back() }}
        />
      </View>
    );
  } else if (query.isError || !query.data) {
    body = (
      <View style={styles.center}>
        <EmptyState
          title={t('fm.tickets.error.detail')}
          cta={{ label: t('common.retry'), onPress: () => void query.refetch() }}
        />
      </View>
    );
  } else {
    body = (
      // Keyed by ticket: the route stays mounted when only its param changes
      // (e.g. a notification deep link), and no state of ticket A — form,
      // resolution, open choice — may carry over to ticket B.
      <LoadedTicket
        key={query.data.tktNumber}
        ticket={query.data}
        fetchedAt={query.dataUpdatedAt}
        onRefetch={() => void query.refetch()}
      />
    );
  }

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-ticket-detail-screen">
      {/* The number is known from the route, so the header shows it before the load finishes. */}
      <ShellHeader title={ltr(`#${ticketNumber}`)} showBack showBell={false} />
      {body}
    </Screen>
  );
}

function LoadedTicket({
  ticket,
  fetchedAt,
  onRefetch,
}: {
  ticket: FmTicketDetail;
  fetchedAt: number;
  onRefetch: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const userName = useAuthStore((s) => s.user?.name ?? null);
  const comments = useTicketComments(ticket.ticketId);
  const assign = useAssignTicket(ticket.tktNumber);
  const start = useUpdateTicketStatus(ticket.tktNumber);
  const resolveSheet = useRef<BottomSheetRef>(null);
  const assigneeSheet = useRef<BottomSheetRef>(null);
  const takeOverSheet = useRef<BottomSheetRef>(null);
  const [resolution, setResolution] = useState<ResolutionStatus>('RESOLVED');
  const resolve = useResolveTicket(ticket.tktNumber, () => {
    // The hook already cleared the draft. Leaving the screen unmounts the
    // sheet; dismissing it first would race its "re-open while submitting" guard.
    router.back();
  });

  const action = getTicketAction(ticket);
  // Ticket + me only. assignable-users is fetched by the picker when it opens.
  const buttons = getActionButtons(ticket, userId);
  const thread = comments.data ?? ticket.comments;

  return (
    <>
      {/* flex:1 bounds the scroll to the space above the action bar, which
          stays pinned at the bottom instead of being pushed off-screen. */}
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badges}>
          <StatusBadge ticket={ticket} />
          <PriorityBadge code={ticket.priorityCode} />
          <SlaChip sla={ticket.sla} fetchedAt={fetchedAt} createdAt={ticket.createdAt} />
        </View>

        {needsAssignment(ticket) ? (
          <View style={styles.notice} accessible accessibilityRole="alert">
            <Icons.Warning size={20} color={theme.colors.gold} weight="fill" />
            <View style={styles.noticeText}>
              <Text style={styles.noticeTitle}>{t('fm.tickets.assignmentNeeded.title')}</Text>
              <Text style={styles.noticeBody}>{t('fm.tickets.assignmentNeeded.body')}</Text>
            </View>
          </View>
        ) : null}

        <Section title={t('fm.tickets.residentInfo')}>
          <Card padded style={styles.resident}>
            <Avatar name={ticket.residentFullName} size={44} />
            <View style={styles.residentText}>
              <Text style={styles.residentName} numberOfLines={1}>
                {ticket.residentFullName || t('fm.tickets.unknownResident')}
              </Text>
              {ticket.residentMobile ? (
                <Text style={styles.mobile}>{ltr(ticket.residentMobile)}</Text>
              ) : null}
            </View>
            {ticket.residentMobile ? (
              <View style={styles.contactButtons}>
                <ContactButton
                  label={t('fm.tickets.call')}
                  onPress={() => void Linking.openURL(`tel:${ticket.residentMobile}`)}
                  icon={<Icons.Phone size={20} color={theme.colors.primary} weight="regular" />}
                />
                <ContactButton
                  label={t('fm.tickets.whatsapp')}
                  onPress={() => void openWhatsapp(ticket.residentMobile)}
                  icon={
                    <Icons.WhatsappLogo size={20} color={theme.colors.primary} weight="regular" />
                  }
                />
              </View>
            ) : null}
          </Card>
        </Section>

        <Section title={t('fm.tickets.details')}>
          <DetailsBlock ticket={ticket} />
        </Section>

        <Section title={t('fm.tickets.description')}>
          <Text style={ticket.description ? styles.description : styles.muted}>
            {ticket.description || t('fm.tickets.noDescription')}
          </Text>
        </Section>

        <Section title={t('fm.tickets.attachments')}>
          <AttachmentsGallery attachments={ticket.attachments} onRetry={onRefetch} />
        </Section>

        <Section title={t('fm.tickets.timeline')}>
          <TicketTimeline ticket={ticket} />
        </Section>

        <Section title={t('fm.tickets.comments')}>
          <CommentsSection comments={thread} loading={comments.isPending} />
        </Section>
      </ScrollView>

      <TicketActionBar
        action={action}
        buttons={buttons}
        assigning={assign.isPending}
        starting={start.isPending}
        onAssignToMe={() => {
          // Taking a colleague's ticket asks first; unassigned is one tap.
          if (needsTakeOverConfirm(ticket, userId)) {
            takeOverSheet.current?.present();
            return;
          }
          // PATCH /assign?userId=<me>; a failure toasts from useAssignTicket.
          // The signed-in FM always has an id; guard for the type only.
          if (userId) assign.mutate(userId);
        }}
        onPickAssignee={() => assigneeSheet.current?.present()}
        onStart={() => start.mutate('IN_PROGRESS')}
        onResolve={(next) => {
          setResolution(next);
          resolveSheet.current?.present();
        }}
      />

      <TakeOverSheet
        ref={takeOverSheet}
        assigneeName={assigneeDisplayName(ticket)}
        submitting={assign.isPending}
        onConfirm={() => {
          if (!userId) return;
          // Closes either way: on error the toast from useAssignTicket explains,
          // and the refetched ticket shows who holds it now.
          assign.mutate(userId, { onSettled: () => takeOverSheet.current?.dismiss() });
        }}
      />

      <AssigneePickerSheet
        ref={assigneeSheet}
        ticketNumber={ticket.tktNumber}
        myId={userId}
        myName={userName}
        currentAssigneeId={ticket.assignedToId}
        submitting={assign.isPending}
        onAssign={(next) =>
          assign.mutate(next, {
            onSuccess: () => assigneeSheet.current?.dismiss(),
            onError: (error) => {
              // The ticket is gone or no longer assignable: nothing left to pick.
              const kind = assignErrorKind(error);
              if (kind === 'statusInvalid' || kind === 'notFound') {
                assigneeSheet.current?.dismiss();
              }
            },
          })
        }
      />

      <ResolveTicketSheet
        key={ticket.tktNumber}
        ref={resolveSheet}
        ticketId={ticket.ticketId}
        ticketNumber={ticket.tktNumber}
        resolution={resolution}
        submitting={resolve.isPending}
        onSubmit={(input) => resolve.mutate(input)}
      />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function ContactButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <HapticPressable
      onPress={onPress}
      style={styles.contactButton}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
    </HapticPressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  fill: { flex: 1 },
  padded: { padding: theme.spacing[16] },
  center: { flex: 1, justifyContent: 'center' },
  scroll: {
    padding: theme.spacing[16],
    gap: theme.spacing[20],
    paddingBottom: theme.spacing[32],
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[6], alignItems: 'center' },
  notice: {
    flexDirection: 'row',
    gap: theme.spacing[12],
    padding: theme.spacing[12],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.goldSubtle,
  },
  noticeText: { flex: 1, gap: theme.spacing[2] },
  noticeTitle: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  noticeBody: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  section: { gap: theme.spacing[8] },
  sectionTitle: {
    fontSize: theme.type.body.md.size,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  resident: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12] },
  residentText: { flex: 1, gap: theme.spacing[2] },
  residentName: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  mobile: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  contactButtons: { flexDirection: 'row', gap: theme.spacing[8] },
  contactButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textPrimary,
  },
  muted: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
}));
