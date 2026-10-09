import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button } from './Button';

export interface EmptyStateProps {
  illustration?: React.ReactNode;
  title: string;
  body?: string;
  cta?: { label: string; onPress: () => void };
}

export function EmptyState({ illustration, title, body, cta }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {illustration ? <View style={styles.illustration}>{illustration}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {cta ? (
        <View style={styles.cta}>
          <Button
            label={cta.label}
            onPress={cta.onPress}
            variant="primary"
            size="md"
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[48],
    paddingHorizontal: theme.spacing[24],
    gap: theme.spacing[12],
  },
  illustration: { marginBottom: theme.spacing[16] },
  title: {
    fontSize: theme.type.heading.lg.size,
    lineHeight: theme.type.heading.lg.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'InterTight-SemiBold',
  },
  body: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  cta: { marginTop: theme.spacing[16] },
}));
