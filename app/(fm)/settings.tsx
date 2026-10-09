import { useTranslation } from 'react-i18next';

import { LogoutRow } from '@/features/auth';
import { PlaceholderScreen } from '@/features/shell';

// Placeholder until the settings ticket lands; logout already works here.
export default function SettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('fm.nav.settings')}
      showBack
      footer={<LogoutRow />}
      testID="fm-settings-screen"
    />
  );
}
