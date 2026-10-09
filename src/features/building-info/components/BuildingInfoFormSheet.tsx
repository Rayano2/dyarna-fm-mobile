import { forwardRef, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { FieldLabel, zodFormResolver, type ScopeBuilding } from '@/features/scope';
import { useLocaleStore } from '@/shared/stores/localeStore';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  BottomSheet,
  Button,
  Chip,
  ChipRow,
  DatePickerModal,
  FormTextArea,
  HapticPressable,
  Icons,
  Input,
  SwitchRow,
  showApiErrorToast,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import type { BuildingInfoItem } from '../api/building-info-api';
import { useSaveBuildingInfo } from '../hooks/useBuildingInfoManage';
import {
  BODY_MAX,
  SUMMARY_MAX,
  TITLE_MAX,
  buildingInfoFormSchema,
  emptyBuildingInfoForm,
  endOfLocalDayIso,
  itemToForm,
  toBuildingInfoPayload,
  type BuildingInfoFormInput,
  type BuildingInfoFormValues,
} from '../lib/building-info-form';
import { BUILDING_INFO_CATEGORIES, categoryLabel } from '../lib/building-info-meta';
import { AttachmentManager } from './AttachmentManager';
import { formatExpiry } from './BuildingInfoCard';

export interface BuildingInfoFormSheetProps {
  projectId: string | undefined;
  buildings: ScopeBuilding[];
  editing: BuildingInfoItem | null;
  defaultBuildingId: string | undefined;
  /** Bumped by the screen each time the sheet opens, to re-seed the form. */
  openCount: number;
}

const resolver = zodFormResolver(buildingInfoFormSchema);

function tomorrow(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

export const BuildingInfoFormSheet = forwardRef<BottomSheetRef, BuildingInfoFormSheetProps>(
  function BuildingInfoFormSheet(
    { projectId, buildings, editing, defaultBuildingId, openCount },
    ref,
  ) {
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const locale = useLocaleStore((s) => s.locale);
    const rtlText = useRtlTextStyle();
    const push = useToastStore((s) => s.push);
    const save = useSaveBuildingInfo();
    const [pickerOpen, setPickerOpen] = useState(false);
    /** Set after a create, so the sheet flips to edit mode and files can be attached. */
    const [savedId, setSavedId] = useState<string | undefined>();
    const form = useForm<BuildingInfoFormInput, unknown, BuildingInfoFormValues>({
      resolver,
      defaultValues: emptyBuildingInfoForm(defaultBuildingId ?? null),
    });

    useEffect(() => {
      setSavedId(undefined);
      form.reset(editing ? itemToForm(editing) : emptyBuildingInfoForm(defaultBuildingId ?? null));
      // Re-seed only when the sheet is (re)opened, never while the user types.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openCount]);

    const itemId = editing?.id ?? savedId;
    const errorText = (key: string | undefined): string | undefined => (key ? t(key) : undefined);

    const submit = form.handleSubmit((values) => {
      if (!projectId) return;
      save.mutate(
        { id: itemId, payload: toBuildingInfoPayload(values, projectId) },
        {
          onSuccess: (saved) => {
            if (!itemId && saved) {
              // Stay open so the rep can attach files to the item just created.
              setSavedId(saved.id);
              push({ variant: 'success', title: t('fm.buildingInfo.createdKeepOpen') });
              return;
            }
            push({ variant: 'success', title: t('fm.buildingInfo.updated') });
            if (ref && typeof ref === 'object') ref.current?.dismiss();
          },
          // The sheet stays open with the user's values intact.
          onError: (error) =>
            showApiErrorToast(push, error, t, { fallbackTitle: t('fm.buildingInfo.saveFailed') }),
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
          {itemId ? t('fm.buildingInfo.edit') : t('fm.buildingInfo.new')}
        </Text>
        <View style={styles.fields}>
          <Controller
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <Input
                label={t('fm.buildingInfo.field.title')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                maxLength={TITLE_MAX}
                error={errorText(fieldState.error?.message)}
              />
            )}
          />
          <Controller
            control={form.control}
            name="summary"
            render={({ field, fieldState }) => (
              <View style={styles.group}>
                <FieldLabel
                  label={t('fm.buildingInfo.field.summary')}
                  count={field.value.length}
                  max={SUMMARY_MAX}
                />
                <FormTextArea
                  bottomSheet
                  minHeight={72}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  maxLength={SUMMARY_MAX}
                  accessibilityLabel={t('fm.buildingInfo.field.summary')}
                  error={errorText(fieldState.error?.message)}
                />
              </View>
            )}
          />
          <Controller
            control={form.control}
            name="body"
            render={({ field, fieldState }) => (
              <View style={styles.group}>
                <FieldLabel
                  label={t('fm.buildingInfo.field.body')}
                  count={field.value.length}
                  max={BODY_MAX}
                />
                <FormTextArea
                  bottomSheet
                  minHeight={140}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  maxLength={BODY_MAX}
                  accessibilityLabel={t('fm.buildingInfo.field.body')}
                  error={errorText(fieldState.error?.message)}
                />
              </View>
            )}
          />
          <Controller
            control={form.control}
            name="categoryCode"
            render={({ field }) => (
              <View style={styles.group}>
                <FieldLabel label={t('fm.buildingInfo.field.category')} />
                <ChipRow wrap>
                  {BUILDING_INFO_CATEGORIES.map((c) => (
                    <Chip
                      key={c}
                      label={categoryLabel(c, t)}
                      selected={field.value === c}
                      onPress={() => field.onChange(c)}
                    />
                  ))}
                </ChipRow>
              </View>
            )}
          />
          <Controller
            control={form.control}
            name="buildingId"
            render={({ field }) => (
              <View style={styles.group}>
                <FieldLabel label={t('fm.buildingInfo.field.scope')} />
                <ChipRow wrap>
                  <Chip
                    label={t('fm.buildingInfo.scopeProjectWide')}
                    selected={field.value === null}
                    onPress={() => field.onChange(null)}
                  />
                  {buildings.map((b) => (
                    <Chip
                      key={b.buildingId}
                      label={b.buildingName}
                      selected={field.value === b.buildingId}
                      onPress={() => field.onChange(b.buildingId)}
                    />
                  ))}
                </ChipRow>
              </View>
            )}
          />
          <Controller
            control={form.control}
            name="expiresOn"
            render={({ field, fieldState }) => (
              <View style={styles.group}>
                <SwitchRow
                  label={t('fm.buildingInfo.noExpiry')}
                  value={field.value === null}
                  onValueChange={(noExpiry) => {
                    if (noExpiry) {
                      field.onChange(null);
                    } else {
                      field.onChange(tomorrow());
                      setPickerOpen(true);
                    }
                  }}
                />
                {field.value ? (
                  <HapticPressable
                    onPress={() => setPickerOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('fm.buildingInfo.expires', {
                      date: formatExpiry(endOfLocalDayIso(field.value), locale),
                    })}
                    style={styles.dateButton}
                  >
                    <Icons.CalendarBlank
                      size={18}
                      color={theme.colors.textSecondary}
                      weight="regular"
                    />
                    <Text style={[styles.dateText, rtlText]}>
                      {t('fm.buildingInfo.expires', {
                        date: formatExpiry(endOfLocalDayIso(field.value), locale),
                      })}
                    </Text>
                  </HapticPressable>
                ) : null}
                {fieldState.error?.message ? (
                  <Text style={styles.error}>{t(fieldState.error.message)}</Text>
                ) : null}
                <DatePickerModal
                  visible={pickerOpen}
                  value={field.value ?? tomorrow()}
                  mode="date"
                  minimumDate={new Date()}
                  doneLabel={t('common.done')}
                  onClose={() => setPickerOpen(false)}
                  onChange={(date, type) => {
                    if (type === 'set') field.onChange(date);
                  }}
                />
              </View>
            )}
          />

          <AttachmentManager itemId={itemId} />
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[8],
    minHeight: 48,
    paddingHorizontal: theme.spacing[12],
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  dateText: { flex: 1, fontSize: theme.type.body.md.size, color: theme.colors.textPrimary },
  error: { fontSize: theme.type.body.sm.size, color: theme.colors.error },
}));
