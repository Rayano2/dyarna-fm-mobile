import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE } from '@/shared/query';
import {
  createBuildingInfo,
  deleteAttachment,
  deleteBuildingInfo,
  getAttachmentLink,
  listAttachments,
  listBuildingInfo,
  setBuildingInfoActive,
  updateBuildingInfo,
  uploadAttachment,
  type AttachmentLink,
  type BuildingInfoAttachment,
  type BuildingInfoItem,
  type BuildingInfoPayload,
  type UploadFile,
} from '../api/building-info-api';

/** Prefix for every FM building-info list and attachments cache. */
const MANAGE_PREFIX = ['community', 'building-info', 'manage'] as const;

export function useBuildingInfoManage(
  projectId: string | undefined,
  buildingId: string | undefined,
): UseQueryResult<BuildingInfoItem[]> {
  return useQuery({
    queryKey: queryKeys.community.fmBuildingInfo(projectId, buildingId),
    queryFn: () => listBuildingInfo(projectId!, buildingId),
    enabled: !!projectId,
    staleTime: STALE.LIST,
  });
}

export function useBuildingInfoAttachments(
  itemId: string | undefined,
): UseQueryResult<BuildingInfoAttachment[]> {
  return useQuery({
    queryKey: queryKeys.community.fmBuildingInfoAttachments(itemId),
    queryFn: () => listAttachments(itemId!),
    enabled: !!itemId,
    staleTime: STALE.DETAIL,
  });
}

function useInvalidateManage(): () => Promise<void> {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: MANAGE_PREFIX });
}

export interface SaveItemInput {
  id: string | undefined;
  payload: BuildingInfoPayload;
}

export function useSaveBuildingInfo(): UseMutationResult<
  BuildingInfoItem | null,
  Error,
  SaveItemInput
> {
  const invalidate = useInvalidateManage();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateBuildingInfo(id, payload) : createBuildingInfo(payload),
    onSuccess: () => invalidate(),
  });
}

export function useSetBuildingInfoActive(): UseMutationResult<
  void,
  Error,
  { id: string; active: boolean }
> {
  const invalidate = useInvalidateManage();
  return useMutation({
    mutationFn: ({ id, active }) => setBuildingInfoActive(id, active),
    onSettled: () => invalidate(),
  });
}

export function useDeleteBuildingInfo(): UseMutationResult<void, Error, { id: string }> {
  const invalidate = useInvalidateManage();
  return useMutation({
    mutationFn: ({ id }) => deleteBuildingInfo(id),
    onSuccess: () => invalidate(),
  });
}

export function useUploadAttachment(): UseMutationResult<
  BuildingInfoAttachment | null,
  Error,
  { itemId: string; file: UploadFile }
> {
  const invalidate = useInvalidateManage();
  return useMutation({
    mutationFn: ({ itemId, file }) => uploadAttachment(itemId, file),
    onSettled: () => invalidate(),
  });
}

export function useDeleteAttachment(): UseMutationResult<
  void,
  Error,
  { itemId: string; attachmentId: string }
> {
  const invalidate = useInvalidateManage();
  return useMutation({
    mutationFn: ({ itemId, attachmentId }) => deleteAttachment(itemId, attachmentId),
    onSettled: () => invalidate(),
  });
}

/** Mints a link per tap. A mutation, not a query, so nothing is ever prefetched or cached. */
export function useAttachmentLink(): UseMutationResult<
  AttachmentLink,
  Error,
  { itemId: string; attachmentId: string }
> {
  return useMutation({
    mutationFn: ({ itemId, attachmentId }) => getAttachmentLink(itemId, attachmentId),
  });
}
