import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { AccessibilityInfo, Alert, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { useComposeDraft } from '@/shared/hooks/useComposeDraft';
import { useZodErrorText } from '@/shared/i18n/zod-error';
import {
  BottomSheet,
  Button,
  FormTextArea,
  ImagePickerRow,
  Input,
  RiyalSymbol,
  type BottomSheetRef,
} from '@/shared/ui';
import type { ResolutionStatus, ResolveTicketInput } from '../api/update-status';
import { resolveDrafts } from '../lib/resolve-drafts';
import {
  RESOLVE_DEFAULTS,
  RESOLVE_MAX_FILES,
  parseRepairCost,
  resolveResolver,
  type ResolveFormValues,
} from '../lib/resolve-schema';

export interface ResolveTicketSheetProps {
  ticketId: number;
  ticketNumber: string;
  resolution: ResolutionStatus;
  submitting: boolean;
  onSubmit: (input: ResolveTicketInput) => void;
}

const SNAP_POINTS = ['90%'];

/** Builds the API input from the validated form. */
export function toResolveInput(
  values: ResolveFormValues,
  ids: { ticketId: number; ticketNumber: string; resolution: ResolutionStatus },
): ResolveTicketInput {
  return {
    ticketId: ids.ticketId,
    ticketNumber: ids.ticketNumber,
    status: ids.resolution,
    comment: values.comment.trim(),
    repairCost: parseRepairCost(values.repairCost) ?? null,
    files: values.files.map((f) => ({ uri: f.uri, name: f.fileName, type: f.mimeType })),
  };
}

/**
 * Required note, optional repair cost (0-100000, 2 decimals) and up to 5
 * images. Confirm asks once more (it can't be undone). While submitting every
 * field is locked and the sheet re-opens if swiped away; on failure the draft
 * stays.
 */
export const ResolveTicketSheet = forwardRef<BottomSheetRef, ResolveTicketSheetProps>(
  function ResolveTicketSheet({ ticketId, ticketNumber, resolution, submitting, onSubmit }, ref) {
    const { t } = useTranslation();
    const errorText = useZodErrorText('fm.tickets.resolve');
    const sheet = useRef<BottomSheetRef>(null);
    useImperativeHandle(ref, () => sheet.current as BottomSheetRef, []);

    const submittingRef = useRef(submitting);
    useEffect(() => {
      submittingRef.current = submitting;
    }, [submitting]);

    const { control, handleSubmit, watch, formState } = useForm<ResolveFormValues>({
      resolver: resolveResolver,
      defaultValues: resolveDrafts.get(ticketNumber) ?? RESOLVE_DEFAULTS,
      mode: 'onChange',
    });

    const saveDraft = useCallback(
      (values: ResolveFormValues) => resolveDrafts.set(ticketNumber, values),
      [ticketNumber],
    );
    useComposeDraft(watch, saveDraft);

    const comment = watch('comment');
    const canConfirm = comment.trim().length > 0 && !submitting;

    const confirm = handleSubmit(
      (values) => {
        Alert.alert(t('fm.tickets.resolve.confirmTitle'), t('fm.tickets.resolve.confirmBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.continue'),
            style: 'destructive',
            onPress: () => onSubmit(toResolveInput(values, { ticketId, ticketNumber, resolution })),
          },
        ]);
      },
      (errors) => {
        const first = errors.comment ?? errors.repairCost ?? errors.files;
        const message = errorText(first);
        if (message) AccessibilityInfo.announceForAccessibility(message);
      },
    );

    return (
      <BottomSheet
        ref={sheet}
        snapPoints={SNAP_POINTS}
        scrollable
        onDismiss={() => {
          // Dismissal is blocked mid-submit: the result must have a visible home.
          if (submittingRef.current) sheet.current?.present();
        }}
        footer={
          <Button
            label={
              resolution === 'RESOLVED'
                ? t('fm.tickets.markResolved')
                : t('fm.tickets.markNotActionable')
            }
            variant={resolution === 'RESOLVED' ? 'primary' : 'destructive'}
            fullWidth
            disabled={!canConfirm}
            loading={submitting}
            onPress={() => void confirm()}
            testID="fm-resolve-confirm"
          />
        }
      >
        <Text style={styles.title} accessibilityRole="header">
          {resolution === 'RESOLVED'
            ? t('fm.tickets.markResolved')
            : t('fm.tickets.markNotActionable')}
        </Text>
        <Text style={styles.description}>{t('fm.tickets.resolve.description')}</Text>

        <Text style={styles.label} nativeID="resolve-comment-label">
          {t('fm.tickets.resolve.commentLabel')}
        </Text>
        <Controller
          control={control}
          name="comment"
          render={({ field }) => (
            <FormTextArea
              bottomSheet
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              editable={!submitting}
              minHeight={110}
              accessibilityLabelledBy="resolve-comment-label"
              accessibilityLabel={t('fm.tickets.resolve.commentLabel')}
              error={errorText(formState.errors.comment)}
            />
          )}
        />

        <Controller
          control={control}
          name="repairCost"
          render={({ field }) => (
            <View style={styles.field}>
              <Input
                label={t('fm.tickets.resolve.costLabel')}
                helper={t('fm.tickets.resolve.costHint')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!submitting}
                keyboardType="decimal-pad"
                inputMode="decimal"
                trailingIcon={<RiyalSymbol />}
                error={errorText(formState.errors.repairCost)}
                testID="fm-resolve-cost"
              />
            </View>
          )}
        />

        <Text style={styles.label}>{t('fm.tickets.attachments')}</Text>
        <Controller
          control={control}
          name="files"
          render={({ field }) => (
            <View pointerEvents={submitting ? 'none' : 'auto'} style={submitting && styles.locked}>
              <ImagePickerRow
                images={field.value}
                onChange={field.onChange}
                max={RESOLVE_MAX_FILES}
              />
            </View>
          )}
        />
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create((theme) => ({
  title: {
    fontSize: theme.type.heading.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  description: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[16],
  },
  label: {
    fontSize: theme.type.label.lg.size,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[8],
    marginTop: theme.spacing[12],
  },
  field: { marginTop: theme.spacing[12] },
  locked: { opacity: 0.5 },
}));
