import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { StyleSheet } from 'react-native-unistyles';
import { ltr } from '@/shared/lib/bidi';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  BottomSheet,
  Button,
  showApiErrorToast,
  Skeleton,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import type { ResidentRequest } from '../api/mappers';
import { useApproveRequest, useBuildingUnits } from '../hooks/useResidentRequests';
import { approveErrorEffect, approveSuccessEffect } from '../lib/request-actions';
import { reconcileSelection, summarizeUnits } from '../lib/units';
import { UnitOption } from './UnitOption';

export interface ApproveSheetProps {
  /** The request being approved; null while the sheet is closed. */
  request: ResidentRequest | null;
  onDismiss: () => void;
}

export const ApproveSheet = forwardRef<BottomSheetRef, ApproveSheetProps>(function ApproveSheet(
  { request, onDismiss },
  ref,
) {
  const { t } = useTranslation();
  const rtlText = useRtlTextStyle();
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  const [selected, setSelected] = useState<string | null>(null);
  const units = useBuildingUnits(request?.buildingCode);
  const approve = useApproveRequest();

  const unitList = units.data ?? [];
  // A refetch can show the chosen unit taken; it must not stay selected.
  const selection = reconcileSelection(selected, unitList);
  const summary = summarizeUnits(unitList);

  const dismiss = (): void => {
    if (ref && typeof ref !== 'function') ref.current?.dismiss();
  };
  const goTo = (path: '/residents' | '/properties'): void => {
    dismiss();
    router.push(path as never);
  };

  const onApprove = (): void => {
    if (!request || !selection) return;
    const unitNumber = selection;
    approve.mutate(
      { requestId: request.requestId, unitNumber },
      {
        onSuccess: () => {
          const effect = approveSuccessEffect();
          if (effect.kind !== 'approved') return;
          push({ variant: 'success', title: t(`fm.requests.${effect.toast}`) });
          for (const queryKey of effect.invalidate)
            void queryClient.invalidateQueries({ queryKey });
          dismiss();
        },
        onError: (error) => {
          const effect = approveErrorEffect(error);
          if (effect.kind === 'unitTaken') {
            // Sheet stays open: clear the pick and reload occupancy so the
            // FM can choose another unit straight away.
            push({
              variant: 'warning',
              title: t('fm.requests.unitTaken', { unit: ltr(unitNumber) }),
            });
            setSelected(null);
            void units.refetch();
            return;
          }
          showApiErrorToast(push, error, t, { fallbackTitle: t('fm.requests.approveFailed') });
        },
      },
    );
  };

  const footer = (
    <View style={styles.footer}>
      <View style={styles.footerButton}>
        <Button label={t('common.cancel')} variant="ghost" fullWidth onPress={dismiss} />
      </View>
      <View style={styles.footerButton}>
        <Button
          label={t('fm.requests.approve')}
          fullWidth
          disabled={!selection || approve.isPending}
          loading={approve.isPending}
          onPress={onApprove}
        />
      </View>
    </View>
  );

  const renderUnits = (): React.ReactNode => {
    if (units.isLoading) {
      return (
        <View style={styles.list}>
          <Skeleton height={52} radius={12} />
          <Skeleton height={52} radius={12} />
          <Skeleton height={52} radius={12} />
        </View>
      );
    }
    if (units.isError) {
      return (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Text style={[styles.noticeTitle, rtlText]}>{t('fm.requests.unitsLoadFailed')}</Text>
          <Text style={[styles.noticeBody, rtlText]}>{t('fm.requests.unitsLoadFailedHint')}</Text>
          <Button
            label={t('fm.requests.retry')}
            variant="secondary"
            size="sm"
            hitSlop={4}
            onPress={() => void units.refetch()}
          />
        </View>
      );
    }
    if (summary === 'none') {
      return (
        <View style={styles.notice}>
          <Text style={[styles.noticeTitle, rtlText]}>{t('fm.requests.noUnitsTitle')}</Text>
          <Text style={[styles.noticeBody, rtlText]}>{t('fm.requests.noUnitsDescription')}</Text>
          <Button
            label={t('fm.requests.addUnit')}
            variant="secondary"
            size="sm"
            hitSlop={4}
            onPress={() => goTo('/properties')}
          />
        </View>
      );
    }
    return (
      <>
        {summary === 'allOccupied' ? (
          <View style={styles.notice}>
            <Text style={[styles.noticeTitle, rtlText]}>{t('fm.requests.allOccupied')}</Text>
            <View style={styles.links}>
              <Button
                label={t('fm.requests.goResidents')}
                variant="ghost"
                size="sm"
                hitSlop={4}
                onPress={() => goTo('/residents')}
              />
              <Button
                label={t('fm.requests.goProperties')}
                variant="ghost"
                size="sm"
                hitSlop={4}
                onPress={() => goTo('/properties')}
              />
            </View>
          </View>
        ) : null}
        {summary === 'someOccupied' ? (
          <Text style={[styles.hint, rtlText]}>{t('fm.requests.someOccupied')}</Text>
        ) : null}
        <View
          style={styles.list}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('fm.requests.selectUnit')}
        >
          {unitList.map((unit) => (
            <UnitOption
              key={unit.unitNumber}
              unit={unit}
              selected={selection === unit.unitNumber}
              onSelect={setSelected}
            />
          ))}
        </View>
      </>
    );
  };

  return (
    <BottomSheet
      ref={ref}
      snapPoints={['80%']}
      scrollable
      footer={footer}
      onDismiss={() => {
        setSelected(null);
        approve.reset();
        onDismiss();
      }}
    >
      <Text style={[styles.title, rtlText]} accessibilityRole="header">
        {t('fm.requests.approveTitle')}
      </Text>
      <Text style={[styles.description, rtlText]}>{t('fm.requests.approveDescription')}</Text>
      {request ? (
        <View style={styles.resident}>
          <Text style={[styles.residentName, rtlText]}>{request.fullName}</Text>
          {request.buildingName ? (
            <Text style={[styles.residentMeta, rtlText]}>{request.buildingName}</Text>
          ) : null}
        </View>
      ) : null}
      <Text style={[styles.section, rtlText]}>{t('fm.requests.selectUnit')}</Text>
      {renderUnits()}
    </BottomSheet>
  );
});

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
  resident: {
    marginTop: theme.spacing[16],
    padding: theme.spacing[12],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing[2],
  },
  residentName: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  residentMeta: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  section: {
    marginTop: theme.spacing[16],
    marginBottom: theme.spacing[8],
    fontSize: theme.type.label.lg.size,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  list: { gap: theme.spacing[8] },
  notice: {
    gap: theme.spacing[8],
    padding: theme.spacing[12],
    marginBottom: theme.spacing[8],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.goldSubtle,
    alignItems: 'flex-start',
  },
  noticeTitle: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  noticeBody: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[8] },
  hint: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing[8],
  },
  footer: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
}));
