import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { FieldLabel, zodFormResolver } from '@/features/scope';
import { useLocaleStore } from '@/shared/stores/localeStore';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  BottomSheet,
  Button,
  Chip,
  ChipRow,
  DatePickerModal,
  FormTextArea,
  Icons,
  Input,
  SettingsRow,
  showApiErrorToast,
  useRtlTextStyle,
  type BottomSheetRef,
  type PickerChangeType,
} from '@/shared/ui';
import { TODO_PRIORITIES, type Todo } from '../api/todos-api';
import { useCreateTodo, useUpdateTodo } from '../hooks/useTodos';
import { formatDueLong } from '../lib/format-due';
import { formatLocalDateTime, parseLocalDateTime } from '../lib/local-date-time';
import {
  applyPick,
  firstPickerStep,
  nextPickerStep,
  type TodoPickerStep,
} from '../lib/todo-picker';
import {
  EMPTY_TODO,
  TITLE_MAX,
  todoSchema,
  todoToForm,
  type TodoFormInput,
  type TodoFormValues,
} from '../lib/todo-schema';

export interface TodoFormSheetProps {
  /** The todo being edited, or null to add a new one. */
  todo: Todo | null;
  onDismiss: () => void;
}

const resolver = zodFormResolver(todoSchema);

/** Picker seed when there is no due date yet: the next full hour. */
function nextFullHour(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

/**
 * Add / edit a todo. The due date is picked with one combined dialog on iOS and
 * date-then-time on Android (lib/todo-picker), and stored as a local
 * wall-clock string; see lib/local-date-time.
 */
export const TodoFormSheet = forwardRef<BottomSheetRef, TodoFormSheetProps>(function TodoFormSheet(
  { todo, onDismiss },
  ref,
) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const locale = useLocaleStore((s) => s.locale);
  const push = useToastStore((s) => s.push);
  const create = useCreateTodo();
  const update = useUpdateTodo();
  const pending = create.isPending || update.isPending;
  const [picker, setPicker] = useState<TodoPickerStep | null>(null);
  const [draft, setDraft] = useState<Date>(nextFullHour);
  // Refs mirror the picker state so onPick / onPickerClose stay referentially
  // stable: DatePickerModal's handler sits in the Android picker's effect deps,
  // and a fresh identity on every parent render would re-open the dialog.
  const pickerRef = useRef<TodoPickerStep | null>(null);
  const draftRef = useRef<Date>(draft);
  // Android closes its one-shot date dialog right after onChange; this
  // keeps that close from cancelling the advance to the time step.
  const advancing = useRef(false);

  const form = useForm<TodoFormInput, unknown, TodoFormValues>({
    resolver,
    defaultValues: EMPTY_TODO,
    mode: 'onChange',
  });
  const dueDate = form.watch('dueDate');
  const due = parseLocalDateTime(dueDate);

  useEffect(() => {
    form.reset(todo ? todoToForm(todo) : EMPTY_TODO);
  }, [todo, form]);

  // BMS PUT ignores a null dueDate, so a saved due date cannot be removed by
  // an edit. Only offer "Clear" when clearing will actually stick.
  const canClear = dueDate !== null && (todo === null || todo.dueDate === null);

  const dismiss = (): void => {
    if (ref && typeof ref === 'object') ref.current?.dismiss();
  };

  const { setValue } = form;

  const showPicker = useCallback((step: TodoPickerStep | null): void => {
    pickerRef.current = step;
    setPicker(step);
  }, []);

  const commit = useCallback(
    (next: Date): void => {
      draftRef.current = next;
      setDraft(next);
      setValue('dueDate', formatLocalDateTime(next), { shouldDirty: true });
    },
    [setValue],
  );

  const openPicker = (): void => {
    const seed = due ?? nextFullHour();
    draftRef.current = seed;
    setDraft(seed);
    showPicker(firstPickerStep(Platform.OS));
  };

  const onPick = useCallback(
    (date: Date, type: PickerChangeType): void => {
      const step = pickerRef.current;
      if (type === 'dismissed' || !step) return;
      commit(applyPick(step, draftRef.current, date));
      const next = nextPickerStep(step);
      if (next) {
        advancing.current = true;
        showPicker(next);
      }
    },
    [commit, showPicker],
  );

  const onPickerClose = useCallback((): void => {
    if (advancing.current) {
      advancing.current = false;
      return;
    }
    // iOS 'datetime' only reports changes, so Done on the untouched seed
    // (e.g. today, the next full hour) must still commit it.
    if (pickerRef.current === 'datetime') commit(draftRef.current);
    showPicker(null);
  }, [commit, showPicker]);

  const save = form.handleSubmit((values) => {
    const input = {
      title: values.title,
      description: values.description,
      priority: values.priority,
      dueDate: values.dueDate,
    };
    const handlers = {
      onSuccess: () => {
        push({ variant: 'success', title: t(todo ? 'fm.todos.updated' : 'fm.todos.saved') });
        dismiss();
      },
      onError: (error: Error) => {
        showApiErrorToast(push, error, t, { fallbackTitle: t('fm.todos.saveFailed') });
      },
    };
    if (todo) update.mutate({ id: todo.todoId, input }, handlers);
    else create.mutate(input, handlers);
  });

  const footer = (
    <View style={styles.footerRow}>
      <View style={styles.footerButton}>
        <Button
          label={t('common.cancel')}
          variant="secondary"
          fullWidth
          disabled={pending}
          onPress={dismiss}
        />
      </View>
      <View style={styles.footerButton}>
        <Button
          label={t('common.save')}
          fullWidth
          loading={pending}
          disabled={pending}
          onPress={() => void save()}
          testID="todo-save"
        />
      </View>
    </View>
  );

  return (
    <BottomSheet
      ref={ref}
      scrollable
      snapPoints={['85%']}
      footer={footer}
      onDismiss={() => {
        showPicker(null);
        form.reset(EMPTY_TODO);
        onDismiss();
      }}
    >
      <Text style={[styles.heading, rtlText]} accessibilityRole="header">
        {t(todo ? 'fm.todos.edit' : 'fm.todos.add')}
      </Text>
      <View style={styles.fields}>
        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <Input
              label={t('fm.todos.titleLabel')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              maxLength={TITLE_MAX}
              error={fieldState.error?.message ? t(fieldState.error.message) : undefined}
              testID="todo-title"
            />
          )}
        />
        <Controller
          control={form.control}
          name="description"
          render={({ field }) => (
            <View style={styles.area}>
              <FieldLabel label={t('fm.todos.descriptionLabel')} />
              <FormTextArea
                bottomSheet
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t('fm.todos.descriptionPlaceholder')}
                accessibilityLabel={t('fm.todos.descriptionLabel')}
              />
            </View>
          )}
        />
        <Controller
          control={form.control}
          name="priority"
          render={({ field }) => (
            <View style={styles.area}>
              <FieldLabel label={t('fm.todos.priorityLabel')} />
              <ChipRow wrap>
                {TODO_PRIORITIES.map((p) => (
                  <Chip
                    key={p}
                    label={t(`fm.todos.priority.${p}`)}
                    selected={field.value === p}
                    onPress={() => field.onChange(p)}
                  />
                ))}
              </ChipRow>
            </View>
          )}
        />
        <View style={styles.area}>
          <SettingsRow
            icon={<Icons.CalendarBlank size={20} color={theme.colors.textSecondary} />}
            label={t('fm.todos.dueDateLabel')}
            value={due ? formatDueLong(due, locale) : t('fm.todos.noDueDate')}
            chevron
            onPress={openPicker}
          />
          {canClear ? (
            <View style={styles.clearRow}>
              <Button
                label={t('fm.todos.clearDueDate')}
                variant="ghost"
                size="sm"
                hitSlop={8}
                onPress={() => form.setValue('dueDate', null, { shouldDirty: true })}
              />
            </View>
          ) : todo?.dueDate ? (
            <Text style={[styles.hint, rtlText]}>{t('fm.todos.dueDateLocked')}</Text>
          ) : null}
        </View>
      </View>
      <DatePickerModal
        // Remount between steps so Android opens a fresh time dialog.
        key={picker ?? 'closed'}
        visible={picker !== null}
        value={draft}
        mode={picker ?? 'date'}
        doneLabel={t('common.done')}
        onChange={onPick}
        onClose={onPickerClose}
      />
    </BottomSheet>
  );
});

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
  clearRow: { alignItems: 'flex-start' },
  hint: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  footerRow: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
}));
