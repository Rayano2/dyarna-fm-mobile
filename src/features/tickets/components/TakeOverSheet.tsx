import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { BottomSheet, Button, useRtlTextStyle, type BottomSheetRef } from '@/shared/ui';

export interface TakeOverSheetProps {
  /** The current assignee's display name, or null when only an id is known. */
  assigneeName: string | null;
  submitting: boolean;
  onConfirm: () => void;
}

/**
 * Confirms "Assign to me" on an OPEN ticket someone else holds (W6). Styled
 * like the DeleteTodoSheet / LogoutRow confirm sheets. Unassigned tickets
 * skip it and keep one-tap assign.
 */
export const TakeOverSheet = forwardRef<BottomSheetRef, TakeOverSheetProps>(function TakeOverSheet(
  { assigneeName, submitting, onConfirm },
  ref,
) {
  const { t } = useTranslation();
  const rtlText = useRtlTextStyle();

  const dismiss = (): void => {
    if (ref && typeof ref === 'object') ref.current?.dismiss();
  };

  return (
    <BottomSheet ref={ref} snapPoints={['30%']}>
      <View style={styles.sheet}>
        <Text style={[styles.title, rtlText]} accessibilityRole="header">
          {t('fm.tickets.takeOver.title')}
        </Text>
        <Text style={[styles.body, rtlText]}>
          {assigneeName
            ? t('fm.tickets.takeOver.body', { name: assigneeName })
            : t('fm.tickets.takeOver.bodyUnknown')}
        </Text>
        <View style={styles.actions}>
          <Button
            label={t('fm.tickets.assignToMe')}
            fullWidth
            loading={submitting}
            disabled={submitting}
            onPress={onConfirm}
            testID="fm-ticket-takeover-confirm"
          />
          <Button
            label={t('common.cancel')}
            variant="ghost"
            fullWidth
            disabled={submitting}
            onPress={dismiss}
            testID="fm-ticket-takeover-cancel"
          />
        </View>
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create((theme) => ({
  sheet: {
    paddingHorizontal: theme.spacing[20],
    paddingTop: theme.spacing[8],
    gap: theme.spacing[8],
  },
  title: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  body: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textSecondary,
  },
  actions: {
    marginTop: theme.spacing[16],
    gap: theme.spacing[8],
  },
}));
