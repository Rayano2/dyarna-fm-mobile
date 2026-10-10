import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ltr } from '@/shared/lib/bidi';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  BottomSheet,
  Button,
  FormTextArea,
  Icons,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import type { OffboardResult } from '../api/mappers';
import { OFFBOARD_REASON_MAX } from '../api/residents';
import { useOffboardResident } from '../hooks/useResidents';
import {
  classifyOffboardError,
  offboardSuccessToastKey,
  type OffboardErrorKind,
} from '../lib/residents-logic';

export interface OffboardTarget {
  userId: string;
  unitResidentId: number;
  name: string;
  building: string;
  unit: string;
}

export interface OffboardSheetProps {
  target: OffboardTarget | null;
  onOffboarded: (result: OffboardResult) => void;
}

const ERROR_COPY: Record<OffboardErrorKind, { title: string; body: string }> = {
  president: { title: 'fm.residents.errPresidentTitle', body: 'fm.residents.errPresident' },
  forbidden: { title: 'fm.residents.errForbiddenTitle', body: 'fm.residents.errForbidden' },
  generic: { title: 'fm.residents.errGenericTitle', body: 'fm.residents.errGeneric' },
};

export const OffboardSheet = forwardRef<BottomSheetRef, OffboardSheetProps>(function OffboardSheet(
  { target, onOffboarded },
  ref,
) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const push = useToastStore((s) => s.push);
  const [reason, setReason] = useState('');
  const [errorKind, setErrorKind] = useState<OffboardErrorKind | null>(null);
  const offboard = useOffboardResident();

  const dismiss = (): void => {
    if (ref && typeof ref !== 'function') ref.current?.dismiss();
  };

  const onConfirm = (): void => {
    if (!target) return;
    setErrorKind(null);
    offboard.mutate(
      { userId: target.userId, unitResidentId: target.unitResidentId, reason },
      {
        onSuccess: (result) => {
          push({
            variant: 'success',
            title: t(offboardSuccessToastKey(result), {
              name: target.name,
              building: target.building,
            }),
          });
          dismiss();
          onOffboarded(result);
        },
        // Inline, not a toast: the sheet stays open and keeps the typed reason.
        onError: (error) => setErrorKind(classifyOffboardError(error)),
      },
    );
  };

  const footer = (
    <View style={styles.footer}>
      <View style={styles.footerButton}>
        <Button
          label={t('common.cancel')}
          variant="ghost"
          fullWidth
          disabled={offboard.isPending}
          onPress={dismiss}
        />
      </View>
      <View style={styles.footerButton}>
        <Button
          label={offboard.isPending ? t('fm.residents.offboarding') : t('fm.residents.offboard')}
          variant="destructive"
          fullWidth
          loading={offboard.isPending}
          disabled={offboard.isPending || !target}
          onPress={onConfirm}
        />
      </View>
    </View>
  );

  const copy = errorKind ? ERROR_COPY[errorKind] : null;

  return (
    <BottomSheet
      ref={ref}
      snapPoints={['75%']}
      scrollable
      footer={footer}
      onDismiss={() => {
        setReason('');
        setErrorKind(null);
        offboard.reset();
      }}
    >
      <Text style={[styles.title, rtlText]} accessibilityRole="header">
        {t('fm.residents.offboardTitle', {
          name: target?.name ?? '',
          building: target?.building ?? '',
        })}
      </Text>
      <Text style={[styles.body, rtlText]}>
        {t('fm.residents.offboardDescription', { unit: ltr(target?.unit ?? '-') })}
      </Text>
      <Text style={[styles.note, rtlText]}>{t('fm.residents.keepsAccount')}</Text>

      <Text style={[styles.label, rtlText]} nativeID="offboard-reason-label">
        {t('fm.residents.reasonLabel')}
      </Text>
      <FormTextArea
        bottomSheet
        value={reason}
        onChangeText={setReason}
        maxLength={OFFBOARD_REASON_MAX}
        placeholder={t('fm.residents.reasonPlaceholder')}
        accessibilityLabel={t('fm.residents.reasonLabel')}
        accessibilityLabelledBy="offboard-reason-label"
        minHeight={100}
      />
      <View style={styles.reasonMeta}>
        <Text style={[styles.hint, rtlText]}>{t('fm.residents.reasonHint')}</Text>
        <Text style={styles.counter}>
          {t('fm.residents.reasonCounter', { used: reason.length, max: OFFBOARD_REASON_MAX })}
        </Text>
      </View>

      <View accessibilityLiveRegion="assertive">
        {copy ? (
          <View style={styles.alert} accessibilityRole="alert">
            <Icons.Warning size={20} color={theme.colors.error} weight="bold" />
            <View style={styles.alertBody}>
              <Text style={[styles.alertTitle, rtlText]}>{t(copy.title)}</Text>
              <Text style={[styles.alertText, rtlText]}>{t(copy.body)}</Text>
              {errorKind === 'president' ? (
                <Button
                  label={t('fm.residents.errPresidentAction')}
                  variant="secondary"
                  size="sm"
                  hitSlop={4}
                  onPress={() => {
                    dismiss();
                    router.push('/properties' as never);
                  }}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
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
  body: {
    marginTop: theme.spacing[8],
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
  },
  note: {
    marginTop: theme.spacing[4],
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textSecondary,
  },
  label: {
    marginTop: theme.spacing[16],
    marginBottom: theme.spacing[8],
    fontSize: theme.type.label.lg.size,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  reasonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing[6],
    gap: theme.spacing[8],
  },
  hint: { flex: 1, fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  counter: {
    fontSize: theme.type.label.md.size,
    color: theme.colors.textMuted,
    writingDirection: 'ltr',
  },
  alert: {
    flexDirection: 'row',
    gap: theme.spacing[12],
    marginTop: theme.spacing[16],
    padding: theme.spacing[12],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.terracottaSubtle,
  },
  alertBody: { flex: 1, gap: theme.spacing[4], alignItems: 'flex-start' },
  alertTitle: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  alertText: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  footer: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
}));
