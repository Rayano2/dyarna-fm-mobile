import { forwardRef, useEffect, useRef, useState } from 'react';
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
 * Add / edit a todo. The due date is picked in two steps (date, then time) and
 * stored as a local wall-clock string; see lib/local-date-time.
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
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [draft, setDraft] = useState<Date>(nextFullHour);
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

  const openPicker = (): void => {
    setDraft(due ?? nextFullHour());
    setPicker('date');
  };

  const onPick = (date: Date, type: PickerChangeType): void => {
    if (type === 'dismissed') return;
    if (picker === 'date') {
      const next = new Date(draft);
      next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setDraft(next);
      form.setValue('dueDate', formatLocalDateTime(next), { shouldDirty: true });
      if (Platform.OS !== 'ios') advancing.current = true;
      setPicker('time');
      return;
    }
    const next = new Date(draft);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setDraft(next);
    form.setValue('dueDate', formatLocalDateTime(next), { shouldDirty: true });
  };

  const onPickerClose = (): void => {
    if (advancing.current) {
      advancing.current = false;
      return;
    }
    setPicker(null);
  };

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
        setPicker(null);
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
  footerRow: { flexDirection: 'row', gap: theme.spacing[12] },
  footerButton: { flex: 1 },
}));
