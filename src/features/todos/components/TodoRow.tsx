import { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useLocaleStore } from '@/shared/stores/localeStore';
import { Badge, Card, HapticPressable, Icons, useRtlTextStyle, type BadgeTone } from '@/shared/ui';
import type { Todo, TodoPriority } from '../api/todos-api';
import { getDueStatus, type DueStatus } from '../lib/due-status';
import { formatDueShort } from '../lib/format-due';
import { parseLocalDateTime } from '../lib/local-date-time';

export interface TodoRowProps {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

const PRIORITY_TONE: Record<TodoPriority, BadgeTone> = {
  LOW: 'neutral',
  MEDIUM: 'goldMuted',
  HIGH: 'gold',
};

function dueTone(status: DueStatus | null): BadgeTone {
  switch (status) {
    case 'overdue': {
      return 'danger';
    }
    case 'today': {
      return 'gold';
    }
    case 'tomorrow': {
      return 'goldMuted';
    }
    default: {
      return 'neutral';
    }
  }
}

/** 44px effective target for the 24px checkbox and 20px trash icon. */
const HIT_SLOP = 12;

export const TodoRow = memo(function TodoRow({
  todo,
  onToggle,
  onEdit,
  onDelete,
}: TodoRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const locale = useLocaleStore((s) => s.locale);
  const done = todo.isCompleted;
  const due = parseLocalDateTime(todo.dueDate);
  const status = done ? null : getDueStatus(todo.dueDate);

  const dueLabel =
    status === 'overdue'
      ? t('fm.todos.due.overdue')
      : status === 'today'
        ? t('fm.todos.due.today')
        : status === 'tomorrow'
          ? t('fm.todos.due.tomorrow')
          : due
            ? formatDueShort(due, locale)
            : '';
  const priorityLabel = t(`fm.todos.priority.${todo.priority}`);
  // The badges are colour-coded; the label carries the same facts as text.
  const rowLabel = [todo.title, priorityLabel, dueLabel].filter(Boolean).join(', ');
  const DueIcon = status === 'overdue' ? Icons.Warning : status ? Icons.Clock : Icons.CalendarBlank;
  const dueTextColor =
    status === 'overdue'
      ? theme.colors.textOnPrimary
      : status === 'today'
        ? theme.colors.gold
        : theme.colors.textSecondary;

  return (
    <Card style={[styles.card, done && styles.cardDone]} padded={false}>
      <View style={styles.row}>
        <HapticPressable
          onPress={() => onToggle(todo)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={todo.title}
          hitSlop={HIT_SLOP}
          style={[styles.checkbox, done && styles.checkboxChecked]}
          testID={`todo-toggle-${todo.todoId}`}
        >
          {done ? <Icons.Check size={16} color={theme.colors.textOnPrimary} weight="bold" /> : null}
        </HapticPressable>

        <HapticPressable
          onPress={() => onEdit(todo)}
          scaleOnPress={1}
          style={styles.body}
          accessibilityRole="button"
          accessibilityLabel={rowLabel}
          accessibilityHint={t('fm.todos.editHint')}
          testID={`todo-row-${todo.todoId}`}
        >
          <Text style={[styles.title, done && styles.titleDone, rtlText]} numberOfLines={2}>
            {todo.title}
          </Text>
          {todo.description ? (
            <Text style={[styles.description, rtlText]} numberOfLines={1}>
              {todo.description}
            </Text>
          ) : null}
          <View style={styles.badges}>
            <Badge size="sm" tone={PRIORITY_TONE[todo.priority]} label={priorityLabel} />
            {dueLabel ? (
              <Badge
                size="sm"
                tone={dueTone(status)}
                label={dueLabel}
                icon={<DueIcon size={12} color={dueTextColor} weight="bold" />}
              />
            ) : null}
          </View>
        </HapticPressable>

        <HapticPressable
          onPress={() => onDelete(todo)}
          accessibilityRole="button"
          accessibilityLabel={t('fm.todos.delete')}
          hitSlop={HIT_SLOP}
          style={styles.trash}
          testID={`todo-delete-${todo.todoId}`}
        >
          <Icons.Trash size={20} color={theme.colors.textMuted} />
        </HapticPressable>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create((theme) => ({
  card: { paddingHorizontal: theme.spacing[12], paddingVertical: theme.spacing[12] },
  cardDone: { opacity: 0.75 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[12] },
  checkbox: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  body: { flex: 1, gap: theme.spacing[4] },
  title: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  titleDone: { textDecorationLine: 'line-through', color: theme.colors.textMuted },
  description: { fontSize: theme.type.body.sm.size, color: theme.colors.textMuted },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[6],
    marginTop: theme.spacing[4],
  },
  trash: { padding: 2 },
}));
