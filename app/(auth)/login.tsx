import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '@/shared/ui';

// Placeholder only. Real FM sign-in (OTP against UMS) is ticket T5.
export default function LoginScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Screen testID="fm-login-screen">
      <EmptyState
        title={t('fm.login.title')}
        body={t('fm.login.subtitle')}
        cta={{ label: t('fm.login.continue'), onPress: () => router.replace('/') }}
      />
    </Screen>
  );
}
