import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell';

// Opened from the header bell. Placeholder until the notifications ticket lands.
export default function NotificationsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('fm.nav.notifications')}
      showBack
      showBell={false}
      testID="fm-notifications-screen"
    />
  );
}
