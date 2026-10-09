import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import {
  createAnnouncement,
  deleteAnnouncement,
  getResidentCount,
  listAnnouncements,
  setAnnouncementPinned,
  type AnnouncementPage,
  type CreateAnnouncementInput,
} from '../api/announcements-api';

export function useAnnouncements(
  projectId: string | undefined,
): UseInfiniteQueryResult<InfiniteData<AnnouncementPage, string | undefined>> {
  return useInfiniteQuery({
    queryKey: queryKeys.community.fmAnnouncements(projectId),
    queryFn: ({ pageParam }) => listAnnouncements(projectId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!projectId,
    staleTime: STALE.LIST,
  });
}

/** Resident count for the confirm step. Never errors: a failure reads as 0 and must not block sending. */
export function useResidentCount(
  projectId: string | undefined,
  enabled: boolean,
): UseQueryResult<number> {
  return useQuery({
    queryKey: queryKeys.bms.residentCount(projectId),
    queryFn: () => getResidentCount(projectId!),
    enabled: enabled && !!projectId,
    staleTime: STALE.LIST,
  });
}

function useInvalidateAnnouncements(): (projectId: string) => Promise<void> {
  const qc = useQueryClient();
  return (projectId) =>
    qc.invalidateQueries({ queryKey: queryKeys.community.fmAnnouncements(projectId) });
}

export function useCreateAnnouncement(): UseMutationResult<void, Error, CreateAnnouncementInput> {
  const invalidate = useInvalidateAnnouncements();
  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: (_data, input) => invalidate(input.projectId),
  });
}

export interface PinInput {
  projectId: string;
  id: string;
  isPinned: boolean;
}

export function usePinAnnouncement(): UseMutationResult<void, Error, PinInput> {
  const invalidate = useInvalidateAnnouncements();
  return useMutation({
    mutationFn: ({ id, isPinned }) => setAnnouncementPinned(id, isPinned),
    onSettled: (_data, _error, input) => invalidate(input.projectId),
  });
}

export interface DeleteInput {
  projectId: string;
  id: string;
}

export function useDeleteAnnouncement(): UseMutationResult<void, Error, DeleteInput> {
  const invalidate = useInvalidateAnnouncements();
  return useMutation({
    mutationFn: ({ id }) => deleteAnnouncement(id),
    onSuccess: (_data, input) => invalidate(input.projectId),
  });
}
