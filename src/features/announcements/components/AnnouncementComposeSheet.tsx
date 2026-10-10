import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { FieldLabel, zodFormResolver } from '@/features/scope';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  BottomSheet,
  Button,
  FormTextArea,
  Input,
  SwitchRow,
  showApiErrorToast,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import { MESSAGE_MAX, TITLE_MAX } from '../api/announcements-api';
import { useCreateAnnouncement, useResidentCount } from '../hooks/useAnnouncements';
import {
  announcementSchema,
  EMPTY_ANNOUNCEMENT,
  type AnnouncementFormInput,
  type AnnouncementFormValues,
} from '../lib/announcement-schema';

export interface AnnouncementComposeSheetProps {
  projectId: string | undefined;
  projectName: string | undefined;
}

const resolver = zodFormResolver(announcementSchema);

/**
 * Compose + confirm in one sheet (mirrors dyarna-rn `AnnouncementComposeView`):
 * the confirm step shows what goes out and how many residents get notified.
 */
export const AnnouncementComposeSheet = forwardRef<BottomSheetRef, AnnouncementComposeSheetProps>(
  function AnnouncementComposeSheet({ projectId, projectName }, ref) {
    const { t } = useTranslation();
    const rtlText = useRtlTextStyle();
    const push = useToastStore((s) => s.push);
    const [step, setStep] = useState<'edit' | 'confirm'>('edit');
    const create = useCreateAnnouncement();
    const residents = useResidentCount(projectId, step === 'confirm');

    const form = useForm<AnnouncementFormInput, unknown, AnnouncementFormValues>({
      resolver,
      defaultValues: EMPTY_ANNOUNCEMENT,
      mode: 'onChange',
    });
    const title = form.watch('title');
    const message = form.watch('message');
    const isPinned = form.watch('isPinned');
    const canContinue = !!projectId && title.trim().length > 0 && message.trim().length > 0;

    const dismiss = (): void => {
      if (ref && typeof ref === 'object') ref.current?.dismiss();
    };

    const send = form.handleSubmit((values) => {
      if (!projectId) return;
      create.mutate(
        { projectId, title: values.title, body: values.message, isPinned: values.isPinned },
        {
          onSuccess: () => {
            push({ variant: 'success', title: t('fm.announcements.sent') });
            form.reset(EMPTY_ANNOUNCEMENT);
            dismiss();
          },
          onError: (error) => {
            // Keep the sheet open on the confirm step with the values intact.
            showApiErrorToast(push, error, t, { fallbackTitle: t('fm.announcements.sendFailed') });
          },
        },
      );
    });

    const footer =
      step === 'edit' ? (
        <Button
          label={t('common.continue')}
          fullWidth
          disabled={!canContinue}
          onPress={form.handleSubmit(() => setStep('confirm'))}
        />
      ) : (
        <View style={styles.footerRow}>
          <View style={styles.footerButton}>
            <Button
              label={t('common.back')}
              variant="secondary"
              fullWidth
              disabled={create.isPending}
              onPress={() => setStep('edit')}
            />
          </View>
          <View style={styles.footerButton}>
            <Button
              label={create.isPending ? t('fm.announcements.sending') : t('fm.announcements.send')}
              fullWidth
              loading={create.isPending}
              disabled={create.isPending}
              onPress={() => void send()}
            />
          </View>
        </View>
      );

    return (
      <BottomSheet
        ref={ref}
        scrollable
        snapPoints={['90%']}
        footer={footer}
        onDismiss={() => setStep('edit')}
      >
        <Text style={[styles.heading, rtlText]} accessibilityRole="header">
          {step === 'edit' ? t('fm.announcements.new') : t('fm.announcements.confirmTitle')}
        </Text>

        {step === 'edit' ? (
          <View style={styles.fields}>
            <Text style={[styles.project, rtlText]}>
              {t('fm.announcements.toProject', { project: projectName ?? '' })}
            </Text>
            <Controller
              control={form.control}
              name="title"
              render={({ field, fieldState }) => (
                <Input
                  label={t('fm.announcements.field.title')}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  maxLength={TITLE_MAX}
                  error={fieldState.error?.message ? t(fieldState.error.message) : undefined}
                />
              )}
            />
            <Controller
              control={form.control}
              name="message"
              render={({ field, fieldState }) => (
                <View style={styles.area}>
                  <FieldLabel
                    label={t('fm.announcements.field.message')}
                    count={field.value.length}
                    max={MESSAGE_MAX}
                  />
                  <FormTextArea
                    bottomSheet
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    maxLength={MESSAGE_MAX}
                    accessibilityLabel={t('fm.announcements.field.message')}
                    error={fieldState.error?.message ? t(fieldState.error.message) : undefined}
                  />
                </View>
              )}
            />
            <Controller
              control={form.control}
              name="isPinned"
              render={({ field }) => (
                <SwitchRow
                  label={t('fm.announcements.pin')}
                  value={field.value}
                  onValueChange={field.onChange}
                  {...(field.value ? { hint: t('fm.announcements.pinHint') } : {})}
                />
              )}
            />
          </View>
        ) : (
          <View style={styles.fields}>
            <Text style={[styles.confirmTitle, rtlText]}>{title.trim()}</Text>
            <Text style={[styles.confirmBody, rtlText]}>{message.trim()}</Text>
            <Text style={[styles.project, rtlText]}>
              {t('fm.announcements.toProject', { project: projectName ?? '' })}
            </Text>
            {isPinned ? (
              <Text style={[styles.project, rtlText]}>{t('fm.announcements.pinHint')}</Text>
            ) : null}
            <Text style={[styles.residents, rtlText]} accessibilityLiveRegion="polite">
              {residents.isLoading
                ? t('common.loading')
                : residents.data === null || residents.data === undefined
                  ? t('fm.announcements.residentsUnknown')
                  : t('fm.announcements.residents', { count: residents.data })}
            </Text>
          </View>
        )}
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create((theme) => ({
  heading: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[12],
  },
  fields: { gap: theme.spacing[16] },
  area: { gap: theme.spacing[6] },
  project: { fontSize: theme.type.body.sm.size, color: theme.colors.textSecondary },
  confirmTitle: {
    fontSize: theme.type.body.lg.size,
    lineHeight: theme.type.body.lg.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  confirmBody: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textSecondary,
  },
  residents: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  footerRow: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
}));
