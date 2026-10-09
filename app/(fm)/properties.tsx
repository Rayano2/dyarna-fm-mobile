import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell';

// Placeholder until the properties feature ticket lands.
export default function PropertiesScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen title={t('fm.nav.properties')} showBack testID="fm-properties-screen" />
  );
}
