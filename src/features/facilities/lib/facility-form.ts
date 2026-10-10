import { z } from 'zod';
import type { Facility, FacilityPayload } from '../api/facilities-api';
import { FACILITY_TYPES } from './facility-meta';

const E = 'fm.facilities.errors';

export const NAME_MAX = 200;
export const DESCRIPTION_MAX = 500;
export const LOCATION_MAX = 200;
export const DEFAULT_ADVANCE_DAYS = 30;
export const DEFAULT_MAX_HOURS = 4;

const INT = /^\d+$/;

function intInRange(value: string, min: number, max: number): boolean {
  if (!INT.test(value.trim())) return false;
  const n = Number(value.trim());
  return n >= min && n <= max;
}

/**
 * The facility form. Numeric fields are held as strings (what the inputs
 * produce) and converted in the transform, so a half-typed value is a field
 * error rather than a NaN on the wire.
 */
export const facilityFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: `${E}.nameRequired` })
      .max(NAME_MAX, { error: `${E}.nameTooLong` }),
    facilityType: z.enum(FACILITY_TYPES, { error: `${E}.typeRequired` }),
    description: z
      .string()
      .trim()
      .max(DESCRIPTION_MAX, { error: `${E}.descriptionTooLong` }),
    location: z
      .string()
      .trim()
      .max(LOCATION_MAX, { error: `${E}.locationTooLong` }),
    capacity: z.string().refine((v) => v.trim().length === 0 || intInRange(v, 1, 100_000), {
      error: `${E}.capacityInvalid`,
    }),
    buildingId: z.string().nullable(),
    requiresApproval: z.boolean(),
    limitAdvanceBooking: z.boolean(),
    advanceBookingDays: z.string(),
    maxDurationHours: z
      .string()
      .refine((v) => intInRange(v, 1, 24), { error: `${E}.maxHoursRange` }),
  })
  // Cross-field, so it only runs once every field above parses.
  .superRefine((v, ctx) => {
    if (v.limitAdvanceBooking && !intInRange(v.advanceBookingDays, 1, 365)) {
      ctx.addIssue({
        code: 'custom',
        path: ['advanceBookingDays'],
        message: `${E}.advanceDaysRange`,
      });
    }
  })
  .transform((v) => ({
    name: v.name,
    facilityType: v.facilityType,
    description: v.description,
    location: v.location,
    capacity: v.capacity.trim().length > 0 ? Number(v.capacity.trim()) : null,
    buildingId: v.buildingId,
    requiresApproval: v.requiresApproval,
    // Off means "no limit" — null, never 0 (the server's @Min(1) rejects 0).
    advanceBookingDays: v.limitAdvanceBooking ? Number(v.advanceBookingDays.trim()) : null,
    maxDurationHours: Number(v.maxDurationHours.trim()),
  }));

export type FacilityFormInput = z.input<typeof facilityFormSchema>;
export type FacilityFormValues = z.output<typeof facilityFormSchema>;

export function emptyFacilityForm(buildingId: string | null): FacilityFormInput {
  return {
    name: '',
    facilityType: 'GYM',
    description: '',
    location: '',
    capacity: '',
    buildingId,
    requiresApproval: true,
    limitAdvanceBooking: true,
    advanceBookingDays: String(DEFAULT_ADVANCE_DAYS),
    maxDurationHours: String(DEFAULT_MAX_HOURS),
  };
}

export function facilityToForm(f: Facility): FacilityFormInput {
  const type = (FACILITY_TYPES as readonly string[]).includes(f.facilityType)
    ? (f.facilityType as FacilityFormInput['facilityType'])
    : 'GYM';
  return {
    name: f.name,
    facilityType: type,
    description: f.description,
    location: f.location,
    capacity: f.capacity === undefined ? '' : String(f.capacity),
    buildingId: f.buildingId ?? null,
    requiresApproval: f.requiresApproval,
    limitAdvanceBooking: f.advanceBookingDays !== null,
    advanceBookingDays: String(f.advanceBookingDays ?? DEFAULT_ADVANCE_DAYS),
    maxDurationHours: String(f.maxDurationHours),
  };
}

export function toFacilityPayload(values: FacilityFormValues, projectId: string): FacilityPayload {
  return {
    name: values.name,
    facilityType: values.facilityType,
    description: values.description,
    location: values.location,
    capacity: values.capacity,
    projectId: Number(projectId),
    buildingId: values.buildingId === null ? null : Number(values.buildingId),
    requiresApproval: values.requiresApproval,
    advanceBookingDays: values.advanceBookingDays,
    maxDurationHours: values.maxDurationHours,
  };
}
