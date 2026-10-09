import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useRtlTextStyle } from '@/shared/ui';

export interface FieldLabelProps {
  label: string;
  /** "n/max" counter shown at the end of the label row. Always LTR. */
  count?: number;
  max?: number;
  nativeID?: string;
}

/** Label row for a `FormTextArea` (which has no label of its own), with an optional LTR counter. */
export function FieldLabel({ label, count, max, nativeID }: FieldLabelProps) {
  const rtlText = useRtlTextStyle();
  const over = count !== undefined && max !== undefined && count > max;
  return (
    <View style={styles.row}>
      <Text style={[styles.label, rtlText]} {...(nativeID ? { nativeID } : {})}>
        {label}
      </Text>
      {count !== undefined && max !== undefined ? (
        <Text style={[styles.counter, over && styles.counterOver]} accessibilityLiveRegion="polite">
          {`${count}/${max}`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[8] },
  label: {
    flex: 1,
    fontSize: theme.type.label.md.size,
    lineHeight: theme.type.label.md.lineHeight,
    fontWeight: theme.type.label.md.weight,
    color: theme.colors.textSecondary,
  },
  // Numbers read left-to-right in both locales.
  counter: {
    writingDirection: 'ltr',
    fontSize: theme.type.label.md.size,
    color: theme.colors.textMuted,
  },
  counterOver: { color: theme.colors.error },
}));
