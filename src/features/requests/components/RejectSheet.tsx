import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  BottomSheet,
  Button,
  FormTextArea,
  showApiErrorToast,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import type { ResidentRequest } from '../api/mappers';
import { useRejectRequest } from '../hooks/useResidentRequests';
import { validateRejectReason } from '../lib/request-actions';

export interface RejectSheetProps {
  request: ResidentRequest | null;
  onDismiss: () => void;
}

export const RejectSheet = forwardRef<BottomSheetRef, RejectSheetProps>(function RejectSheet(
  { request, onDismiss },
  ref,
) {
  const { t } = useTranslation();
  const rtlText = useRtlTextStyle();
  const push = useToastStore((s) => s.push);
  const [reason, setReason] = useState('');
  const [showError, setShowError] = useState(false);
  const reject = useRejectRequest();
  const reasonError =
    showError && validateRejectReason(reason) ? t('fm.requests.reasonRequired') : undefined;

  const dismiss = (): void => {
    if (ref && typeof ref !== 'function') ref.current?.dismiss();
  };

  const onSubmit = (): void => {
    if (!request) return;
    reject.mutate(
      { requestId: request.requestId, reason },
      {
        onSuccess: (result) => {
          if (!result.ok) {
            setShowError(true);
            return;
          }
          push({ variant: 'success', title: t('fm.requests.rejectedToast') });
          dismiss();
        },
        onError: (error) =>
          showApiErrorToast(push, error, t, { fallbackTitle: t('fm.requests.rejectFailed') }),
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
          label={t('fm.requests.reject')}
          variant="destructive"
          fullWidth
          loading={reject.isPending}
          disabled={reject.isPending}
          onPress={onSubmit}
        />
      </View>
    </View>
  );

  return (
    <BottomSheet
      ref={ref}
      snapPoints={['60%']}
      footer={footer}
      onDismiss={() => {
        setReason('');
        setShowError(false);
        reject.reset();
        onDismiss();
      }}
    >
      <Text style={[styles.title, rtlText]} accessibilityRole="header">
        {t('fm.requests.rejectTitle')}
      </Text>
      <Text style={[styles.description, rtlText]}>{t('fm.requests.rejectDescription')}</Text>
      {request ? <Text style={[styles.resident, rtlText]}>{request.fullName}</Text> : null}
      <Text style={[styles.label, rtlText]} nativeID="reject-reason-label">
        {t('fm.requests.reasonLabel')}
      </Text>
      <View accessibilityLiveRegion="polite">
        <FormTextArea
          bottomSheet
          value={reason}
          onChangeText={(next) => {
            setReason(next);
            if (showError && !validateRejectReason(next)) setShowError(false);
          }}
          placeholder={t('fm.requests.reasonPlaceholder')}
          accessibilityLabel={t('fm.requests.reasonLabel')}
          accessibilityLabelledBy="reject-reason-label"
          minHeight={110}
          error={reasonError}
        />
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
  description: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[4],
  },
  resident: {
    marginTop: theme.spacing[12],
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  label: {
    marginTop: theme.spacing[16],
    marginBottom: theme.spacing[8],
    fontSize: theme.type.label.lg.size,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  footer: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
}));
