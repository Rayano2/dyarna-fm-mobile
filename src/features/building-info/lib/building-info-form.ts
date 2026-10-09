import { z } from 'zod';
import type { BuildingInfoItem, BuildingInfoPayload } from '../api/building-info-api';
import { BUILDING_INFO_CATEGORIES } from './building-info-meta';

const E = 'fm.buildingInfo.errors';

export const TITLE_MAX = 200;
export const SUMMARY_MAX = 500;
export const BODY_MAX = 5000;

/** The last millisecond of the picked LOCAL day, as an ISO instant (what `expiresAt` takes). */
export function endOfLocalDayIso(date: Date): string {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString();
}

/** An expiry is valid when the end of its local day is still ahead of `now`. */
export function isFutureExpiry(date: Date, now: Date = new Date()): boolean {
  return new Date(endOfLocalDayIso(date)).getTime() > now.getTime();
}

export const buildingInfoFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: `${E}.titleRequired` })
    .max(TITLE_MAX, { error: `${E}.titleTooLong` }),
  summary: z
    .string()
    .trim()
    .max(SUMMARY_MAX, { error: `${E}.summaryTooLong` }),
  body: z
    .string()
    .trim()
    .max(BODY_MAX, { error: `${E}.bodyTooLong` }),
  categoryCode: z.enum(BUILDING_INFO_CATEGORIES, { error: `${E}.categoryRequired` }),
  buildingId: z.string().nullable(),
  /** Null = no expiry. */
  expiresOn: z
    .date()
    .nullable()
    .refine((d) => d === null || isFutureExpiry(d), { error: 'fm.buildingInfo.expiryPast' }),
});

export type BuildingInfoFormInput = z.input<typeof buildingInfoFormSchema>;
export type BuildingInfoFormValues = z.output<typeof buildingInfoFormSchema>;

export function emptyBuildingInfoForm(buildingId: string | null): BuildingInfoFormInput {
  return {
    title: '',
    summary: '',
    body: '',
    categoryCode: 'RULES',
    buildingId,
    expiresOn: null,
  };
}

export function itemToForm(item: BuildingInfoItem): BuildingInfoFormInput {
  const category = (BUILDING_INFO_CATEGORIES as readonly string[]).includes(item.categoryCode)
    ? (item.categoryCode as BuildingInfoFormInput['categoryCode'])
    : 'OTHER';
  const expires = item.expiresAt ? new Date(item.expiresAt) : null;
  return {
    title: item.title,
    summary: item.summary,
    body: item.body,
    categoryCode: category,
    buildingId: item.buildingId ?? null,
    expiresOn: expires && !Number.isNaN(expires.getTime()) ? expires : null,
  };
}

export function toBuildingInfoPayload(
  values: BuildingInfoFormValues,
  projectId: string,
): BuildingInfoPayload {
  return {
    title: values.title,
    summary: values.summary,
    body: values.body,
    categoryCode: values.categoryCode,
    projectId: Number(projectId),
    buildingId: values.buildingId === null ? null : Number(values.buildingId),
    expiresAt: values.expiresOn ? endOfLocalDayIso(values.expiresOn) : null,
  };
}
