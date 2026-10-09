import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ShellHeader } from '@/features/shell';
import { ProjectBuildingScope, ScopeGate, confirmAction, useScope } from '@/features/scope';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  BottomSheet,
  Button,
  EmptyState,
  HapticPressable,
  Icons,
  Screen,
  showApiErrorToast,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import type { Facility } from '../api/facilities-api';
import { useFacilities, useSetFacilityActive } from '../hooks/useFacilities';
import { FacilityCard, FacilityRowSkeleton } from './FacilityCard';
import { FacilityFormSheet } from './FacilityFormSheet';

const SKELETON_ROWS = [0, 1, 2, 3, 4];

export function FacilitiesScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const push = useToastStore((s) => s.push);
  const scope = useScope();
  const { projectId, buildingId } = scope;

  const list = useFacilities(projectId, buildingId);
  const setActive = useSetFacilityActive();
  const formRef = useRef<BottomSheetRef>(null);
  const resultRef = useRef<BottomSheetRef>(null);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [affected, setAffected] = useState(0);

  const buildingNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of scope.project?.buildings ?? []) map.set(b.buildingId, b.buildingName);
    return map;
  }, [scope.project]);

  const openForm = useCallback((facility: Facility | null) => {
    setEditing(facility);
    setOpenCount((n) => n + 1);
    formRef.current?.present();
  }, []);

  const runToggle = useCallback(
    (facility: Facility, next: boolean) => {
      setActive.mutate(
        { id: facility.id, active: next },
        {
          onSuccess: (result) => {
            if (!next && result.affectedFutureBookings > 0) {
              setAffected(result.affectedFutureBookings);
              resultRef.current?.present();
              return;
            }
            push({
              variant: 'success',
              title: next ? t('fm.facilities.activated') : t('fm.facilities.deactivated'),
            });
          },
          onError: (error) =>
            showApiErrorToast(push, error, t, { fallbackTitle: t('fm.facilities.toggleFailed') }),
        },
      );
    },
    [setActive, push, t],
  );

  const onToggleActive = useCallback(
    (facility: Facility, next: boolean) => {
      if (next) {
        runToggle(facility, true);
        return;
      }
      confirmAction({
        title: t('fm.facilities.deactivateTitle', { name: facility.name }),
        message: t('fm.facilities.deactivateConfirm'),
        confirmLabel: t('fm.facilities.deactivate'),
        cancelLabel: t('common.cancel'),
        onConfirm: () => runToggle(facility, false),
      });
    },
    [runToggle, t],
  );

  const viewBookings = (): void => {
    resultRef.current?.dismiss();
    router.push({ pathname: '/bookings', params: { status: 'APPROVED' } } as never);
  };

  const addButton = (
    <HapticPressable
      onPress={() => openForm(null)}
      disabled={!projectId}
      accessibilityRole="button"
      accessibilityLabel={t('fm.facilities.new')}
      accessibilityState={{ disabled: !projectId }}
      hitSlop={4}
      style={styles.add}
    >
      <Icons.Plus size={22} color={theme.colors.textOnPrimary} weight="bold" />
    </HapticPressable>
  );

  const togglingId = setActive.isPending ? setActive.variables?.id : undefined;
  const items = list.data ?? [];

  let body: React.ReactNode;
  if (list.isLoading) {
    body = (
      <View style={styles.listContent}>
        {SKELETON_ROWS.map((i) => (
          <FacilityRowSkeleton key={i} />
        ))}
      </View>
    );
  } else if (list.isError && items.length === 0) {
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
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => (
          <FacilityCard
            facility={item}
            buildingName={item.buildingId ? buildingNames.get(item.buildingId) : undefined}
            toggling={togglingId === item.id}
            onPress={openForm}
            onToggleActive={onToggleActive}
          />
        )}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          buildingId ? (
            <EmptyState
              title={t('fm.facilities.emptyFilter')}
              cta={{ label: t('common.clear'), onPress: () => scope.setBuilding(null) }}
            />
          ) : (
            <EmptyState
              title={t('fm.facilities.empty')}
              cta={{ label: t('fm.facilities.new'), onPress: () => openForm(null) }}
            />
          )
        }
      />
    );
  }

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-facilities-screen">
      <ShellHeader title={t('fm.facilities.title')} showBack />
      <ProjectBuildingScope scope={scope} trailing={addButton} />
      <ScopeGate scope={scope}>{body}</ScopeGate>

      <FacilityFormSheet
        ref={formRef}
        projectId={projectId}
        buildings={scope.project?.buildings ?? []}
        editing={editing}
        defaultBuildingId={buildingId}
        openCount={openCount}
      />

      <BottomSheet
        ref={resultRef}
        snapPoints={['40%']}
        footer={<Button label={t('fm.facilities.viewBookings')} fullWidth onPress={viewBookings} />}
      >
        <View style={styles.result}>
          <Icons.Warning size={28} color={theme.colors.warning} weight="fill" />
          <Text style={[styles.resultTitle, rtlText]} accessibilityRole="header">
            {t('fm.facilities.deactivated')}
          </Text>
          <Text style={[styles.resultBody, rtlText]}>
            {t('fm.facilities.affectedBookings', { count: affected })}
          </Text>
          <Text style={[styles.resultHint, rtlText]}>{t('fm.facilities.affectedHint')}</Text>
        </View>
      </BottomSheet>
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
  result: { gap: theme.spacing[8], alignItems: 'flex-start' },
  resultTitle: {
    alignSelf: 'stretch',
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  resultBody: {
    alignSelf: 'stretch',
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textPrimary,
  },
  resultHint: {
    alignSelf: 'stretch',
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textSecondary,
  },
}));
