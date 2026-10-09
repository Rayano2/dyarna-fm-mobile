import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell';

// Placeholder until the buildingInfo feature ticket lands.
export default function BuildingInfoScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen title={t('fm.nav.buildingInfo')} showBack testID="fm-building-info-screen" />
  );
}
