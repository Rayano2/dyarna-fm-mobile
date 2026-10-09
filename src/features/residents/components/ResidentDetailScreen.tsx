import { useRef } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ShellHeader } from '@/features/shell';
import { useQueryErrorToast } from '@/shared/hooks/useQueryErrorToast';
import { formatRelativeTime } from '@/shared/lib/format-relative-time';
import { safeToLocaleDateString } from '@/shared/lib/safe-intl';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Icons,
  Screen,
  Skeleton,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import { useResidentDetails } from '../hooks/useResidents';
import { OffboardSheet, type OffboardTarget } from './OffboardSheet';
import { ResidentStat } from './ResidentStat';

type DetailParams = {
  id: string;
  /** The unit-link the list row was (one row per link). */
  unitResidentId?: string;
  unit?: string;
  building?: string;
};

function formatDate(value: string | undefined, locale: string): string {
  if (!value) return '-';
  return (
    safeToLocaleDateString(new Date(value), locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) || '-'
  );
}

interface FieldProps {
  label: string;
  value: string;
  ltr?: boolean;
}

function Field({ label, value, ltr = false }: FieldProps): React.JSX.Element {
  const rtlText = useRtlTextStyle();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, rtlText]}>{label}</Text>
      <Text style={[styles.fieldValue, ltr ? styles.ltr : rtlText]}>{value}</Text>
    </View>
  );
}

export function ResidentDetailScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const params = useLocalSearchParams<DetailParams>();
  const sheet = useRef<BottomSheetRef>(null);
  const details = useResidentDetails(params.id);
  useQueryErrorToast(details.error, details.errorUpdatedAt);

  const d = details.data;
  // The row's own link wins: the detail payload describes one of possibly
  // several links, and offboarding must target the unit the FM tapped.
  const linkParam = params.unitResidentId ? Number(params.unitResidentId) : Number.NaN;
  const unitResidentId = Number.isFinite(linkParam) ? linkParam : d?.unitResidentId;
  const unit = params.unit ?? d?.unitNumber ?? '-';
  const building = params.building ?? d?.buildingName ?? '-';

  const target: OffboardTarget | null =
    d && unitResidentId !== undefined
      ? { userId: d.userId, unitResidentId, name: d.fullName, building, unit }
      : null;

  const renderBody = (): React.ReactNode => {
    if (details.isLoading) {
      return (
        <View style={styles.content}>
          <Skeleton height={140} radius={16} />
          <Skeleton height={120} radius={16} />
          <Skeleton height={160} radius={16} />
        </View>
      );
    }
    if (!d) {
      return (
        <EmptyState
          title={t('fm.residents.loadFailed')}
          cta={{ label: t('fm.residents.retry'), onPress: () => void details.refetch() }}
        />
      );
    }
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <Avatar name={d.fullName} size={64} />
          <Text style={styles.name}>{d.fullName || '-'}</Text>
          <View style={styles.badges}>
            <Badge
              size="sm"
              tone="neutral"
              label={unit}
              textStyle={styles.ltr}
              icon={<Icons.Door size={12} color={theme.colors.textSecondary} weight="bold" />}
            />
            <Badge
              size="sm"
              tone="primarySubtle"
              label={building}
              icon={<Icons.Buildings size={12} color={theme.colors.primary} weight="bold" />}
            />
          </View>
          {d.mobile ? (
            <Button
              label={t('fm.residents.call')}
              variant="secondary"
              size="sm"
              hitSlop={4}
              accessibilityLabel={`${t('fm.residents.call')} ${d.mobile}`}
              leadingIcon={<Icons.Phone size={16} color={theme.colors.primary} weight="bold" />}
              onPress={() => void Linking.openURL(`tel:${d.mobile}`)}
            />
          ) : null}
          {d.email ? <Text style={[styles.email, styles.ltr]}>{d.email}</Text> : null}
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, rtlText]}>{t('fm.residents.contact')}</Text>
          <Field label={t('fm.residents.email')} value={d.email ?? '-'} ltr />
          <Field
            label={t('fm.residents.registered')}
            value={formatDate(d.registrationDate, i18n.language)}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, rtlText]}>{t('fm.residents.unitInfo')}</Text>
          <Field label={t('fm.residents.unit')} value={unit} ltr />
          <Field label={t('fm.residents.building')} value={building} />
          <Field
            label={t('fm.residents.floor')}
            value={d.floorNumber === undefined ? '-' : String(d.floorNumber)}
            ltr
          />
          <Field label={t('fm.residents.project')} value={d.projectName ?? '-'} />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, rtlText]}>{t('fm.residents.ticketStats')}</Text>
          <View style={styles.stats}>
            <ResidentStat
              icon={<Icons.Wrench size={20} color={theme.colors.gold} weight="bold" />}
              value={d.openTicketsCount}
              label={t('fm.residents.openTickets')}
            />
            <ResidentStat
              icon={<Icons.CheckCircle size={20} color={theme.colors.primary} weight="bold" />}
              value={d.closedTicketsCount}
              label={t('fm.residents.closedTickets')}
            />
          </View>
          <Text style={[styles.fieldLabel, rtlText]}>{t('fm.residents.lastTicket')}</Text>
          {d.lastTicket ? (
            <View style={styles.lastTicket}>
              <Text style={[styles.fieldValue, rtlText]} numberOfLines={2}>
                {d.lastTicket.title || `#${d.lastTicket.ticketId}`}
              </Text>
              <View style={styles.lastTicketMeta}>
                <Badge size="xs" tone="neutral" label={d.lastTicket.status || '-'} />
                <Text style={styles.muted}>{formatRelativeTime(d.lastTicket.createdAt, t)}</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.muted, rtlText]}>{t('fm.residents.noTickets')}</Text>
          )}
        </Card>
      </ScrollView>
    );
  };

  const renderFooter = (): React.ReactNode => {
    if (details.isLoading) return <Skeleton height={48} radius={12} />;
    if (!d) return null;
    if (d.active === false) {
      return (
        <View style={styles.offboarded} accessibilityRole="text">
          <Icons.Info size={18} color={theme.colors.textSecondary} weight="bold" />
          <Text style={[styles.muted, styles.flex, rtlText]}>
            {t('fm.residents.alreadyOffboarded')}
          </Text>
        </View>
      );
    }
    return (
      <Button
        label={t('fm.residents.offboard')}
        variant="destructive"
        fullWidth
        disabled={!target}
        leadingIcon={<Icons.UserMinus size={18} color={theme.colors.textOnPrimary} weight="bold" />}
        onPress={() => sheet.current?.present()}
      />
    );
  };

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-resident-detail-screen">
      <ShellHeader title={d?.fullName || t('fm.residents.title')} showBack showBell={false} />
      <View style={styles.flex}>{renderBody()}</View>
      <View style={styles.footer}>{renderFooter()}</View>
      <OffboardSheet ref={sheet} target={target} onOffboarded={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  content: { padding: theme.spacing[16], gap: theme.spacing[12] },
  hero: { alignItems: 'center', gap: theme.spacing[8] },
  name: {
    fontSize: theme.type.heading.lg.size,
    lineHeight: theme.type.heading.lg.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing[8],
  },
  email: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  section: { gap: theme.spacing[8] },
  sectionTitle: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  field: { gap: theme.spacing[2] },
  fieldLabel: { fontSize: theme.type.label.md.size, color: theme.colors.textMuted },
  fieldValue: { fontSize: theme.type.body.md.size, color: theme.colors.textPrimary },
  ltr: { writingDirection: 'ltr' },
  stats: { flexDirection: 'row', gap: theme.spacing[8] },
  lastTicket: { gap: theme.spacing[6] },
  lastTicketMeta: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  muted: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  // Kept apart from the stats, above the absolutely positioned tab bar.
  footer: {
    paddingHorizontal: theme.spacing[16],
    paddingTop: theme.spacing[12],
    paddingBottom: theme.spacing[96],
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderHairline,
    backgroundColor: theme.colors.bg,
  },
  offboarded: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8], minHeight: 44 },
}));
