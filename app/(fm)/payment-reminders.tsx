import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell';

// Placeholder until the paymentReminders feature ticket lands.
export default function PaymentRemindersScreen(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('fm.nav.paymentReminders')}
      showBack
      testID="fm-payment-reminders-screen"
    />
  );
}
