import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell';

// Placeholder until the residents feature ticket lands.
export default function ResidentsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('fm.nav.residents')} showBack testID="fm-residents-screen" />;
}
