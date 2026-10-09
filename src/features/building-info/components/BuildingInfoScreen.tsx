import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
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
  Chip,
  ChipRow,
  EmptyState,
  HapticPressable,
  Icons,
  Screen,
  SearchBar,
  showApiErrorToast,
  type BottomSheetRef,
} from '@/shared/ui';
import type { BuildingInfoItem } from '../api/building-info-api';
import {
  useBuildingInfoManage,
  useDeleteBuildingInfo,
  useSetBuildingInfoActive,
} from '../hooks/useBuildingInfoManage';
import { filterItems, isPublished, type BuildingInfoFilter } from '../lib/building-info-meta';
import { BuildingInfoCard, BuildingInfoRowSkeleton } from './BuildingInfoCard';
import { BuildingInfoFormSheet } from './BuildingInfoFormSheet';

const FILTERS: BuildingInfoFilter[] = ['all', 'published', 'unpublished', 'expired'];
const SKELETON_ROWS = [0, 1, 2, 3, 4];

export function BuildingInfoScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const push = useToastStore((s) => s.push);
  const scope = useScope();
  const { projectId, buildingId } = scope;

  const list = useBuildingInfoManage(projectId, buildingId);
  const setActive = useSetBuildingInfoActive();
  const remove = useDeleteBuildingInfo();
  const formRef = useRef<BottomSheetRef>(null);
  const menuRef = useRef<BottomSheetRef>(null);
  const [editing, setEditing] = useState<BuildingInfoItem | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [menuFor, setMenuFor] = useState<BuildingInfoItem | null>(null);
  const [filter, setFilter] = useState<BuildingInfoFilter>('all');
  const [query, setQuery] = useState('');

  const buildingNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of scope.project?.buildings ?? []) map.set(b.buildingId, b.buildingName);
    return map;
  }, [scope.project]);

  const all = useMemo(() => list.data ?? [], [list.data]);
  const items = useMemo(() => filterItems(all, filter, query), [all, filter, query]);
  const filtered = filter !== 'all' || query.trim().length > 0;
  const busyId = setActive.isPending
    ? setActive.variables?.id
    : remove.isPending
      ? remove.variables?.id
      : undefined;

  const openForm = useCallback((item: BuildingInfoItem | null) => {
    setEditing(item);
    setOpenCount((n) => n + 1);
    formRef.current?.present();
  }, []);

  const openMenu = useCallback((item: BuildingInfoItem) => {
    setMenuFor(item);
    menuRef.current?.present();
  }, []);

  const togglePublish = (item: BuildingInfoItem): void => {
    const publish = !isPublished(item);
    setActive.mutate(
      { id: item.id, active: publish },
      {
        onSuccess: () =>
          push({
            variant: 'success',
            title: publish
              ? t('fm.buildingInfo.publishedToast', { title: item.title })
              : t('fm.buildingInfo.unpublishedToast', { title: item.title }),
          }),
        onError: (error) =>
          showApiErrorToast(push, error, t, { fallbackTitle: t('fm.buildingInfo.actionFailed') }),
      },
    );
  };

  const confirmDelete = (item: BuildingInfoItem): void => {
    const warning =
      item.attachmentCount > 0
        ? `\n\n${t('fm.buildingInfo.deleteAttachmentsWarning', { count: item.attachmentCount })}`
        : '';
    confirmAction({
      title: t('fm.buildingInfo.deleteConfirm'),
      message: `${item.title}${warning}`,
      confirmLabel: t('fm.buildingInfo.delete'),
      cancelLabel: t('common.cancel'),
      onConfirm: () =>
        remove.mutate(
          { id: item.id },
          {
            onSuccess: () => push({ variant: 'success', title: t('fm.buildingInfo.deleted') }),
            onError: (error) =>
              showApiErrorToast(push, error, t, {
                fallbackTitle: t('fm.buildingInfo.actionFailed'),
              }),
          },
        ),
    });
  };

  const actions: ActionSheetAction[] = menuFor
    ? [
        {
          key: 'edit',
          label: t('fm.buildingInfo.edit'),
          icon: Icons.Pencil,
          onPress: () => openForm(menuFor),
        },
        {
          key: 'publish',
          label: isPublished(menuFor)
            ? t('fm.buildingInfo.unpublish')
            : t('fm.buildingInfo.publish'),
          icon: isPublished(menuFor) ? Icons.EyeSlash : Icons.Eye,
          onPress: () => togglePublish(menuFor),
        },
        {
          key: 'delete',
          label: t('fm.buildingInfo.delete'),
          icon: Icons.Trash,
          destructive: true,
          onPress: () => confirmDelete(menuFor),
        },
      ]
    : [];

  const addButton = (
    <HapticPressable
      onPress={() => openForm(null)}
      disabled={!projectId}
      accessibilityRole="button"
      accessibilityLabel={t('fm.buildingInfo.new')}
      accessibilityState={{ disabled: !projectId }}
      hitSlop={4}
      style={styles.add}
    >
      <Icons.Plus size={22} color={theme.colors.textOnPrimary} weight="bold" />
    </HapticPressable>
  );

  const controls = (
    <View style={styles.controls}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={t('fm.buildingInfo.search')}
        clearLabel={t('common.clear')}
      />
      <ChipRow>
        {FILTERS.map((f) => (
          <Chip
            key={f}
            label={t(`fm.buildingInfo.filter.${f}`)}
            selected={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </ChipRow>
    </View>
  );

  let body: React.ReactNode;
  if (list.isLoading) {
    body = (
      <View style={styles.listContent}>
        {SKELETON_ROWS.map((i) => (
          <BuildingInfoRowSkeleton key={i} />
        ))}
      </View>
    );
  } else if (list.isError && all.length === 0) {
    body = (
      <View style={styles.center}>
        <EmptyState
          title={t('common.error')}
          cta={{ label: t('common.retry'), onPress: () => void list.refetch() }}
        />
      </View>
    );
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <BuildingInfoCard
            item={item}
            buildingName={item.buildingId ? buildingNames.get(item.buildingId) : undefined}
            busy={busyId === item.id}
            onPress={openForm}
            onMenu={openMenu}
          />
        )}
        ListHeaderComponent={controls}
        keyboardShouldPersistTaps="handled"
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          filtered || buildingId ? (
            <EmptyState
              title={t('fm.buildingInfo.emptyFilter')}
              cta={{
                label: t('common.clear'),
                onPress: () => {
                  setFilter('all');
                  setQuery('');
                  scope.setBuilding(null);
                },
              }}
            />
          ) : (
            <EmptyState
              title={t('fm.buildingInfo.empty')}
              cta={{ label: t('fm.buildingInfo.new'), onPress: () => openForm(null) }}
            />
          )
        }
      />
    );
  }

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-building-info-screen">
      <ShellHeader title={t('fm.buildingInfo.title')} showBack />
      <ProjectBuildingScope scope={scope} trailing={addButton} />
      <ScopeGate scope={scope}>{body}</ScopeGate>
      <BuildingInfoFormSheet
        ref={formRef}
        projectId={projectId}
        buildings={scope.project?.buildings ?? []}
        editing={editing}
        defaultBuildingId={buildingId}
        openCount={openCount}
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
  controls: { gap: theme.spacing[8], marginBottom: theme.spacing[4] },
  // Clears the absolutely positioned tab bar.
  listContent: {
    padding: theme.spacing[16],
    paddingBottom: theme.spacing[96],
    gap: theme.spacing[12],
  },
}));
