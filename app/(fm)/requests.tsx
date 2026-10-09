import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell';

// Placeholder until the requests feature ticket lands.
export default function RequestsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('fm.nav.requests')} testID="fm-requests-screen" />;
}
