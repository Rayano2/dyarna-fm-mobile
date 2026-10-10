import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { useToastStore } from '@/shared/stores/toastStore';
import {
  BottomSheet,
  Button,
  showApiErrorToast,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import type { Todo } from '../api/todos-api';
import { useDeleteTodo } from '../hooks/useTodos';

export interface DeleteTodoSheetProps {
  todo: Todo | null;
  onDismiss: () => void;
}

/** Delete confirm, styled like the LogoutRow confirm sheet. */
export const DeleteTodoSheet = forwardRef<BottomSheetRef, DeleteTodoSheetProps>(
  function DeleteTodoSheet({ todo, onDismiss }, ref) {
    const { t } = useTranslation();
    const rtlText = useRtlTextStyle();
    const push = useToastStore((s) => s.push);
    const remove = useDeleteTodo();

    const dismiss = (): void => {
      if (ref && typeof ref === 'object') ref.current?.dismiss();
    };

    const confirm = (): void => {
      if (!todo) return;
      remove.mutate(todo.todoId, {
        onSuccess: () => {
          push({ variant: 'success', title: t('fm.todos.deleted') });
          dismiss();
        },
        onError: (error) => {
          showApiErrorToast(push, error, t, { fallbackTitle: t('fm.todos.deleteFailed') });
        },
      });
    };

    return (
      <BottomSheet ref={ref} snapPoints={['30%']} onDismiss={onDismiss}>
        <View style={styles.sheet}>
          <Text style={[styles.title, rtlText]}>{t('fm.todos.deleteTitle')}</Text>
          <Text style={[styles.body, rtlText]}>{t('fm.todos.deleteBody')}</Text>
          <View style={styles.actions}>
            <Button
              label={t('fm.todos.delete')}
              variant="destructive"
              fullWidth
              loading={remove.isPending}
              disabled={remove.isPending || !todo}
              onPress={confirm}
              testID="todo-delete-confirm"
            />
            <Button
              label={t('common.cancel')}
              variant="ghost"
              fullWidth
              disabled={remove.isPending}
              onPress={dismiss}
            />
          </View>
        </View>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create((theme) => ({
  sheet: {
    paddingHorizontal: theme.spacing[20],
    paddingTop: theme.spacing[8],
    gap: theme.spacing[8],
  },
  title: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  body: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textSecondary,
  },
  actions: {
    marginTop: theme.spacing[16],
    gap: theme.spacing[8],
  },
}));
