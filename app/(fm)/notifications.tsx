import { useTranslation } from 'react-i18next';

import { NotificationList } from '@/features/notifications';
import { ShellHeader } from '@/features/shell';
import { Screen } from '@/shared/ui';

// Opened from the header bell.
export default function NotificationsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    // ShellHeader owns the top inset and the absolute TabBar the bottom one.
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-notifications-screen">
      <ShellHeader title={t('fm.nav.notifications')} showBack showBell={false} />
      <NotificationList />
    </Screen>
  );
}
