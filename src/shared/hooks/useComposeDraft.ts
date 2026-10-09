import { useEffect } from 'react';
import type { FieldValues, UseFormWatch } from 'react-hook-form';

/** Subscribe to RHF value changes once and forward to the draft saver.
 *  RHF returns a subscription handle from watch(callback), so this is
 *  cheaper than reading watch() in render and re-running an effect. */
export function useComposeDraft<T extends FieldValues>(
  watch: UseFormWatch<T>,
  onValuesChange: ((values: T) => void) | undefined,
): void {
  useEffect(() => {
    if (!onValuesChange) return;
    const sub = watch((values) => {
      onValuesChange(values as T);
    });
    return () => sub.unsubscribe();
  }, [watch, onValuesChange]);
}
