import { ApiError } from '@/shared/api/errors';
import { queryKeys } from '@/shared/api/query-keys';
import { rejectResidentRequest } from '../api/requests';

/** BMS `UNIT_ALREADY_ASSIGNED`: the unit was taken between opening the sheet and approving. */
export const UNIT_TAKEN_CODE = 'BMS_400_14';

export function isUnitTakenError(error: unknown): boolean {
  return error instanceof ApiError && error.code === UNIT_TAKEN_CODE;
}

/**
 * What the approve sheet does after the PATCH settles. The sheet applies these
 * effects verbatim, so the rules live here, where they can be tested.
 */
export type ApproveEffect =
  | {
      kind: 'approved';
      closeSheet: true;
      toast: 'approvedToast';
      invalidate: readonly (readonly unknown[])[];
    }
  | {
      kind: 'unitTaken';
      /** Keep the sheet open so the FM can pick another unit right away. */
      closeSheet: false;
      clearSelection: true;
      refetchUnits: true;
      toast: 'unitTaken';
      invalidate: readonly (readonly unknown[])[];
    }
  | {
      kind: 'failed';
      closeSheet: false;
      toast: 'approveFailed';
      invalidate: readonly (readonly unknown[])[];
    };

/** Lists that change once a request is decided (including the dashboard count). */
export const DECIDED_INVALIDATIONS: readonly (readonly unknown[])[] = [
  queryKeys.fmResidents.requests,
  queryKeys.fmResidents.dashboardInfo,
];

export function approveSuccessEffect(): ApproveEffect {
  return {
    kind: 'approved',
    closeSheet: true,
    toast: 'approvedToast',
    // The unit is now occupied, so every cached unit list is stale as well.
    invalidate: [
      ...DECIDED_INVALIDATIONS,
      queryKeys.fmResidents.buildingUnitsAll,
      queryKeys.bms.propertiesList,
    ],
  };
}

/**
 * Any failed approve may mean the list is stale (the request was decided
 * elsewhere, or the unit was taken), so the requests list is refreshed too.
 */
const FAILED_INVALIDATIONS: readonly (readonly unknown[])[] = [queryKeys.fmResidents.requests];

export function approveErrorEffect(error: unknown): ApproveEffect {
  if (isUnitTakenError(error)) {
    return {
      kind: 'unitTaken',
      closeSheet: false,
      clearSelection: true,
      refetchUnits: true,
      toast: 'unitTaken',
      invalidate: FAILED_INVALIDATIONS,
    };
  }
  return {
    kind: 'failed',
    closeSheet: false,
    toast: 'approveFailed',
    invalidate: FAILED_INVALIDATIONS,
  };
}

export type RejectReasonError = 'reasonRequired';

export function validateRejectReason(reason: string): RejectReasonError | null {
  return reason.trim().length === 0 ? 'reasonRequired' : null;
}

export type RejectResult = { ok: true } | { ok: false; error: RejectReasonError };

/**
 * Reject with a required reason. A blank reason never reaches the network:
 * it comes back as a validation error the sheet shows inline. Server failures
 * still throw, so the mutation's error toast handles them.
 */
export async function submitReject(requestId: number, reason: string): Promise<RejectResult> {
  const error = validateRejectReason(reason);
  if (error) return { ok: false, error };
  await rejectResidentRequest(requestId, reason.trim());
  return { ok: true };
}
