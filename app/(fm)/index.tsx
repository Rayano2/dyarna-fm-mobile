import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell';

// Placeholder until the dashboard feature ticket lands.
export default function DashboardScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('fm.nav.dashboard')} testID="fm-index-screen" />;
}
