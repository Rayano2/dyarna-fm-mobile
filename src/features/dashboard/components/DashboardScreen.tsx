import { Fragment, useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useAuthStore } from '@/features/auth';
import { ShellHeader } from '@/features/shell';
import { queryKeys } from '@/shared/api/query-keys';
import { useQueryErrorToast } from '@/shared/hooks/useQueryErrorToast';
import { FM_TICKETS } from '@/shared/lib/fm-routes';
import { goTo } from '@/shared/lib/go-to';
import { Button, Card, Divider, EmptyState, Icons, Screen, Skeleton } from '@/shared/ui';
import { useActiveTodoCount } from '../hooks/useActiveTodoCount';
import { useDashboardInfo } from '../hooks/useDashboardInfo';
import { greetingKey, KPI_ORDER, kpiTile, kpiValue } from '../lib/kpis';
import { KpiTile } from './KpiTile';
import { RecentTicketRow } from './RecentTicketRow';

const ROW_SKELETONS = [0, 1, 2];

export function DashboardScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const queryClient = useQueryClient();
  const name = useAuthStore((s) => s.user?.name ?? '');
  const info = useDashboardInfo();
  const todos = useActiveTodoCount();
  const [refreshing, setRefreshing] = useState(false);

  useQueryErrorToast(info.error, info.errorUpdatedAt);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.bms.dashboardInfo }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bms.todosActive }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const greeting = t(greetingKey(new Date().getHours()));
  const activeTodos = todos.isError ? undefined : todos.data;
  const showError = info.isError && !info.data;
  const tickets = info.data?.topOpenTickets ?? [];

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-index-screen">
      <ShellHeader title={t('fm.nav.dashboard')} subtitle={greeting} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        <Card style={styles.welcome}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.welcomeLine} numberOfLines={2}>
            {t('fm.dashboard.welcome', { name })}
          </Text>
          <Text style={styles.subtitle}>{t('fm.dashboard.subtitle')}</Text>
        </Card>

        {showError ? (
          <EmptyState
            illustration={
              <Icons.Warning size={64} color={theme.colors.textMuted} weight="duotone" />
            }
            title={t('fm.dashboard.error.title')}
            body={t('fm.dashboard.error.body')}
            cta={{ label: t('fm.dashboard.error.retry'), onPress: () => void info.refetch() }}
          />
        ) : (
          <>
            <View style={styles.grid}>
              {KPI_ORDER.map((kind) =>
                info.isLoading ? (
                  <View key={kind} style={styles.kpiSkeleton}>
                    <Skeleton height={110} radius={theme.radius.lg} />
                  </View>
                ) : (
                  <KpiTile
                    key={kind}
                    tile={kpiTile(kind)}
                    value={kpiValue(kind, info.data, activeTodos)}
                  />
                ),
              )}
            </View>

            <Card style={styles.recentCard}>
              <View style={styles.recentHeader}>
                <Icons.Clock size={20} color={theme.colors.primary} weight="regular" />
                <View style={styles.recentTitleBlock}>
                  <Text style={styles.recentTitle}>{t('fm.dashboard.recent.title')}</Text>
                  <Text style={styles.recentDesc} numberOfLines={1}>
                    {t('fm.dashboard.recent.desc')}
                  </Text>
                </View>
                <Button
                  label={t('fm.dashboard.recent.viewAll')}
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  onPress={() => goTo(FM_TICKETS)}
                  hitSlop={8}
                />
              </View>

              {info.isLoading ? (
                <View style={styles.rowSkeletons}>
                  {ROW_SKELETONS.map((row) => (
                    <Skeleton key={row} height={80} radius={theme.radius.md} />
                  ))}
                </View>
              ) : tickets.length === 0 ? (
                <EmptyState
                  title={t('fm.dashboard.recent.emptyTitle')}
                  body={t('fm.dashboard.recent.emptyBody')}
                />
              ) : (
                tickets.map((ticket, index) => (
                  <Fragment key={ticket.ticketId}>
                    {index > 0 ? <Divider /> : null}
                    <RecentTicketRow ticket={ticket} />
                  </Fragment>
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: {
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[96],
    gap: theme.spacing[16],
  },
  welcome: {
    gap: theme.spacing[4],
  },
  greeting: {
    fontSize: theme.type.label.lg.size,
    lineHeight: theme.type.label.lg.lineHeight,
    color: theme.colors.textMuted,
  },
  welcomeLine: {
    fontSize: theme.type.heading.lg.size,
    lineHeight: theme.type.heading.lg.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[12],
  },
  kpiSkeleton: {
    flexBasis: '45%',
    flexGrow: 1,
  },
  recentCard: {
    gap: theme.spacing[8],
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
  },
  recentTitleBlock: {
    flex: 1,
  },
  recentTitle: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  recentDesc: {
    fontSize: theme.type.label.md.size,
    lineHeight: theme.type.label.md.lineHeight,
    color: theme.colors.textMuted,
  },
  rowSkeletons: {
    gap: theme.spacing[8],
  },
}));
