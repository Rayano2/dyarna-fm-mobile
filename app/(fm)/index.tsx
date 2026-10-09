import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '@/shared/ui';

// "FM home" placeholder. Feature screens arrive in later tickets.
export default function FmHomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Screen testID="fm-home-screen">
      <EmptyState
        title={t('fm.home.title')}
        body={t('fm.home.subtitle')}
        cta={{ label: t('fm.home.signIn'), onPress: () => router.push('/login') }}
      />
    </Screen>
  );
}
