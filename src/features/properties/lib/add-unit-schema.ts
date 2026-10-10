import { z } from 'zod';
import { toAsciiDigits } from '@/shared/lib/to-ascii-digits';

/** BMS `CreatePropertyUnitRequest.floorNumber` is `@Max(10)`; the web also floors at 0. */
export const FLOOR_MIN = 0;
export const FLOOR_MAX = 10;

const E = 'fm.properties';
const INT = /^\d+$/;

// Arabic number pads type ٠-٩ / ۰-۹; normalise before validating so they pass
// and the API receives ASCII.

export const addUnitSchema = z.object({
  unitNumber: z
    .string()
    .overwrite((v) => toAsciiDigits(v).trim())
    .min(1, { error: `${E}.unitNumberRequired` }),
  floorNumber: z
    .string()
    .overwrite((v) => toAsciiDigits(v).trim())
    .refine((v) => INT.test(v) && Number(v) >= FLOOR_MIN && Number(v) <= FLOOR_MAX, {
      error: `${E}.floorRange`,
    })
    .transform(Number),
});

export type AddUnitFormInput = z.input<typeof addUnitSchema>;
export type AddUnitFormValues = z.output<typeof addUnitSchema>;

export const EMPTY_ADD_UNIT: AddUnitFormInput = { unitNumber: '', floorNumber: '0' };
