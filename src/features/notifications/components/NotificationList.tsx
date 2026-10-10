import { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, EmptyState, Icons, PagedList, showApiErrorToast } from '@/shared/ui';
import { queryKeys } from '@/shared/api/query-keys';
import { goTo } from '@/shared/lib/go-to';
import { useToastStore } from '@/shared/stores/toastStore';
import type { AppNotification } from '@/types/notification';
import { useNotifications } from '../hooks/useNotifications';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount';
import { useMarkNotificationRead } from '../hooks/useMarkNotificationRead';
import { useMarkAllNotificationsRead } from '../hooks/useMarkAllNotificationsRead';
import { notificationPressAction } from '../lib/notification-meta';
import { NotificationCard } from './NotificationCard';
import { NotificationRowSkeleton } from './NotificationRowSkeleton';

const SKELETON_ROWS = [0, 1, 2, 3, 4, 5];

/**
 * The inbox body: a "Mark all read" + unread-count row, then the paged list.
 * Ported from dyarna-rn; FM routes and a toast when marking one row fails.
 */
export function NotificationList(): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const push = useToastStore((s) => s.push);
  const queryClient = useQueryClient();

  const {
    notifications,
    isLoading,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    error,
    errorUpdatedAt,
  } = useNotifications();
  const unreadQuery = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unreadQuery.data ?? 0;
  const hasRows = notifications.length > 0;

  // Returning here (e.g. from a ticket) re-checks the count. The first focus
  // is skipped: the query is already fetching on mount.
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.bms.notificationsUnreadCount });
    }, [queryClient]),
  );

  // A failed refetch must not blank a populated inbox: toast it instead.
  useEffect(() => {
    if (!error || !errorUpdatedAt || !hasRows) return;
    showApiErrorToast(push, error, t, { fallbackTitle: t('notifications.error.title') });
  }, [error, errorUpdatedAt, hasRows, push, t]);

  const markReadMutate = markRead.mutate;
  const onNotificationPress = useCallback(
    (notification: AppNotification) => {
      const action = notificationPressAction(notification);
      if (action.markRead) {
        markReadMutate(notification.id, {
          onError: (mutationError) => {
            showApiErrorToast(push, mutationError, t, {
              fallbackTitle: t('fm.notifications.markReadError'),
            });
          },
        });
      }
      if (action.destination) goTo(action.destination);
    },
    [markReadMutate, push, t],
  );

  const markAllMutate = markAllRead.mutate;
  const onMarkAllPress = useCallback(() => {
    markAllMutate(undefined, {
      onSuccess: () => {
        push({ variant: 'success', title: t('notifications.markAllDone') });
      },
      onError: (mutationError) => {
        showApiErrorToast(push, mutationError, t, {
          fallbackTitle: t('notifications.markAllError'),
        });
      },
    });
  }, [markAllMutate, push, t]);

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationCard notification={item} onPress={onNotificationPress} />
    ),
    [onNotificationPress],
  );

  const showErrorState = !!error && !hasRows && !isLoading;

  const empty = useMemo(
    () =>
      showErrorState ? (
        <EmptyState
          illustration={<Icons.Warning size={64} color={theme.colors.textMuted} weight="duotone" />}
          title={t('notifications.error.title')}
          body={t('notifications.error.body')}
          cta={{ label: t('fm.notifications.retry'), onPress: refetch }}
        />
      ) : (
        <EmptyState
          illustration={
            <Icons.Bell size={64} color={theme.colors.primaryDisabled} weight="duotone" />
          }
          title={t('notifications.empty.title')}
          body={t('notifications.empty.body')}
        />
      ),
    [showErrorState, theme, t, refetch],
  );

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View accessibilityLiveRegion="polite">
          <Text style={styles.unreadText}>
            {t('notifications.unreadCount', { count: unreadCount })}
          </Text>
        </View>
        <Button
          label={t('notifications.markAllRead')}
          onPress={onMarkAllPress}
          variant="ghost"
          size="sm"
          fullWidth={false}
          loading={markAllRead.isPending}
          disabled={unreadCount === 0 || markAllRead.isPending}
          leadingIcon={<Icons.Check size={16} color={theme.colors.primary} weight="bold" />}
          // size="sm" is 40px tall; the slop clears the 44px minimum.
          hitSlop={8}
        />
      </View>

      <PagedList
        data={notifications}
        keyExtractor={(notification) => notification.id}
        renderItem={renderItem}
        loading={isLoading && !hasRows}
        skeleton={
          <View style={styles.skeletonList}>
            {SKELETON_ROWS.map((row) => (
              <NotificationRowSkeleton key={row} />
            ))}
          </View>
        }
        empty={empty}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[8],
  },
  unreadText: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  listContent: {
    paddingHorizontal: theme.spacing[16],
    paddingTop: theme.spacing[4],
    // Clears the absolutely positioned tab bar.
    paddingBottom: theme.spacing[96],
    gap: theme.spacing[12],
  },
  skeletonList: {
    paddingHorizontal: theme.spacing[16],
    gap: theme.spacing[12],
  },
}));
