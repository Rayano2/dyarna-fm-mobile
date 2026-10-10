import { forwardRef, useEffect } from 'react';
import { Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { FieldLabel, zodFormResolver } from '@/features/scope';
import type { FilterBuilding } from '@/shared/api/project-buildings-filter';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  BottomSheet,
  Button,
  Chip,
  ChipRow,
  FormTextArea,
  Input,
  SwitchRow,
  showApiErrorToast,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import type { Facility } from '../api/facilities-api';
import { useSaveFacility } from '../hooks/useFacilities';
import {
  DESCRIPTION_MAX,
  LOCATION_MAX,
  NAME_MAX,
  emptyFacilityForm,
  facilityFormSchema,
  facilityToForm,
  toFacilityPayload,
  type FacilityFormInput,
  type FacilityFormValues,
} from '../lib/facility-form';
import { FACILITY_TYPES, facilityTypeLabel } from '../lib/facility-meta';

export interface FacilityFormSheetProps {
  projectId: string | undefined;
  buildings: FilterBuilding[];
  /** The facility being edited; null = create. */
  editing: Facility | null;
  /** Building preselected for a new facility (the current filter). */
  defaultBuildingId: string | undefined;
  /** Bumped by the screen each time the sheet opens, to re-seed the form. */
  openCount: number;
}

const resolver = zodFormResolver(facilityFormSchema);

export const FacilityFormSheet = forwardRef<BottomSheetRef, FacilityFormSheetProps>(
  function FacilityFormSheet({ projectId, buildings, editing, defaultBuildingId, openCount }, ref) {
    const { t } = useTranslation();
    const rtlText = useRtlTextStyle();
    const push = useToastStore((s) => s.push);
    const save = useSaveFacility();
    const form = useForm<FacilityFormInput, unknown, FacilityFormValues>({
      resolver,
      defaultValues: emptyFacilityForm(defaultBuildingId ?? null),
    });

    useEffect(() => {
      form.reset(editing ? facilityToForm(editing) : emptyFacilityForm(defaultBuildingId ?? null));
      // Re-seed only when the sheet is (re)opened, never while the user types.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openCount]);

    const limit = form.watch('limitAdvanceBooking');
    const errorText = (key: string | undefined): string | undefined => (key ? t(key) : undefined);

    const submit = form.handleSubmit((values) => {
      if (!projectId) return;
      save.mutate(
        { id: editing?.id, payload: toFacilityPayload(values, projectId) },
        {
          onSuccess: () => {
            push({
              variant: 'success',
              title: editing ? t('fm.facilities.updated') : t('fm.facilities.created'),
            });
            if (ref && typeof ref === 'object') ref.current?.dismiss();
          },
          // The sheet stays open with the user's values intact.
          onError: (error) =>
            showApiErrorToast(push, error, t, { fallbackTitle: t('fm.facilities.saveFailed') }),
        },
      );
    });

    return (
      <BottomSheet
        ref={ref}
        scrollable
        snapPoints={['92%']}
        footer={
          <Button
            label={t('common.save')}
            fullWidth
            loading={save.isPending}
            disabled={save.isPending || !projectId}
            onPress={() => void submit()}
          />
        }
      >
        <Text style={[styles.heading, rtlText]} accessibilityRole="header">
          {editing ? t('fm.facilities.edit') : t('fm.facilities.new')}
        </Text>
        <View style={styles.fields}>
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Input
                label={t('fm.facilities.field.name')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                maxLength={NAME_MAX}
                error={errorText(fieldState.error?.message)}
              />
            )}
          />

          <Controller
            control={form.control}
            name="facilityType"
            render={({ field, fieldState }) => (
              <View style={styles.group}>
                <FieldLabel label={t('fm.facilities.field.type')} />
                <ChipRow wrap>
                  {FACILITY_TYPES.map((type) => (
                    <Chip
                      key={type}
                      label={facilityTypeLabel(type, t)}
                      selected={field.value === type}
                      onPress={() => field.onChange(type)}
                    />
                  ))}
                </ChipRow>
                {fieldState.error?.message ? (
                  <Text style={styles.error}>{t(fieldState.error.message)}</Text>
                ) : null}
              </View>
            )}
          />

          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <View style={styles.group}>
                <FieldLabel
                  label={t('fm.facilities.field.description')}
                  count={field.value.length}
                  max={DESCRIPTION_MAX}
                />
                <FormTextArea
                  bottomSheet
                  minHeight={96}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  maxLength={DESCRIPTION_MAX}
                  accessibilityLabel={t('fm.facilities.field.description')}
                  error={errorText(fieldState.error?.message)}
                />
              </View>
            )}
          />

          <Controller
            control={form.control}
            name="location"
            render={({ field, fieldState }) => (
              <Input
                label={t('fm.facilities.field.location')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                maxLength={LOCATION_MAX}
                error={errorText(fieldState.error?.message)}
              />
            )}
          />

          <Controller
            control={form.control}
            name="capacity"
            render={({ field, fieldState }) => (
              <Input
                label={t('fm.facilities.field.capacity')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="number-pad"
                maxLength={6}
                error={errorText(fieldState.error?.message)}
              />
            )}
          />

          <Controller
            control={form.control}
            name="buildingId"
            render={({ field }) => (
              <View style={styles.group}>
                <FieldLabel label={t('fm.facilities.field.scope')} />
                <ChipRow wrap>
                  <Chip
                    label={t('fm.facilities.scopeProjectWide')}
                    selected={field.value === null}
                    onPress={() => field.onChange(null)}
                  />
                  {buildings.map((b) => (
                    <Chip
                      key={b.buildingCode}
                      label={b.buildingName}
                      selected={field.value === String(b.buildingId)}
                      onPress={() => field.onChange(String(b.buildingId))}
                    />
                  ))}
                </ChipRow>
              </View>
            )}
          />

          <Controller
            control={form.control}
            name="requiresApproval"
            render={({ field }) => (
              <SwitchRow
                label={t('fm.facilities.requiresApproval')}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />

          <Controller
            control={form.control}
            name="limitAdvanceBooking"
            render={({ field }) => (
              <SwitchRow
                label={t('fm.facilities.limitAdvance')}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          {limit ? (
            <Controller
              control={form.control}
              name="advanceBookingDays"
              render={({ field, fieldState }) => (
                <Input
                  label={t('fm.facilities.advanceDays')}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  keyboardType="number-pad"
                  maxLength={3}
                  helper={t('fm.facilities.advanceDaysHelp')}
                  error={errorText(fieldState.error?.message)}
                />
              )}
            />
          ) : null}

          <Controller
            control={form.control}
            name="maxDurationHours"
            render={({ field, fieldState }) => (
              <Input
                label={t('fm.facilities.maxDuration')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="number-pad"
                maxLength={2}
                helper={t('fm.facilities.maxDurationHelp')}
                error={errorText(fieldState.error?.message)}
              />
            )}
          />
        </View>
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
  group: { gap: theme.spacing[8] },
  error: { fontSize: theme.type.body.sm.size, color: theme.colors.error },
}));
