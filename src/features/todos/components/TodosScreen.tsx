import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ShellHeader } from '@/features/shell';
import { useQueryErrorToast } from '@/shared/hooks/useQueryErrorToast';
import {
  Button,
  EmptyState,
  Icons,
  Screen,
  SegmentedPill,
  Skeleton,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import type { Todo } from '../api/todos-api';
import { useTodos, useToggleTodo } from '../hooks/useTodos';
import { groupTodos } from '../lib/todo-order';
import { DeleteTodoSheet } from './DeleteTodoSheet';
import { TodoFormSheet } from './TodoFormSheet';
import { TodoRow } from './TodoRow';

type Segment = 'active' | 'completed';

function TodosSkeleton(): React.JSX.Element {
  return (
    <View style={styles.list}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={72} radius={16} />
      ))}
    </View>
  );
}

export function TodosScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const [segment, setSegment] = useState<Segment>('active');
  const [editing, setEditing] = useState<Todo | null>(null);
  const [deleting, setDeleting] = useState<Todo | null>(null);
  const formSheet = useRef<BottomSheetRef>(null);
  const deleteSheet = useRef<BottomSheetRef>(null);

  const query = useTodos();
  const { refetch } = query;
  const { mutate: toggleTodo } = useToggleTodo();
  const [refreshing, setRefreshing] = useState(false);
  useQueryErrorToast(query.error, query.errorUpdatedAt);
  const sections = useMemo(() => groupTodos(query.data ?? []), [query.data]);

  const openAdd = useCallback(() => {
    setEditing(null);
    formSheet.current?.present();
  }, []);
  const onEdit = useCallback((todo: Todo) => {
    setEditing(todo);
    formSheet.current?.present();
  }, []);
  const onDelete = useCallback((todo: Todo) => {
    setDeleting(todo);
    deleteSheet.current?.present();
  }, []);
  // Failures are toasted (and rolled back) inside useToggleTodo.
  const onToggle = useCallback((todo: Todo) => toggleTodo(todo.todoId), [toggleTodo]);
  // A local flag, not `isRefetching`, so mutation-driven refetches don't spin the control.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderRows = (todos: Todo[]): React.JSX.Element[] =>
    todos.map((todo) => (
      <TodoRow
        key={todo.todoId}
        todo={todo}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ));

  let content: React.JSX.Element;
  if (query.isLoading) {
    content = <TodosSkeleton />;
  } else if (query.isError && !query.data) {
    content = (
      <EmptyState
        illustration={<Icons.Warning size={64} color={theme.colors.textMuted} weight="duotone" />}
        title={t('fm.todos.loadFailed')}
        cta={{ label: t('common.retry'), onPress: () => void refetch() }}
      />
    );
  } else if (segment === 'completed') {
    content =
      sections.completed.length > 0 ? (
        <View style={styles.list}>{renderRows(sections.completed)}</View>
      ) : (
        <EmptyState title={t('fm.todos.emptyCompleted')} />
      );
  } else if (sections.urgent.length === 0 && sections.active.length === 0) {
    content = (
      <EmptyState
        illustration={
          <Icons.ListChecks size={64} color={theme.colors.textMuted} weight="duotone" />
        }
        title={t('fm.todos.emptyActive')}
        cta={{ label: t('fm.todos.add'), onPress: openAdd }}
      />
    );
  } else {
    content = (
      <View style={styles.list}>
        {sections.urgent.length > 0 ? (
          <View style={styles.urgent} testID="todos-urgent">
            <View style={styles.urgentHeader}>
              <Icons.Warning size={16} color={theme.colors.gold} weight="bold" />
              <Text style={[styles.urgentTitle, rtlText]} accessibilityRole="header">
                {t('fm.todos.urgent')}
              </Text>
            </View>
            {renderRows(sections.urgent)}
          </View>
        ) : null}
        {renderRows(sections.active)}
      </View>
    );
  }

  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-todos-screen">
      <ShellHeader title={t('fm.todos.title')} showBack />
      <View style={styles.controls}>
        <SegmentedPill<Segment>
          fullWidth
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'active', label: t('fm.todos.active') },
            { value: 'completed', label: t('fm.todos.completed') },
          ]}
        />
        <Button
          label={t('fm.todos.add')}
          fullWidth
          leadingIcon={<Icons.Plus size={18} color={theme.colors.textOnPrimary} weight="bold" />}
          onPress={openAdd}
          testID="todos-add"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
      >
        {content}
      </ScrollView>
      <TodoFormSheet ref={formSheet} todo={editing} onDismiss={() => setEditing(null)} />
      <DeleteTodoSheet ref={deleteSheet} todo={deleting} onDismiss={() => setDeleting(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  controls: {
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[12],
    gap: theme.spacing[12],
  },
  scroll: { paddingBottom: theme.spacing[96], flexGrow: 1 },
  list: { paddingHorizontal: theme.spacing[16], gap: theme.spacing[12] },
  urgent: {
    gap: theme.spacing[8],
    padding: theme.spacing[12],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.goldSubtle,
  },
  urgentHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[6] },
  urgentTitle: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
}));
