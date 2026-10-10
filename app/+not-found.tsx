import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { EmptyState, Icons, Screen } from '@/shared/ui';

/** Unmatched routes (a stale deep link, a removed screen). Standalone: no shell chrome. */
export default function NotFoundScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  return (
    <Screen testID="fm-not-found-screen">
      <View style={styles.body}>
        <EmptyState
          illustration={<Icons.Warning size={48} color={theme.colors.textMuted} />}
          title={t('fm.notFound.title')}
          body={t('fm.notFound.body')}
          cta={{ label: t('fm.notFound.cta'), onPress: () => router.replace('/') }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create(() => ({
  body: { flex: 1, justifyContent: 'center' },
}));
