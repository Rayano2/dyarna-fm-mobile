import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell';

// Placeholder until the support feature ticket lands.
export default function SupportScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('fm.nav.support')} showBack testID="fm-support-screen" />;
}
