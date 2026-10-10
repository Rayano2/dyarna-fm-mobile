import {
  useMutation,
  useQuery,
  useQueryClient,
  type MutationOptions,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
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

export interface ToggleContext {
  previous: Todo[] | undefined;
}

/**
 * Flips `isCompleted` in the cached list immediately, restores the snapshot if
 * the PATCH fails, and re-syncs every todo query either way. Plain options (not
 * inlined in the hook) so the rollback is testable with a bare QueryClient.
 */
export function toggleTodoOptions(
  qc: QueryClient,
): MutationOptions<void, Error, number, ToggleContext> {
  return {
    mutationFn: toggleTodo,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.bms.todosList });
      const previous = qc.getQueryData<Todo[]>(queryKeys.bms.todosList);
      qc.setQueryData<Todo[]>(queryKeys.bms.todosList, (list) =>
        list?.map((todo) =>
          todo.todoId === id ? { ...todo, isCompleted: !todo.isCompleted } : todo,
        ),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) qc.setQueryData(queryKeys.bms.todosList, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.bms.todos }),
  };
}

export function useToggleTodo(): UseMutationResult<void, Error, number, ToggleContext> {
  const qc = useQueryClient();
  return useMutation(toggleTodoOptions(qc));
}
