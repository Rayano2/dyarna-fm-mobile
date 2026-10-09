import { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ShellHeader } from '@/features/shell';
import {
  ActionSheet,
  ProjectBuildingScope,
  ScopeGate,
  confirmAction,
  useScope,
  type ActionSheetAction,
} from '@/features/scope';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  EmptyState,
  HapticPressable,
  Icons,
  PagedList,
  Screen,
  showApiErrorToast,
  type BottomSheetRef,
} from '@/shared/ui';
import type { Announcement } from '../api/announcements-api';
import {
  useAnnouncements,
  useDeleteAnnouncement,
  usePinAnnouncement,
} from '../hooks/useAnnouncements';
import { AnnouncementCard, AnnouncementRowSkeleton } from './AnnouncementCard';
import { AnnouncementComposeSheet } from './AnnouncementComposeSheet';

const SKELETON_ROWS = [0, 1, 2, 3];

export function AnnouncementsScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const push = useToastStore((s) => s.push);
  const scope = useScope();
  const projectId = scope.projectId;

  const list = useAnnouncements(projectId);
  const pin = usePinAnnouncement();
  const remove = useDeleteAnnouncement();
  const composeRef = useRef<BottomSheetRef>(null);
  const menuRef = useRef<BottomSheetRef>(null);
  const [menuFor, setMenuFor] = useState<Announcement | null>(null);

  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const busyId = pin.isPending
    ? pin.variables?.id
    : remove.isPending
      ? remove.variables?.id
      : undefined;

  const openMenu = useCallback((a: Announcement) => {
    setMenuFor(a);
    menuRef.current?.present();
  }, []);

  const togglePin = (a: Announcement): void => {
    if (!projectId) return;
    const next = !a.isPinned;
    pin.mutate(
      { projectId, id: a.id, isPinned: next },
      {
        onSuccess: () =>
          push({
            variant: 'success',
            title: next ? t('fm.announcements.pinnedToast') : t('fm.announcements.unpinnedToast'),
          }),
        onError: (error) =>
          showApiErrorToast(push, error, t, { fallbackTitle: t('fm.announcements.actionFailed') }),
      },
    );
  };

  const confirmDelete = (a: Announcement): void => {
    if (!projectId) return;
    confirmAction({
      title: t('fm.announcements.delete'),
      message: t('fm.announcements.deleteConfirm'),
      confirmLabel: t('fm.announcements.deleteAction'),
      cancelLabel: t('common.cancel'),
      onConfirm: () =>
        remove.mutate(
          { projectId, id: a.id },
          {
            onSuccess: () => push({ variant: 'success', title: t('fm.announcements.deleted') }),
            onError: (error) =>
              showApiErrorToast(push, error, t, {
                fallbackTitle: t('fm.announcements.actionFailed'),
              }),
          },
        ),
    });
  };

  const actions: ActionSheetAction[] = menuFor
    ? [
        {
          key: 'pin',
          label: menuFor.isPinned ? t('fm.announcements.unpin') : t('fm.announcements.pin'),
          icon: Icons.PushPin,
          onPress: () => togglePin(menuFor),
        },
        {
          key: 'delete',
          label: t('fm.announcements.delete'),
          icon: Icons.Trash,
          destructive: true,
          onPress: () => confirmDelete(menuFor),
        },
      ]
    : [];

  const addButton = (
    <HapticPressable
      onPress={() => composeRef.current?.present()}
      disabled={!projectId}
      accessibilityRole="button"
      accessibilityLabel={t('fm.announcements.new')}
      accessibilityState={{ disabled: !projectId }}
      hitSlop={4}
      style={styles.add}
    >
      <Icons.Plus size={22} color={theme.colors.textOnPrimary} weight="bold" />
    </HapticPressable>
  );

  const body: React.ReactNode =
    list.isError && items.length === 0 ? (
      <View style={styles.center}>
        <EmptyState
          title={t('common.error')}
          cta={{ label: t('common.retry'), onPress: () => void list.refetch() }}
        />
      </View>
    ) : (
      <PagedList
        data={items}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <AnnouncementCard announcement={item} busy={busyId === item.id} onMenu={openMenu} />
        )}
        loading={list.isLoading}
        skeleton={
          <View style={styles.listContent}>
            {SKELETON_ROWS.map((i) => (
              <AnnouncementRowSkeleton key={i} />
            ))}
          </View>
        }
        empty={
          <EmptyState
            title={t('fm.announcements.empty')}
            body={t('fm.announcements.emptyDesc')}
            cta={{ label: t('fm.announcements.new'), onPress: () => composeRef.current?.present() }}
          />
        }
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        fetchNextPage={() => void list.fetchNextPage()}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        contentContainerStyle={styles.listContent}
      />
    );

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-announcements-screen">
      <ShellHeader title={t('fm.announcements.title')} showBack />
      <ProjectBuildingScope scope={scope} showBuilding={false} trailing={addButton} />
      <ScopeGate scope={scope}>{body}</ScopeGate>
      <AnnouncementComposeSheet
        ref={composeRef}
        projectId={projectId}
        projectName={scope.project?.projectName}
      />
      <ActionSheet ref={menuRef} {...(menuFor ? { title: menuFor.title } : {})} actions={actions} />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  add: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, justifyContent: 'center' },
  // Clears the absolutely positioned tab bar.
  listContent: {
    padding: theme.spacing[16],
    paddingBottom: theme.spacing[96],
    gap: theme.spacing[12],
  },
}));
