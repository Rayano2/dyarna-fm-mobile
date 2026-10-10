import {
  useMutation,
  useQuery,
  useQueryClient,
  type MutationOptions,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import { useToastStore } from '@/shared/stores/toastStore';
// Direct module: the '@/shared/ui' barrel pulls in React Native components.
import { showApiErrorToast } from '@/shared/ui/error-toast';
import {
  createTodo,
  deleteTodo,
  listTodos,
  toggleTodo,
  updateTodo,
  type Todo,
  type TodoInput,
} from '../api/todos-api';

export function useTodos(): UseQueryResult<Todo[]> {
  return useQuery({
    queryKey: queryKeys.bms.todosList,
    queryFn: listTodos,
    staleTime: STALE.LIST,
  });
}

/** Invalidates every `['bms','todos',…]` query, incl. the dashboard's `todosActive` KPI. */
function useInvalidateTodos(): () => Promise<void> {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.bms.todos });
}

export function useCreateTodo(): UseMutationResult<void, Error, TodoInput> {
  const invalidate = useInvalidateTodos();
  return useMutation({ mutationFn: createTodo, onSuccess: () => invalidate() });
}

export interface UpdateTodoInput {
  id: number;
  input: TodoInput;
}

export function useUpdateTodo(): UseMutationResult<void, Error, UpdateTodoInput> {
  const invalidate = useInvalidateTodos();
  return useMutation({
    mutationFn: ({ id, input }) => updateTodo(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteTodo(): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateTodos();
  return useMutation({ mutationFn: deleteTodo, onSuccess: () => invalidate() });
}

function flipTodo(qc: QueryClient, id: number): void {
  qc.setQueryData<Todo[]>(queryKeys.bms.todosList, (list) =>
    list?.map((todo) => (todo.todoId === id ? { ...todo, isCompleted: !todo.isCompleted } : todo)),
  );
}

/**
 * Flips `isCompleted` in the cached list immediately and re-syncs every todo
 * query when settled. On failure only THAT todo is flipped back, so a rapid
 * toggle of another row (or a second toggle of the same row that succeeded on
 * the server) is not wiped out by restoring a stale snapshot. `onFailure` runs
 * at the hook level, so it fires even if the row has re-rendered or unmounted.
 * Plain options (not inlined in the hook) so the rollback is testable with a
 * bare QueryClient.
 */
export function toggleTodoOptions(
  qc: QueryClient,
  onFailure?: (error: Error) => void,
): MutationOptions<void, Error, number> {
  return {
    mutationFn: toggleTodo,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.bms.todosList });
      flipTodo(qc, id);
    },
    onError: (error, id) => {
      flipTodo(qc, id);
      onFailure?.(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.bms.todos }),
  };
}

export function useToggleTodo(): UseMutationResult<void, Error, number> {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const push = useToastStore((s) => s.push);
  return useMutation(
    toggleTodoOptions(qc, (error) =>
      showApiErrorToast(push, error, t, { fallbackTitle: t('fm.todos.toggleFailed') }),
    ),
  );
}
