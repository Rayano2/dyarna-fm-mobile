import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { guardRedirect, useAuthStore } from '@/features/auth';
import { TabBar, TabBarHideProvider } from '@/features/shell';
import { Icons } from '@/shared/ui';

interface TabIconProps {
  focused: boolean;
  color: string;
  size: number;
}

type PhosphorIcon = React.ComponentType<{
  size: number;
  color: string;
  weight: 'fill' | 'regular';
}>;

// Built once at module scope so the tab icons are stable components.
function makeTabIcon(Icon: PhosphorIcon): (props: TabIconProps) => React.JSX.Element {
  return function TabIcon({ focused, color, size }: TabIconProps): React.JSX.Element {
    return <Icon size={size} color={color} weight={focused ? 'fill' : 'regular'} />;
  };
}

const DashboardIcon = makeTabIcon(Icons.House);
const TicketsIcon = makeTabIcon(Icons.Wrench);
const RequestsIcon = makeTabIcon(Icons.FileText);
const BookingsIcon = makeTabIcon(Icons.CalendarBlank);
const MoreIcon = makeTabIcon(Icons.SquaresFour);

// Screens reached from the More list or the header bell. `href: null` keeps
// them out of the tab bar while the bar stays visible on them.
const HIDDEN_ROUTES = [
  'properties',
  'residents',
  'announcements',
  'payment-reminders',
  'facilities',
  'building-info',
  'todos',
  'settings',
  'support',
  'notifications',
  // Ticket detail: pushed from the Tickets tab, hides the tab bar itself.
  'tickets/[number]',
] as const;

export default function FmLayout(): React.JSX.Element {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const redirect = guardRedirect(status, 'fm');
  if (redirect) return <Redirect href={redirect as never} />;

  // Tabs are in logical order. React Native mirrors the row under RTL, so the
  // array is never reversed.
  return (
    <TabBarHideProvider>
      <Tabs
        backBehavior="history"
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TabBar {...props} overflowTab="more" />}
      >
        <Tabs.Screen
          name="index"
          options={{ title: t('fm.nav.dashboard'), tabBarIcon: DashboardIcon }}
        />
        <Tabs.Screen
          name="tickets"
          options={{ title: t('fm.nav.tickets'), tabBarIcon: TicketsIcon }}
        />
        <Tabs.Screen
          name="requests"
          options={{ title: t('fm.nav.requestsTab'), tabBarIcon: RequestsIcon }}
        />
        <Tabs.Screen
          name="bookings"
          options={{ title: t('fm.nav.bookingsTab'), tabBarIcon: BookingsIcon }}
        />
        <Tabs.Screen name="more" options={{ title: t('fm.nav.more'), tabBarIcon: MoreIcon }} />
        {HIDDEN_ROUTES.map((name) => (
          <Tabs.Screen key={name} name={name} options={{ href: null }} />
        ))}
      </Tabs>
    </TabBarHideProvider>
  );
}
