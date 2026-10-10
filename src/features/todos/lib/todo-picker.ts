import type { PickerPlatform } from '@/shared/ui/date-picker-mode';

/**
 * The due-date picker's steps, mirroring dyarna-rn `booking-picker.ts`.
 *
 * iOS has a genuine combined `'datetime'` picker, and its inline picker only
 * fires 'set' when the value CHANGES — so a date-then-time chain there could
 * never pick the seeded day or change only the time. Android has no combined
 * mode, so it runs the day dialog, then the time dialog.
 */
export type TodoPickerStep = 'datetime' | 'date' | 'time';

export function firstPickerStep(platform: PickerPlatform): TodoPickerStep {
  return platform === 'ios' ? 'datetime' : 'date';
}

/** The dialog after `step`, or undefined when the pick is complete. */
export function nextPickerStep(step: TodoPickerStep): TodoPickerStep | undefined {
  return step === 'date' ? 'time' : undefined;
}

/**
 * The value after a confirmed pick. Each Android dialog is authoritative for
 * one half only (the day dialog returns the old time, the time dialog the
 * seeded day); `'datetime'` carries both. Seconds are always dropped.
 */
export function applyPick(step: TodoPickerStep, current: Date, picked: Date): Date {
  const next = new Date(step === 'time' ? current : picked);
  const time = step === 'date' ? current : picked;
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return next;
}
