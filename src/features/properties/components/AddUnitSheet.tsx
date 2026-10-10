import { forwardRef, useEffect } from 'react';
import { Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { zodFormResolver } from '@/features/scope';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  BottomSheet,
  Button,
  Input,
  showApiErrorToast,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import { useCreateUnit } from '../hooks/useProperties';
import {
  addUnitSchema,
  EMPTY_ADD_UNIT,
  type AddUnitFormInput,
  type AddUnitFormValues,
} from '../lib/add-unit-schema';

const resolver = zodFormResolver(addUnitSchema);

export interface AddUnitSheetProps {
  /** The building the unit is added to; null while the sheet is closed. */
  buildingCode: string | null;
  buildingName: string | undefined;
  /** Bumped on every open so the form re-seeds. */
  openCount: number;
  onDismiss: () => void;
}

export const AddUnitSheet = forwardRef<BottomSheetRef, AddUnitSheetProps>(function AddUnitSheet(
  { buildingCode, buildingName, openCount, onDismiss },
  ref,
) {
  const { t } = useTranslation();
  const rtlText = useRtlTextStyle();
  const push = useToastStore((s) => s.push);
  const create = useCreateUnit();
  const form = useForm<AddUnitFormInput, unknown, AddUnitFormValues>({
    resolver,
    defaultValues: EMPTY_ADD_UNIT,
  });

  useEffect(() => {
    form.reset(EMPTY_ADD_UNIT);
    // Re-seed only when the sheet is (re)opened, never while the user types.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCount]);

  const errorText = (key: string | undefined): string | undefined => (key ? t(key) : undefined);
  const dismiss = (): void => {
    if (ref && typeof ref !== 'function') ref.current?.dismiss();
  };

  const submit = form.handleSubmit((values) => {
    if (!buildingCode) return;
    create.mutate(
      { buildingCode, unitNumber: values.unitNumber, floorNumber: values.floorNumber },
      {
        onSuccess: () => {
          push({ variant: 'success', title: t('fm.properties.unitAdded') });
          dismiss();
        },
        // The sheet stays open with the user's values intact.
        onError: (error) =>
          showApiErrorToast(push, error, t, { fallbackTitle: t('fm.properties.unitAddFailed') }),
      },
    );
  });

  const footer = (
    <View style={styles.footer}>
      <View style={styles.footerButton}>
        <Button
          label={t('common.cancel')}
          variant="ghost"
          fullWidth
          disabled={create.isPending}
          onPress={dismiss}
        />
      </View>
      <View style={styles.footerButton}>
        <Button
          label={t('common.save')}
          fullWidth
          loading={create.isPending}
          disabled={create.isPending || !buildingCode}
          onPress={() => void submit()}
          testID="add-unit-save"
        />
      </View>
    </View>
  );

  return (
    <BottomSheet
      ref={ref}
      snapPoints={['55%']}
      footer={footer}
      onDismiss={() => {
        create.reset();
        onDismiss();
      }}
    >
      <Text style={[styles.title, rtlText]} accessibilityRole="header">
        {t('fm.properties.addUnit')}
      </Text>
      {buildingName ? <Text style={[styles.description, rtlText]}>{buildingName}</Text> : null}
      <View style={styles.fields}>
        <Controller
          control={form.control}
          name="unitNumber"
          render={({ field, fieldState }) => (
            <Input
              label={t('fm.properties.unitNumberLabel')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoCapitalize="characters"
              autoCorrect={false}
              error={errorText(fieldState.error?.message)}
              testID="add-unit-number"
            />
          )}
        />
        <Controller
          control={form.control}
          name="floorNumber"
          render={({ field, fieldState }) => (
            <Input
              label={t('fm.properties.floorLabel')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              keyboardType="number-pad"
              maxLength={2}
              error={errorText(fieldState.error?.message)}
              testID="add-unit-floor"
            />
          )}
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
  fields: { marginTop: theme.spacing[16], gap: theme.spacing[12] },
  footer: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
}));
