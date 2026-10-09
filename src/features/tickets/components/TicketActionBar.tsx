import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Icons } from '@/shared/ui';
import type { ResolutionStatus } from '../api/update-status';
import type { TicketActionKind } from '../lib/ticket-status';

export interface TicketActionBarProps {
  action: TicketActionKind;
  assigning: boolean;
  starting: boolean;
  onAssign: () => void;
  onStart: () => void;
  onResolve: (resolution: ResolutionStatus) => void;
}

/** Sticky bottom bar. Which buttons show is decided by `getTicketAction` (lib/ticket-status). */
export function TicketActionBar({
  action,
  assigning,
  starting,
  onAssign,
  onStart,
  onResolve,
}: TicketActionBarProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const [choosing, setChoosing] = useState(false);
  // Leaving the screen closes the Resolved / Not actionable choice.
  useFocusEffect(useCallback(() => () => setChoosing(false), []));

  if (action === 'none') return null;

  let content: React.ReactNode;
  switch (action) {
    case 'assign': {
      content = (
        <Button
          label={t('fm.tickets.assignToMe')}
          fullWidth
          loading={assigning}
          disabled={assigning}
          onPress={onAssign}
          testID="fm-ticket-assign"
        />
      );
      break;
    }
    case 'start': {
      content = (
        <Button
          label={t('fm.tickets.startProgress')}
          fullWidth
          loading={starting}
          disabled={starting}
          onPress={onStart}
          testID="fm-ticket-start"
        />
      );
      break;
    }
    case 'takeAction': {
      content = choosing ? (
        <View style={styles.choice}>
          <View style={styles.row}>
            <View style={styles.half}>
              <Button
                label={t('fm.tickets.markNotActionable')}
                variant="secondary"
                fullWidth
                onPress={() => onResolve('NOT_ACTIONABLE')}
                testID="fm-ticket-not-actionable"
              />
            </View>
            <View style={styles.half}>
              <Button
                label={t('fm.tickets.markResolved')}
                fullWidth
                onPress={() => onResolve('RESOLVED')}
                testID="fm-ticket-resolve"
              />
            </View>
          </View>
          <Button
            label={t('common.cancel')}
            variant="ghost"
            fullWidth
            onPress={() => setChoosing(false)}
            testID="fm-ticket-action-cancel"
          />
        </View>
      ) : (
        <Button
          label={t('fm.tickets.takeAction')}
          fullWidth
          onPress={() => setChoosing(true)}
          testID="fm-ticket-take-action"
        />
      );
      break;
    }
    default: {
      content = (
        <View style={styles.terminal} accessible accessibilityRole="text">
          <Icons.Lock size={16} color={theme.colors.textMuted} weight="regular" />
          <Text style={styles.terminalText}>{t('fm.tickets.terminalMessage')}</Text>
        </View>
      );
    }
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>{content}</View>
  );
}

const styles = StyleSheet.create((theme) => ({
  bar: {
    paddingHorizontal: theme.spacing[16],
    paddingTop: theme.spacing[12],
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderHairline,
  },
  choice: { gap: theme.spacing[8] },
  row: { flexDirection: 'row', gap: theme.spacing[12] },
  half: { flex: 1 },
  terminal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[8],
    minHeight: 44,
  },
  terminalText: {
    fontSize: theme.type.body.sm.size,
    color: theme.colors.textMuted,
    flexShrink: 1,
  },
}));
