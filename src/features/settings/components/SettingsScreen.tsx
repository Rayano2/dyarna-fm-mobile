import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { LogoutRow, useAuthStore } from '@/features/auth';
import { ShellHeader } from '@/features/shell';
import { useLocaleStore } from '@/shared/stores/localeStore';
import { useThemeStore } from '@/shared/stores/themeStore';
import type { SupportedLocale } from '@/shared/i18n';
import { Avatar, Screen, SegmentedPill, SwitchRow, useRtlTextStyle } from '@/shared/ui';
import { BuildingQrSection } from './BuildingQrSection';
import { CompanyLogoSection } from './CompanyLogoSection';
import { SettingsSection } from './SettingsSection';

export function SettingsScreen() {
  const { t } = useTranslation();
  return (
    // ShellHeader owns the top inset and the absolute TabBar the bottom one.
    <Screen edges={[]} keyboardAvoiding={false} testID="fm-settings-screen">
      <ShellHeader title={t('fm.settings.title')} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <ProfileSection />
        <BuildingQrSection />
        <CompanyLogoSection />
        <AppearanceSection />
        <LogoutRow />
      </ScrollView>
    </Screen>
  );
}

function ProfileSection() {
  const { t } = useTranslation();
  const rtlText = useRtlTextStyle();
  const user = useAuthStore((s) => s.user);
  const name = user?.name ?? '';
  const email = user?.email ?? '';
  return (
    <SettingsSection title={t('fm.settings.profileTitle')} testID="settings-profile">
      <View style={styles.profile}>
        <Avatar name={name || email} size={56} />
        <View style={styles.profileText}>
          {name ? (
            <Text style={[styles.name, rtlText]} numberOfLines={1}>
              {name}
            </Text>
          ) : null}
          {email ? (
            <Text style={[styles.email, rtlText, styles.ltr]} numberOfLines={1} selectable>
              {email}
            </Text>
          ) : null}
        </View>
      </View>
    </SettingsSection>
  );
}

function AppearanceSection() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const setMode = useThemeStore((s) => s.setMode);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  return (
    <SettingsSection title={t('fm.settings.appearanceTitle')} testID="settings-appearance">
      <SwitchRow
        label={t('fm.settings.darkMode')}
        // Reflects what is on screen, so a 'system' preference shows truthfully.
        value={theme.name === 'dark'}
        onValueChange={(next) => {
          void setMode(next ? 'dark' : 'light');
        }}
      />
      <View style={styles.languageRow}>
        <Text style={styles.languageLabel}>{t('fm.settings.language')}</Text>
        <SegmentedPill<SupportedLocale>
          options={[
            { value: 'en', label: t('language.en') },
            { value: 'ar', label: t('language.ar') },
          ]}
          value={locale}
          onChange={(next) => {
            if (next !== locale) void setLocale(next);
          }}
          testID="settings-language"
        />
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create((theme) => ({
  // paddingBottom clears the absolutely positioned tab bar.
  content: {
    padding: theme.spacing[16],
    paddingBottom: theme.spacing[96],
    gap: theme.spacing[16],
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[12] },
  profileText: { flex: 1, gap: theme.spacing[2] },
  name: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  email: {
    fontSize: theme.type.body.sm.size,
    lineHeight: theme.type.body.sm.lineHeight,
    color: theme.colors.textSecondary,
  },
  ltr: { writingDirection: 'ltr' },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[12],
    minHeight: 44,
  },
  languageLabel: {
    flex: 1,
    fontSize: theme.type.body.md.size,
    color: theme.colors.textPrimary,
  },
}));
