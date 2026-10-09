import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell';

// Placeholder until the tickets feature ticket lands.
export default function TicketsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('fm.nav.tickets')} testID="fm-tickets-screen" />;
}
