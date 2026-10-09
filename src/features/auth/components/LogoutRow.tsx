import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
  BottomSheet,
  Button,
  Icons,
  SettingsRow,
  useRtlTextStyle,
  type BottomSheetRef,
} from '@/shared/ui';
import { LOGIN_HREF } from '../lib/boot-guard';
import { useAuthStore } from '../stores/authStore';

/**
 * Destructive "Log out" row plus its confirm sheet. Used at the bottom of the
 * More and Settings screens.
 */
export function LogoutRow(): React.JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const rtlText = useRtlTextStyle();
  const sheetRef = useRef<BottomSheetRef>(null);
  const logout = useAuthStore((s) => s.logout);
  const [pending, setPending] = useState(false);

  async function confirmLogout(): Promise<void> {
    setPending(true);
    try {
      await logout();
      sheetRef.current?.dismiss();
      router.replace(LOGIN_HREF as never);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <SettingsRow
        icon={<Icons.SignOut size={20} color={theme.colors.error} />}
        label={t('fm.session.logout')}
        destructive
        onPress={() => sheetRef.current?.present()}
      />
      <BottomSheet ref={sheetRef} snapPoints={['32%']}>
        <View style={styles.sheet}>
          <Text style={[styles.title, rtlText]}>{t('fm.session.logoutTitle')}</Text>
          <Text style={[styles.body, rtlText]}>{t('fm.session.logoutBody')}</Text>
          <View style={styles.actions}>
            <Button
              label={t('fm.session.logout')}
              variant="destructive"
              fullWidth
              loading={pending}
              disabled={pending}
              onPress={() => {
                void confirmLogout();
              }}
              testID="logout-confirm"
            />
            <Button
              label={t('fm.session.cancel')}
              variant="ghost"
              fullWidth
              disabled={pending}
              onPress={() => sheetRef.current?.dismiss()}
            />
          </View>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  sheet: {
    paddingHorizontal: theme.spacing[20],
    paddingTop: theme.spacing[8],
    gap: theme.spacing[8],
  },
  title: {
    fontSize: theme.type.heading.md.size,
    lineHeight: theme.type.heading.md.lineHeight,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  body: {
    fontSize: theme.type.body.md.size,
    lineHeight: theme.type.body.md.lineHeight,
    color: theme.colors.textSecondary,
  },
  actions: {
    marginTop: theme.spacing[16],
    gap: theme.spacing[8],
  },
}));
