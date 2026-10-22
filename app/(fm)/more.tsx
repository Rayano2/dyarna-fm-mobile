import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

import { LogoutRow } from '@/features/auth';
import { ShellHeader, useTabBarClearance } from '@/features/shell';
import { Divider, Icons, Screen, SettingsRow } from '@/shared/ui';

type RowIcon = React.ComponentType<{ size: number; color: string }>;

const ROWS: readonly { route: string; labelKey: string; Icon: RowIcon }[] = [
  { route: '/properties', labelKey: 'fm.nav.properties', Icon: Icons.Buildings },
  { route: '/residents', labelKey: 'fm.nav.residents', Icon: Icons.Users },
  { route: '/announcements', labelKey: 'fm.nav.announcements', Icon: Icons.Megaphone },
  { route: '/payment-reminders', labelKey: 'fm.nav.paymentReminders', Icon: Icons.Coins },
  { route: '/facilities', labelKey: 'fm.nav.facilities', Icon: Icons.Barbell },
  { route: '/building-info', labelKey: 'fm.nav.buildingInfo', Icon: Icons.BookOpen },
  { route: '/todos', labelKey: 'fm.nav.todos', Icon: Icons.CheckCircle },
  { route: '/settings', labelKey: 'fm.nav.settings', Icon: Icons.UserCircle },
  { route: '/support', labelKey: 'fm.nav.support', Icon: Icons.Question },
];

export default function MoreScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const tabBarClearance = useTabBarClearance();
  return (
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-more-screen">
      <ShellHeader title={t('fm.nav.more')} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
        {ROWS.map(({ route, labelKey, Icon }) => (
          // SettingsRow's chevron is CaretRight, swapped for CaretLeft in RTL.
          <SettingsRow
            key={route}
            icon={<Icon size={20} color={theme.colors.textSecondary} />}
            label={t(labelKey)}
            chevron
            onPress={() => router.push(route as never)}
          />
        ))}
        <Divider />
        <LogoutRow />
      </ScrollView>
    </Screen>
  );
}
