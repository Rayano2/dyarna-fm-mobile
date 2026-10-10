import { z } from 'zod';

/** BMS `CreatePropertyUnitRequest.floorNumber` is `@Max(10)`; the web also floors at 0. */
export const FLOOR_MIN = 0;
export const FLOOR_MAX = 10;

const E = 'fm.properties';
const INT = /^\d+$/;

export const addUnitSchema = z.object({
  unitNumber: z
    .string()
    .trim()
    .min(1, { error: `${E}.unitNumberRequired` }),
  floorNumber: z
    .string()
    .trim()
    .refine((v) => INT.test(v) && Number(v) >= FLOOR_MIN && Number(v) <= FLOOR_MAX, {
      error: `${E}.floorRange`,
    })
    .transform(Number),
});

export type AddUnitFormInput = z.input<typeof addUnitSchema>;
export type AddUnitFormValues = z.output<typeof addUnitSchema>;

export const EMPTY_ADD_UNIT: AddUnitFormInput = { unitNumber: '', floorNumber: '0' };
