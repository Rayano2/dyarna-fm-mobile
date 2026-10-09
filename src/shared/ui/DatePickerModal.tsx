import { useCallback } from 'react';
import { Modal, Platform, Pressable, Text } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { StyleSheet } from 'react-native-unistyles';
import { HapticPressable } from './HapticPressable';
import { resolvePickerMode } from './date-picker-mode';

/**
 * How the picker was left.
 *
 * Android reports a CANCEL by calling `onChange` with the value it was opened
 * with (`DateTimePickerAndroid.android.js` `DISMISS_ACTION` → `onChange(event,
 * originalValue)`), so a dismissal is indistinguishable from confirming the
 * pre-selected value unless the event type is forwarded. Callers that only
 * store the date can keep ignoring this; callers that ACT on a pick — the
 * booking form advances from its date dialog to its time dialog — must not act
 * on `'dismissed'`.
 */
export type PickerChangeType = 'set' | 'dismissed';

export interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  /** Upper bound, e.g. a facility's booking horizon. Same optional contract
   *  as `minimumDate`: omitted means unbounded. */
  maximumDate?: Date;
  /** Called with the picked date, plus how the picker was left. Never fires
   *  with undefined. The second argument is additive — a `(date) => void`
   *  handler stays valid — and it is the ONLY way to tell a confirmed pick
   *  from an Android cancel. */
  onChange: (date: Date, changeType: PickerChangeType) => void;
  onClose: () => void;
  /** Localized "Done" label (t('common.done')). */
  doneLabel: string;
  /** 'centered' floats a card mid-screen; 'sheet' pins it to the bottom edge. */
  variant?: 'centered' | 'sheet';
}

export function DatePickerModal({
  visible,
  value,
  mode = 'datetime',
  minimumDate,
  maximumDate,
  onChange,
  onClose,
  doneLabel,
  variant = 'centered',
}: DatePickerModalProps) {
  // Memoized: this identity sits in the Android picker's effect dep array, so a
  // fresh arrow each render re-fires DateTimePickerAndroid.open() on a dialog
  // that is already showing.
  const handleChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      // Anything that is not an explicit 'set' (Android's cancel, its neutral
      // button) is reported as a dismissal so callers can no-op on it. The
      // date is still forwarded unchanged, so existing one-argument handlers
      // behave exactly as before.
      if (date) onChange(date, event.type === 'set' ? 'set' : 'dismissed');
      // Android's picker is a one-shot dialog — close on any pick
      // or dismissal. iOS keeps the inline picker open until Done.
      if (Platform.OS !== 'ios') onClose();
    },
    [onChange, onClose],
  );

  if (!visible) return null;
  const isSheet = variant === 'sheet';
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={isSheet ? styles.backdropSheet : styles.backdropCentered} onPress={onClose}>
        {/* Inner pressable swallows taps so the user can interact with the
            picker without dismissing the modal. */}
        <Pressable
          style={isSheet ? styles.cardSheet : styles.cardCentered}
          onPress={(e) => e.stopPropagation?.()}
        >
          <DateTimePicker
            value={value}
            // 'datetime' is iOS-only — on Android it must narrow to 'date' or
            // the picker's unmount cleanup throws. See ./date-picker-mode.
            mode={resolvePickerMode(mode, Platform.OS)}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            {...(minimumDate ? { minimumDate } : {})}
            {...(maximumDate ? { maximumDate } : {})}
            onChange={handleChange}
          />
          <HapticPressable
            onPress={onClose}
            style={isSheet ? styles.doneRowSheet : styles.doneRowCentered}
            accessibilityRole="button"
          >
            <Text style={isSheet ? styles.doneTextSheet : styles.doneTextCentered}>
              {doneLabel}
            </Text>
          </HapticPressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  backdropCentered: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[24],
  },
  cardCentered: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[16],
    minWidth: 320,
  },
  doneRowCentered: {
    paddingVertical: theme.spacing[12],
    alignItems: 'center',
  },
  doneTextCentered: {
    fontSize: theme.type.body.md.size,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  backdropSheet: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  cardSheet: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing[16],
  },
  doneRowSheet: {
    alignSelf: 'flex-end',
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
  },
  doneTextSheet: {
    fontSize: theme.type.body.md.size,
    fontWeight: '600',
    color: theme.colors.primary,
  },
}));
