import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell';

// Placeholder until the announcements feature ticket lands.
export default function AnnouncementsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('fm.nav.announcements')}
      showBack
      testID="fm-announcements-screen"
    />
  );
}
