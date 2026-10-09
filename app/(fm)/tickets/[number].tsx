import { useLocalSearchParams } from 'expo-router';

import { TicketDetailScreen } from '@/features/tickets';

export default function TicketDetailRoute(): React.JSX.Element {
  const { number } = useLocalSearchParams<{ number: string }>();
  return <TicketDetailScreen ticketNumber={typeof number === 'string' ? number : ''} />;
}
