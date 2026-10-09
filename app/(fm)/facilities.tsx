import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell';

// Placeholder until the facilities feature ticket lands.
export default function FacilitiesScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen title={t('fm.nav.facilities')} showBack testID="fm-facilities-screen" />
  );
}
