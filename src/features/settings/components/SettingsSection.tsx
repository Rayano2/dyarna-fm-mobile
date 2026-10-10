import { Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Card, useRtlTextStyle } from '@/shared/ui';

export interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  testID?: string;
}

/** One titled Card on the Settings screen. */
export function SettingsSection({ title, children, testID }: SettingsSectionProps) {
  const rtlText = useRtlTextStyle();
  return (
    <Card style={styles.card} {...(testID ? { testID } : {})}>
      <Text style={[styles.title, rtlText]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: { gap: theme.spacing[12] },
  title: {
    fontSize: theme.type.label.lg.size,
    lineHeight: theme.type.label.lg.lineHeight,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
}));
